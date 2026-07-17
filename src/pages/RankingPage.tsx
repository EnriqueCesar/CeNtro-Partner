import { useMemo, useState, type CSSProperties } from 'react'
import * as XLSX from 'xlsx'
import { ArrowDown, ArrowUp, Building2, Check, ChevronDown, CircleGauge, Download, EyeOff, ListChecks, MonitorUp, Trophy, X } from 'lucide-react'
import { LoadingPanel } from '../components/LoadingPanel'
import { RecoveryPanel } from '../components/RecoveryPanel'
import { StatCard } from '../components/StatCard'
import { useData } from '../components/DataContext'
import type { Area, IndicatorValue, Month, Period, Pillar, StoreResult } from '../types'

const months: Month[] = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const pillars: Pillar[] = ['Todos','Partner','Cliente','Negocio']
const areas: Area[] = ['Todos','Ops','RH']
const percentIndicators = new Set(['Rotacion','Estabilidad 12M','Estabilidad 24M','Desempeño','Conexion','Bebida','SR%','VMT%','ppto%','AT%','COGS'])
const clientIndicatorOrder = ['NPS','Conexion','Desempeño','Bebida','SR%']
const visibleIndicatorNames: Record<string,string> = {
  'Estabilidad 12M':'E-12M',
  'Estabilidad 24M':'E-24M',
}

type SortDirection = 'desc'|'asc'
type SortColumn = 'rank'|'compliance'|'Rotacion'|'Conexion'|'Bebida'|'OMT'|'COGS'|'Segundas Cx'

function isExplicitNA(value: unknown) { return typeof value === 'string' && /^\s*n\/?a\s*$/i.test(value) }
function formatValue(item: IndicatorValue) {
  if (item.displayValue) return item.displayValue
  if (item.status === 'blank') return ''
  if (item.status === 'na' || isExplicitNA(item.value)) return 'N/A'
  if (typeof item.value === 'number') {
    if (percentIndicators.has(item.indicator)) {
      const ratio = Math.abs(item.value) > 1.5 ? item.value / 100 : item.value
      const decimals = item.indicator === 'Estabilidad 12M' || item.indicator === 'Estabilidad 24M' ? 0 : 1
      return `${(ratio * 100).toFixed(decimals)}%`
    }
    if (item.indicator === 'OMT') return new Intl.NumberFormat('es-MX', { maximumFractionDigits:0 }).format(Math.round(item.value))
    if (item.indicator === 'Segundas Cx') {
      const truncated = Math.trunc(item.value * 10) / 10
      return new Intl.NumberFormat('es-MX', { minimumFractionDigits:1, maximumFractionDigits:1 }).format(truncated)
    }
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits:2 }).format(item.value)
  }
  return String(item.value ?? '')
}
function stateClass(item: IndicatorValue) {
  if (item.status === 'cumple') return 'indicator-cell is-ok'
  if (item.status === 'no-cumple') return 'indicator-cell is-bad'
  if (item.status === 'na') return 'indicator-cell is-na'
  return 'indicator-cell'
}
function stateLabel(item: IndicatorValue) {
  if (item.status === 'cumple') return 'Cumple'
  if (item.status === 'no-cumple') return 'No cumple'
  if (item.status === 'na') return 'N/A'
  return 'Vacío'
}
function selectionLabel(selection: Period[]) {
  if (selection.includes('YTD')) return 'YTD'
  if (!selection.length) return 'Selecciona meses'
  if (selection.length === 12) return 'Todos los meses'
  return selection.map(period => period.toUpperCase()).join(', ')
}
function visibleIndicatorName(indicator: string) {
  return visibleIndicatorNames[indicator] ?? indicator
}
function orderIndicators(indicators: IndicatorValue[]) {
  return [...indicators].sort((a,b) => {
    if (a.pillar !== 'Cliente' || b.pillar !== 'Cliente') return 0
    return clientIndicatorOrder.indexOf(a.indicator) - clientIndicatorOrder.indexOf(b.indicator)
  })
}
function indicatorsForStore(store: StoreResult) {
  return orderIndicators(store.indicators)
}
type ComplianceQuartiles = { q1:number; q2:number; q3:number }

function quantile(sortedValues: number[], percentile: number) {
  if (!sortedValues.length) return 0
  const position = (sortedValues.length - 1) * percentile
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sortedValues[lower]
  const weight = position - lower
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
}

function complianceQuartiles(values: number[]): ComplianceQuartiles {
  const sortedValues = [...values].sort((a,b) => a - b)
  return {
    q1:quantile(sortedValues, 0.25),
    q2:quantile(sortedValues, 0.50),
    q3:quantile(sortedValues, 0.75),
  }
}

