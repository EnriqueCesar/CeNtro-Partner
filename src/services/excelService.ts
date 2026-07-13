import * as XLSX from 'xlsx'
import { SHEETS, indicatorPillar, normalize } from '../config/indicators'
import type { AuditItem, DirectoryRow, IndicatorValue, Period, StoreResult, WorkbookResult } from '../types'

const findSheet = (wb: XLSX.WorkBook, expected: string) => wb.SheetNames.find(n => normalize(n) === normalize(expected))
const rows = (ws: XLSX.WorkSheet) => XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true })
const key = (obj: Record<string, unknown>, expected: string) => Object.keys(obj).find(k => normalize(k) === normalize(expected))
const cleanCeCo = (value: unknown) => String(value ?? '').replace(/\D/g,'').padStart(5,'0').slice(-5)
const numeric = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = String(value).replace(/\u00a0/g,' ').replace(/[$%]/g,'').replace(/,/g,'.').trim()
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}
const ratio = (value: unknown): number | null => {
  const n = numeric(value)
  if (n === null) return null
  return Math.abs(n) > 1.5 ? n / 100 : n
}

function score(indicator: string, value: unknown): number | null {
  const n = numeric(value)
  if (n === null) return null
  const p = ratio(value)
  switch (normalize(indicator)) {
    case 'rotacion': return p !== null && p <= 0.36 ? 1 : 0
    case 'bajas<90': return n <= 0 ? 1 : 0
    case 'estabilidad 12m':
    case 'estabilidad 24m':
    case 'bb': case 'bt': case 'ss': return p !== null && p >= 1 ? 1 : 0
    case 'nps': return n >= 70 ? 1 : 0
    case 'desempeno': return p !== null && p >= 0.60 ? 1 : 0
    case 'conexion':
    case 'bebida': return p !== null && p >= 0.70 ? 1 : 0
    case 'sr%': return p !== null && p > 0 ? 1 : 0
    case 'adt aa': return n > 1 ? 1 : 0
    case 'vmt aa%':
    case 'v ppto':
    case 'v at aa%': return p !== null && p > 0 ? 1 : 0
    case 'vcogs': return p !== null && p >= -0.009 && p <= 0.009 ? 1 : 0
    case 'segundascx': return n > 7 ? 1 : 0
    default: return null
  }
}

function findPeriodKey(record: Record<string, unknown>, period: Period): string | undefined {
  const direct = key(record, period)
  if (direct) return direct
  if (period === 'YTD') {
    for (const fallback of ['jun','may','abr','mar','feb','ene']) {
      const found = key(record, fallback)
      if (found) return found
    }
  }
  return undefined
}

export async function parseWorkbook(buffer: ArrayBuffer, fileName: string, period: Period='YTD'): Promise<WorkbookResult> {
  const audit: AuditItem[] = []
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })

  const dirName = findSheet(wb, SHEETS.directory)
  const instructionsName = findSheet(wb, SHEETS.instructions)
  if (!dirName) throw new Error('No existe la pestaña Directorio.')
  if (!instructionsName) audit.push({ level:'warning', message:'No se encontró la pestaña Instrucciones.' })
  else audit.push({ level:'ok', message:'Pestaña Instrucciones localizada correctamente.' })

  const directoryRows = rows(wb.Sheets[dirName])
  if (!directoryRows.length) throw new Error('La pestaña Directorio no contiene datos.')
  const cecoKey = key(directoryRows[0], 'CeCo')
  const storeKey = key(directoryRows[0], 'Tienda')
  const dmKey = key(directoryRows[0], 'DM')
  if (!cecoKey || !storeKey || !dmKey) throw new Error('Directorio requiere encabezados CeCo, Tienda y DM.')

  const seen = new Set<string>()
  const directory: DirectoryRow[] = []
  for (const row of directoryRows) {
    const CeCo = cleanCeCo(row[cecoKey])
    if (!/^\d{5}$/.test(CeCo) || seen.has(CeCo)) continue
    seen.add(CeCo)
    directory.push({ CeCo, Tienda:String(row[storeKey] ?? '').trim(), DM:String(row[dmKey] ?? '').trim() })
  }
  audit.push({ level:'ok', message:`Directorio validado: ${directory.length} tiendas únicas por CeCo.` })

  const maps = new Map<string, Map<string, unknown>>()
  for (const indicator of SHEETS.indicators) {
    const sheetName = findSheet(wb, indicator)
    if (!sheetName) { audit.push({level:'error', message:`Falta pestaña: ${indicator.trim()}`}); continue }
    const data = rows(wb.Sheets[sheetName])
    if (!data.length) { audit.push({level:'warning', message:`Pestaña vacía: ${indicator.trim()}`}); continue }
    const ck = key(data[0], 'CeCo')
    const pk = findPeriodKey(data[0], period)
    if (!ck || !pk) { audit.push({level:'error', message:`${indicator.trim()}: falta CeCo o periodo ${period}`}); continue }
    if (period === 'YTD' && normalize(pk) !== 'ytd') {
      audit.push({level:'warning', message:`${indicator.trim()}: sin YTD; se usa ${pk} como último periodo disponible.`})
    }
    const values = new Map<string, unknown>()
    for (const row of data) {
      const ceco = cleanCeCo(row[ck])
      if (/^\d{5}$/.test(ceco)) values.set(ceco, row[pk])
    }
    maps.set(indicator, values)
    audit.push({level:'ok', message:`${indicator.trim()}: ${values.size} CeCo procesados.`})
  }

  let stores: StoreResult[] = directory.map(d => {
    const indicators: IndicatorValue[] = SHEETS.indicators.map(indicator => {
      const value = maps.get(indicator)?.get(d.CeCo) ?? null
      const s = score(indicator, value)
      return { indicator: indicator.trim(), pillar: indicatorPillar(indicator), value, score:s, status:s===null?'na':s===1?'cumple':'no-cumple' }
    })
    const applicable = indicators.filter(i => i.score !== null)
    const compliance = applicable.length ? applicable.reduce((sum, item) => sum + (item.score ?? 0), 0) / applicable.length : 0
    return { ...d, indicators, compliance, applicable: applicable.length, rank:0 }
  })

  stores = stores.sort((a,b) => b.compliance-a.compliance || a.Tienda.localeCompare(b.Tienda, 'es'))
    .map((store,index) => ({...store, rank:index+1}))
  audit.push({level:'ok', message:`Ranking generado para ${stores.length} tiendas y 18 indicadores.`})

  return { stores, audit, periods:['ene','feb','mar','abr','may','jun','YTD'], fileName }
}

export async function loadDefault(period: Period='YTD') {
  const url = `${import.meta.env.BASE_URL}data/Base_CeNtro Partner.xlsx`
  const response = await fetch(url, { cache:'no-store' })
  if (!response.ok) throw new Error(`No fue posible cargar el Excel predeterminado (${response.status}).`)
  return parseWorkbook(await response.arrayBuffer(), 'Base_CeNtro Partner.xlsx', period)
}
