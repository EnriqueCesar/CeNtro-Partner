import * as XLSX from 'xlsx'
import { INDICATORS, PERIODS, REQUIRED_SHEETS, normalize, type IndicatorConfig } from '../config/indicators'
import type { AuditItem, DirectoryRow, IndicatorValue, Period, SheetAudit, StoreResult, WorkbookResult } from '../types'

type Row = Record<string, unknown>
const findSheet = (wb: XLSX.WorkBook, expected: string) => wb.SheetNames.find(n => normalize(n) === normalize(expected))
const toRows = (ws: XLSX.WorkSheet) => XLSX.utils.sheet_to_json<Row>(ws, { defval: null, raw: true, blankrows: false })
const findKey = (obj: Row, expected: string) => Object.keys(obj).find(k => normalize(k) === normalize(expected))
const cleanCeCo = (value: unknown) => {
  const digits = String(value ?? '').trim().replace(/\.0+$/,'').replace(/\D/g,'')
  return digits ? digits.padStart(5,'0') : ''
}
const numeric = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value).trim()
  if (!text || /^n\/?a$/i.test(text)) return null
  const normalized = text.replace(/\u00a0/g,'').replace(/[$%]/g,'').replace(/,/g,'.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}
const ratio = (value: unknown) => {
  const n = numeric(value)
  if (n === null) return null
  return Math.abs(n) > 1.5 ? n / 100 : n
}

function evaluate(config: IndicatorConfig, value: unknown): number | null {
  const n = numeric(value)
  const p = ratio(value)
  if (n === null) return null
  switch(config.evaluator) {
    case 'lte36pct': return p !== null && p <= 0.36 ? 1 : 0
    case 'lte0': return n <= 0 ? 1 : 0
    case 'equals1': return n === 1 ? 1 : 0
    case 'gt70': return n > 70 ? 1 : 0
    case 'gt60pct': return p !== null && p > 0.60 ? 1 : 0
    case 'gt70pct': return p !== null && p > 0.70 ? 1 : 0
    case 'gt0': return n > 0 ? 1 : 0
    case 'gt1': return n > 1 ? 1 : 0
    case 'between09pct': return p !== null && p >= -0.009 && p <= 0.009 ? 1 : 0
    case 'gt7': return n > 7 ? 1 : 0
  }
}

const findPeriodKey = (record: Row, period: Period) => {
  const direct = findKey(record, period)
  if (direct) return direct
  if (period === 'YTD') {
    for (const fallback of ['jun','may','abr','mar','feb','ene']) {
      const found = findKey(record, fallback)
      if (found) return found
    }
  }
  return undefined
}

function summarize(store: DirectoryRow, indicators: IndicatorValue[]): StoreResult {
  const fulfilled = indicators.filter(i=>i.score===1).length
  const failed = indicators.filter(i=>i.score===0).length
  const na = indicators.filter(i=>i.score===null).length
  const applicable = fulfilled + failed
  return { ...store, indicators, fulfilled, failed, na, applicable, compliance: applicable ? fulfilled/applicable : 0, rank:0 }
}

export async function parseWorkbook(buffer: ArrayBuffer, fileName: string, period: Period='YTD'): Promise<WorkbookResult> {
  const audit: AuditItem[] = []
  const sheetAudits: SheetAudit[] = []
  let wb: XLSX.WorkBook
  try { wb = XLSX.read(buffer, { type:'array', cellDates:true }) }
  catch { throw new Error('El archivo no pudo abrirse como libro de Excel válido.') }

  const missingSheets = REQUIRED_SHEETS.filter(s=>!findSheet(wb,s))
  const foundSheets = REQUIRED_SHEETS.filter(s=>Boolean(findSheet(wb,s)))
  if (missingSheets.length) audit.push({level:'error',category:'Estructura',message:`Pestañas faltantes: ${missingSheets.join(', ')}`})
  else audit.push({level:'ok',category:'Estructura',message:'Se localizaron Directorio, Instrucciones y los 18 indicadores.'})

  const dirName = findSheet(wb,'Directorio')
  if (!dirName) throw new Error('Falta la pestaña obligatoria Directorio.')
  const directoryRows = toRows(wb.Sheets[dirName])
  if (!directoryRows.length) throw new Error('La pestaña Directorio no contiene registros.')
  const cecoKey = findKey(directoryRows[0],'CeCo')
  const storeKey = findKey(directoryRows[0],'Tienda')
  const dmKey = findKey(directoryRows[0],'DM')
  const missingDirHeaders = [['CeCo',cecoKey],['Tienda',storeKey],['DM',dmKey]].filter(([,k])=>!k).map(([h])=>h as string)
  if (missingDirHeaders.length) throw new Error(`Directorio requiere encabezados: ${missingDirHeaders.join(', ')}.`)

  const seen = new Set<string>()
  const duplicateDirectoryCeCos: string[] = []
  const directory: DirectoryRow[] = []
  for (const row of directoryRows) {
    const CeCo = cleanCeCo(row[cecoKey!])
    if (!/^\d{5}$/.test(CeCo)) continue
    if (seen.has(CeCo)) { duplicateDirectoryCeCos.push(CeCo); continue }
    seen.add(CeCo)
    directory.push({CeCo,Tienda:String(row[storeKey!]??'').trim(),DM:String(row[dmKey!]??'').trim()})
  }
  sheetAudits.push({sheet:dirName,found:true,rows:directoryRows.length,headers:Object.keys(directoryRows[0]),missingHeaders:missingDirHeaders,validCeCos:directory.length,duplicateCeCos:duplicateDirectoryCeCos})
  audit.push({level:'ok',category:'Directorio',message:`${directory.length} CeCo válidos y únicos procesados.`})
  if (duplicateDirectoryCeCos.length) audit.push({level:'warning',category:'Directorio',message:`CeCo duplicados omitidos: ${Array.from(new Set(duplicateDirectoryCeCos)).join(', ')}`})

  const instructionName = findSheet(wb,'Instrucciones')
  const ruleBySheet = new Map<string,string>()
  if (instructionName) {
    const instructionRows = toRows(wb.Sheets[instructionName])
    const tabKey = instructionRows[0] && findKey(instructionRows[0],'Pestaña')
    const ruleKey = instructionRows[0] && findKey(instructionRows[0],'Ponderacion')
    if (tabKey && ruleKey) instructionRows.forEach(r=>ruleBySheet.set(normalize(r[tabKey]),String(r[ruleKey]??'')))
    sheetAudits.push({sheet:instructionName,found:true,rows:instructionRows.length,headers:instructionRows[0]?Object.keys(instructionRows[0]):[],missingHeaders:[!tabKey?'Pestaña':'',!ruleKey?'Ponderacion':''].filter(Boolean),validCeCos:0,duplicateCeCos:[]})
    audit.push({level:tabKey&&ruleKey?'ok':'warning',category:'Instrucciones',message:tabKey&&ruleKey?`${instructionRows.length} reglas de negocio localizadas.`:'La pestaña Instrucciones no contiene todos los encabezados esperados.'})
  }

  const valueMaps = new Map<string,Map<string,unknown>>()
  for (const config of INDICATORS) {
    const actual = findSheet(wb,config.sheet)
    if (!actual) {
      sheetAudits.push({sheet:config.sheet,found:false,rows:0,headers:[],missingHeaders:['CeCo',period],validCeCos:0,duplicateCeCos:[]})
      continue
    }
    const data = toRows(wb.Sheets[actual])
    if (!data.length) {
      sheetAudits.push({sheet:actual,found:true,rows:0,headers:[],missingHeaders:['CeCo',period],validCeCos:0,duplicateCeCos:[]})
      audit.push({level:'warning',category:'Indicador',message:`${actual}: pestaña vacía.`})
      continue
    }
    const ck = findKey(data[0],'CeCo')
    const pk = findPeriodKey(data[0],period)
    const missingHeaders = [!ck?'CeCo':'',!pk?period:''].filter(Boolean)
    const duplicates: string[] = []
    const values = new Map<string,unknown>()
    if (ck && pk) {
      for (const row of data) {
        const ceco = cleanCeCo(row[ck])
        if (!/^\d{5}$/.test(ceco)) continue
        if (values.has(ceco)) duplicates.push(ceco)
        values.set(ceco,row[pk])
      }
      valueMaps.set(config.sheet,values)
      if (period==='YTD' && normalize(pk)!=='ytd') audit.push({level:'warning',category:'Periodo',message:`${actual}: no tiene YTD; se utilizó ${pk}.`})
    }
    sheetAudits.push({sheet:actual,found:true,rows:data.length,headers:Object.keys(data[0]),missingHeaders,validCeCos:values.size,duplicateCeCos:duplicates})
    if (missingHeaders.length) audit.push({level:'error',category:'Encabezados',message:`${actual}: faltan ${missingHeaders.join(', ')}.`})
    else audit.push({level:'ok',category:'Indicador',message:`${actual}: ${values.size} CeCo procesados para ${period}.`})
    if (!ruleBySheet.has(normalize(config.sheet))) audit.push({level:'warning',category:'Reglas',message:`${actual}: no se encontró su regla en Instrucciones; se usa la configuración validada V2.`})
  }

  let stores = directory.map(store => summarize(store, INDICATORS.map(config=>{
    const value = valueMaps.get(config.sheet)?.get(store.CeCo) ?? null
    const score = evaluate(config,value)
    return {sheet:config.sheet,indicator:config.indicator,pillar:config.pillar,rule:ruleBySheet.get(normalize(config.sheet))??'',value,score,status:score===null?'na':score===1?'cumple':'no-cumple'}
  })))
  stores = stores.sort((a,b)=>b.compliance-a.compliance || b.fulfilled-a.fulfilled || a.CeCo.localeCompare(b.CeCo)).map((s,i)=>({...s,rank:i+1}))
  audit.push({level:'ok',category:'Ranking',message:`Ranking generado con ${stores.length} tiendas y ${INDICATORS.length} indicadores.`})

  return {
    stores,audit,sheets:sheetAudits,periods:[...PERIODS],fileName,
    processedAt:new Date().toISOString(),foundSheets,missingSheets,
    indicatorCount:INDICATORS.length,validCeCos:directory.length,duplicateDirectoryCeCos
  }
}

export async function loadDefault(period: Period='YTD') {
  const url = new URL('data/Base_CeNtro Partner.xlsx', window.location.href.replace(/#.*$/,''))
  const response = await fetch(url.toString(), { cache:'no-store' })
  if (!response.ok) throw new Error(`No fue posible cargar el Excel predeterminado (HTTP ${response.status}).`)
  return parseWorkbook(await response.arrayBuffer(),'Base_CeNtro Partner.xlsx',period)
}