function complianceQuartileStyle(value: number, quartiles: ComplianceQuartiles): CSSProperties {
  const palette = value >= quartiles.q3
    ? { surface:'#dff3e8', fill:'#087443', ink:'#064e33', border:'#8bc9a9' }
    : value >= quartiles.q2
      ? { surface:'#fff3bf', fill:'#d6aa00', ink:'#594900', border:'#dfc34d' }
      : value >= quartiles.q1
        ? { surface:'#ffe0b2', fill:'#df7500', ink:'#713800', border:'#e7a251' }
        : { surface:'#f9d6d5', fill:'#c9362b', ink:'#7b1710', border:'#df8e89' }

  return {
    '--compliance-surface':palette.surface,
    '--compliance-fill':palette.fill,
    '--compliance-ink':palette.ink,
    '--compliance-border':palette.border,
    '--compliance-progress':`${Math.max(0, Math.min(100, value * 100))}%`,
  } as CSSProperties
}

export function RankingPage() {
  const { data, stores, stage, error, retry, selectedPeriods, togglePeriod, selectAllMonths, clearMonths, pillar, setPillar, region, setRegion, regions, dm, setDm, dms, visibleIndicatorCount, area, setArea } = useData()
  const [sortColumn, setSortColumn] = useState<SortColumn>('rank')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [presentationMode, setPresentationMode] = useState(false)
  const [hideIncomplete, setHideIncomplete] = useState(false)

  const displayedIndicators = useMemo(() => orderIndicators(
    stores[0]?.indicators
      ?? data?.stores[0]?.indicators.filter(indicator => pillar === 'Todos' || indicator.pillar === pillar)
      ?? [],
  ), [stores, data, pillar])

  const visibleStores = useMemo(() => {
    if (!hideIncomplete) return stores
    const visibleNames = new Set(displayedIndicators.map(indicator => indicator.indicator))
    return stores.filter(store => {
      const blankCount = store.indicators.reduce((count, indicator) => {
        if (!visibleNames.has(indicator.indicator)) return count
        return indicator.status === 'blank' ? count + 1 : count
      }, 0)
      return blankCount <= 5
    })
  }, [stores, displayedIndicators, hideIncomplete])

  const sortedStores = useMemo(() => [...visibleStores].sort((a,b) => {
    if (sortColumn === 'compliance') {
      const difference = sortDirection === 'desc' ? b.compliance - a.compliance : a.compliance - b.compliance
      return difference || a.rank - b.rank
    }
    if (sortColumn !== 'rank') {
      const valueFor = (store: StoreResult) => {
        const item = store.indicators.find(indicator => indicator.indicator === sortColumn)
        return typeof item?.value === 'number' ? item.value : null
      }
      const aValue = valueFor(a)
      const bValue = valueFor(b)
      if (aValue === null && bValue === null) return a.rank - b.rank
      if (aValue === null) return 1
      if (bValue === null) return -1
      const difference = sortDirection === 'desc' ? bValue - aValue : aValue - bValue
      return difference || a.rank - b.rank
    }
    return sortDirection === 'desc' ? b.rank - a.rank : a.rank - b.rank
  }), [visibleStores, sortColumn, sortDirection])

  const quartiles = useMemo(
    () => complianceQuartiles(visibleStores.map(store => store.compliance)),
    [visibleStores],
  )

  if (stage !== 'ready' && stage !== 'error' && !data) return <LoadingPanel stage={stage} />
  if (stage === 'error') return <RecoveryPanel message={error} onRetry={retry} />

  const average = stores.length ? stores.reduce((sum,store) => sum + store.compliance, 0) / stores.length : 0
  const best = stores[0]
  const activeGroups = pillar === 'Todos' ? (['Partner','Cliente','Negocio'] as const) : ([pillar] as const)
  const title = selectionLabel(selectedPeriods)
  function toggleIndicatorSort(indicator: SortColumn) {
    setSortDirection(current => sortColumn === indicator ? (current === 'asc' ? 'desc' : 'asc') : 'asc')
    setSortColumn(indicator)
  }

  function toggleComplianceSort() {
    setSortDirection(current => sortColumn === 'compliance' ? (current === 'desc' ? 'asc' : 'desc') : 'desc')
    setSortColumn('compliance')
  }

  function exportRanking() {
    const firstHeader = ['Tienda']
    const secondHeader = ['']
    const merges: XLSX.Range[] = [
      { s:{ r:0, c:0 }, e:{ r:1, c:0 } },
    ]
    let column = 1

    activeGroups.forEach(group => {
      const groupIndicators = displayedIndicators.filter(indicator => indicator.pillar === group)
      if (!groupIndicators.length) return
      firstHeader.push(group, ...Array(groupIndicators.length - 1).fill(''))
      secondHeader.push(...groupIndicators.map(indicator => visibleIndicatorName(indicator.indicator)))
      merges.push({ s:{ r:0, c:column }, e:{ r:0, c:column + groupIndicators.length - 1 } })
      column += groupIndicators.length
    })

    firstHeader.push('Gestión')
    secondHeader.push('Cumplimiento')
    merges.push({ s:{ r:0, c:column }, e:{ r:0, c:column } })

    const rows = sortedStores.map((store,index) => {
      const indicatorMap = new Map(indicatorsForStore(store).map(indicator => [indicator.indicator, indicator]))
      return [
        `${index + 1} ${store.Tienda}`,
        ...displayedIndicators.map(indicator => formatValue(indicatorMap.get(indicator.indicator) ?? indicator)),
        `${(store.compliance * 100).toFixed(1)}%`,
      ]
    })

    const worksheet = XLSX.utils.aoa_to_sheet([firstHeader, secondHeader, ...rows])
    worksheet['!merges'] = merges
    worksheet['!cols'] = [
      { wch:36 },
      ...displayedIndicators.map(indicator => ({ wch:Math.max(10, visibleIndicatorName(indicator.indicator).length + 2) })),
      { wch:16 },
    ]
    worksheet['!autofilter'] = { ref:XLSX.utils.encode_range({ s:{ r:1, c:0 }, e:{ r:rows.length + 1, c:secondHeader.length - 1 } }) }

    sortedStores.forEach((store,rowIndex) => {
      const indicatorMap = new Map(indicatorsForStore(store).map(indicator => [indicator.indicator, indicator]))
      displayedIndicators.forEach((indicator,indicatorIndex) => {
        const current = indicatorMap.get(indicator.indicator) ?? indicator
        const address = XLSX.utils.encode_cell({ r:rowIndex + 2, c:indicatorIndex + 1 })
        const cell = worksheet[address] as XLSX.CellObject & { c?: Array<{ a:string; t:string }> }
        if (cell) cell.c = [{ a:'CeNtro Partner', t:`Estado: ${stateLabel(current)}` }]
      })
    })

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ranking Regional')
    XLSX.writeFile(workbook, 'CeNtro_Partner_Ranking.xlsx', { compression:true })
  }

  return <div className={presentationMode ? 'presentation-mode' : undefined}>
    <section className="dashboard-summary mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total de tiendas" value={stores.length} icon={Building2} />
      <StatCard label="Total de indicadores" value={visibleIndicatorCount} icon={ListChecks} />
      <StatCard label="Promedio de cumplimiento" value={`${(average * 100).toFixed(1)}%`} icon={CircleGauge} />
      <StatCard label="Mejor tienda" value={best?.Tienda ?? '—'} icon={Trophy} />
    </section>

    <section className="ranking-filters card mb-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-48"><p className="eyebrow">Vista ejecutiva</p><h2 className="section-title">Resultados {title}</h2></div>
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-6xl xl:grid-cols-5">
          <div className="filter-label">Mes
            <details className="month-picker group relative mt-1">
              <summary className="control flex cursor-pointer list-none items-center justify-between normal-case tracking-normal">
                <span className="truncate">{title}</span><ChevronDown size={17} className="shrink-0 transition group-open:rotate-180" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-full min-w-64 rounded-xl border border-slate-200 bg-white p-3 normal-case shadow-lg">
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={selectAllMonths} className="rounded-lg border border-starbucks/20 px-3 py-2 text-xs font-bold text-starbucks hover:bg-starbucks-light">Seleccionar todo</button>
                  <button type="button" onClick={clearMonths} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Limpiar</button>
                </div>
                <label className="mb-2 flex cursor-pointer items-center justify-between rounded-lg border border-starbucks/20 px-3 py-2 text-sm font-bold text-starbucks">
                  <span>YTD</span><input type="checkbox" checked={selectedPeriods.includes('YTD')} onChange={() => togglePeriod('YTD')} className="sr-only" />
                  {selectedPeriods.includes('YTD') && <Check size={16} />}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {months.map(month => {
                    const selected = selectedPeriods.includes(month)
                    return <label key={month} className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs font-bold ${selected ? 'border-starbucks bg-starbucks-light text-starbucks' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      <span>{month.toUpperCase()}</span><input type="checkbox" checked={selected} onChange={() => togglePeriod(month)} className="sr-only" />{selected && <Check size={14} />}
                    </label>
                  })}
                </div>
              </div>
            </details>
          </div>
          <label className="filter-label">Pilar
            <select value={pillar} onChange={event => setPillar(event.target.value as Pillar)} className="control">{pillars.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label className="filter-label">Área
            <select value={area} onChange={event => setArea(event.target.value as Area)} className="control">{areas.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label className="filter-label">Región
            <select value={region} onChange={event => setRegion(event.target.value)} className="control"><option>Todas</option>{regions.map(value => <option key={value}>{value}</option>)}</select>
          </label>
          <label className="filter-label">Distrito
            <select value={dm} onChange={event => setDm(event.target.value)} className="control"><option>Todos</option>{dms.map(value => <option key={value}>{value}</option>)}</select>
          </label>
        </div>
      </div>
    </section>

    <section className="card overflow-hidden p-0">
      <div className="section-heading border-b border-slate-200 px-5 py-4">
        <div><p className="eyebrow">Clasificación dinámica</p><h2 className="section-title">Ranking Regional</h2></div>
        <div className="flex items-center gap-2">
          {presentationMode ? <button type="button" onClick={() => setPresentationMode(false)} className="presentation-exit-button"><X size={15} />Salir de presentación</button> : <button type="button" onClick={() => setPresentationMode(true)} className="presentation-button"><MonitorUp size={15} />Modo Presentación</button>}
          <button type="button" onClick={() => setHideIncomplete(current => !current)} className={`incomplete-toggle ${hideIncomplete ? 'is-active' : ''}`} aria-pressed={hideIncomplete} title="Oculta tiendas con más de 5 indicadores visibles en blanco"><EyeOff size={15} />Ocultar incompletas</button>
          <button type="button" onClick={exportRanking} className="secondary-ranking-control inline-flex items-center gap-2 rounded-lg border border-starbucks/20 px-3 py-2 text-xs font-bold text-starbucks hover:bg-starbucks-light"><Download size={15} />Exportar Excel</button>
          <span className="secondary-ranking-control summary-chip">{visibleStores.length} tiendas</span>
        </div>
      </div>
      <div className="ranking-scroll"><table className="ranking-table">
        <thead><tr className="group-row"><th rowSpan={2} className="sticky-col store-col store-header">Tienda</th>
          {activeGroups.map(group => {
            const count = displayedIndicators.filter(indicator => indicator.pillar === group).length
            return count ? <th key={group} colSpan={count} className={`group-${group.toLowerCase()}`}>{group}</th> : null
          })}<th colSpan={1} className="group-gestion">Gestión</th></tr>
          <tr className="indicator-header-row">{displayedIndicators.map(indicator => {
            const sortable = ['Rotacion','Conexion','Bebida','OMT','COGS','Segundas Cx'].includes(indicator.indicator)
            const active = sortColumn === indicator.indicator
            return <th key={indicator.indicator} className={`indicator-header ${sortable ? 'is-sortable' : ''}`}>
              {sortable ? <button type="button" onClick={() => toggleIndicatorSort(indicator.indicator as SortColumn)} className="indicator-sort-button" title={active && sortDirection === 'asc' ? 'Ordenar de mayor a menor' : 'Ordenar de menor a mayor'}>
                <span className="indicator-sort-label">{visibleIndicatorName(indicator.indicator)}</span><span className="indicator-sort-icon" aria-hidden="true">{active && (sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</span>
              </button> : <span>{visibleIndicatorName(indicator.indicator)}</span>}
            </th>
          })}<th className="compliance-header"><button type="button" onClick={toggleComplianceSort} className="inline-flex items-center gap-1.5" title={sortColumn === 'compliance' && sortDirection === 'desc' ? 'Ordenar de menor a mayor' : 'Ordenar de mayor a menor'}>Cumplimiento {sortColumn === 'compliance' && sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</button></th></tr></thead>
        <tbody>{sortedStores.map((store,index) => {
          const indicatorMap = new Map(store.indicators.map(indicator => [indicator.indicator, indicator]))
          return <tr key={store.CeCo}><td className="sticky-col store-col font-semibold text-slate-900"><span className="store-position">{index + 1}</span><span className="store-name">{store.Tienda}</span></td>
            {displayedIndicators.map(indicator => {
              const current = indicatorMap.get(indicator.indicator) ?? indicator
              return <td key={current.indicator} className={stateClass(current)}>{formatValue(current)}</td>
            })}<td
              className="compliance-cell"
              style={complianceQuartileStyle(store.compliance, quartiles)}
              title={`Cuartiles visibles: Q1 ${(quartiles.q1 * 100).toFixed(1)}% · Q2 ${(quartiles.q2 * 100).toFixed(1)}% · Q3 ${(quartiles.q3 * 100).toFixed(1)}%`}
            ><div className="compliance-meter" aria-label={`Cumplimiento ${(store.compliance * 100).toFixed(1)}%`}><span className="compliance-progress" aria-hidden="true" /><span className="compliance-value">{(store.compliance * 100).toFixed(1)}%</span></div></td></tr>
        })}</tbody>
      </table></div>
    </section>
  </div>
}
