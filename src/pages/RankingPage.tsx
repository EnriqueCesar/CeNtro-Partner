import { Building2, CircleGauge, ListChecks, Trophy } from 'lucide-react'
import { LoadingPanel } from '../components/LoadingPanel'
import { RecoveryPanel } from '../components/RecoveryPanel'
import { StatCard } from '../components/StatCard'
import { useData } from '../components/DataContext'
import type { IndicatorValue, Period, Pillar } from '../types'

const groupCounts = {
  Partner: 7,
  Cliente: 5,
  Negocio: 6,
} as const

const periods: Period[] = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic','YTD']
const pillars: Pillar[] = ['Todos','Partner','Cliente','Negocio']
const percentIndicators = new Set(['Rotacion', 'Desempeño', 'Conexion', 'Bebida', 'SR%', 'VMT%', 'ppto%', 'AT%', 'COGS'])

function isExplicitNA(value: unknown) {
  return typeof value === 'string' && /^\s*n\/?a\s*$/i.test(value)
}

function formatValue(item: IndicatorValue) {
  if (item.status === 'blank') return ''
  if (item.status === 'na' || isExplicitNA(item.value)) return 'N/A'
  if (typeof item.value === 'number') {
    if (percentIndicators.has(item.indicator)) {
      const ratio = Math.abs(item.value) > 1.5 ? item.value / 100 : item.value
      return `${(ratio * 100).toFixed(1)}%`
    }
    return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(item.value)
  }
  return String(item.value ?? '')
}

function stateClass(item: IndicatorValue) {
  if (item.status === 'cumple') return 'indicator-cell is-ok'
  if (item.status === 'no-cumple') return 'indicator-cell is-bad'
  if (item.status === 'na') return 'indicator-cell is-na'
  return 'indicator-cell'
}

export function RankingPage() {
  const {
    data,
    stores,
    stage,
    error,
    retry,
    period,
    setPeriod,
    pillar,
    setPillar,
    dm,
    setDm,
    dms,
    visibleIndicatorCount,
  } = useData()

  if (stage !== 'ready' && stage !== 'error') return <LoadingPanel stage={stage} />
  if (stage === 'error') return <RecoveryPanel message={error} onRetry={retry} />

  const average = stores.length ? stores.reduce((sum, store) => sum + store.compliance, 0) / stores.length : 0
  const best = stores[0]
  const activeGroups = pillar === 'Todos'
    ? (['Partner','Cliente','Negocio'] as const)
    : ([pillar] as const)

  return <>
    <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total de tiendas" value={stores.length} icon={Building2} />
      <StatCard label="Total de indicadores" value={visibleIndicatorCount} icon={ListChecks} />
      <StatCard label="Promedio de cumplimiento" value={`${(average * 100).toFixed(1)}%`} icon={CircleGauge} />
      <StatCard label="Mejor tienda" value={best?.Tienda ?? '—'} icon={Trophy} />
    </section>

    <section className="card mb-5 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-48">
          <p className="eyebrow">Vista ejecutiva</p>
          <h2 className="section-title">Resultados {period.toUpperCase()}</h2>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-3 xl:max-w-4xl">
          <label className="filter-label">Mes
            <select value={period} onChange={event => setPeriod(event.target.value as Period)} className="control">
              {periods.map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}
            </select>
          </label>
          <label className="filter-label">Pilar
            <select value={pillar} onChange={event => setPillar(event.target.value as Pillar)} className="control">
              {pillars.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="filter-label">Distrito
            <select value={dm} onChange={event => setDm(event.target.value)} className="control">
              <option value="Todos">Todos</option>
              {dms.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
      </div>
    </section>

    <section className="card overflow-hidden p-0">
      <div className="section-heading border-b border-slate-200 px-5 py-4">
        <div><p className="eyebrow">Clasificación dinámica</p><h2 className="section-title">Ranking Regional</h2></div>
        <span className="summary-chip">{stores.length} tiendas</span>
      </div>
      <div className="ranking-scroll">
        <table className="ranking-table">
          <thead>
            <tr className="group-row">
              <th rowSpan={2} className="sticky-col store-col">Tienda</th>
              <th rowSpan={2} className="rank-col">Ranking Región</th>
              {activeGroups.map(group => (
                <th key={group} colSpan={groupCounts[group]} className={`group-${group.toLowerCase()}`}>{group}</th>
              ))}
              <th colSpan={1} className="group-gestion">Gestión</th>
            </tr>
            <tr>
              {(stores[0]?.indicators ?? data?.stores[0]?.indicators.filter(indicator => pillar === 'Todos' || indicator.pillar === pillar) ?? [])
                .map(indicator => <th key={indicator.indicator}>{indicator.indicator}</th>)}
              <th>Cumplimiento</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(store => <tr key={store.CeCo}>
              <td className="sticky-col store-col font-semibold text-slate-900">{store.Tienda}</td>
              <td className="rank-col"><span className="rank-badge">{store.rank}</span></td>
              {store.indicators.map(indicator => <td key={indicator.indicator} className={stateClass(indicator)}>{formatValue(indicator)}</td>)}
              <td className="compliance-cell"><span className="compliance-badge">{(store.compliance * 100).toFixed(1)}%</span></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </>
}
