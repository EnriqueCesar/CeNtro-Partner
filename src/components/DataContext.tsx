import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Area, IndicatorValue, LoadStage, Month, Period, Pillar, StoreResult, WorkbookResult } from '../types'
import { loadDefault } from '../services/excelService'

const ALL_MONTHS: Month[] = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

type Ctx = {
  data: WorkbookResult | null
  stores: StoreResult[]
  stage: LoadStage
  error: string
  selectedPeriods: Period[]
  togglePeriod: (value: Period) => void
  selectAllMonths: () => void
  clearMonths: () => void
  pillar: Pillar
  setPillar: (value: Pillar) => void
  dm: string
  setDm: (value: string) => void
  dms: string[]
  area: Area
  setArea: (value: Area) => void
  visibleIndicatorCount: number
  retry: () => void
}

const DataContext = createContext<Ctx | null>(null)

function summarizeIndicators(indicators: IndicatorValue[]) {
  const fulfilled = indicators.reduce((sum, indicator) => sum + indicator.fulfilled, 0)
  const applicable = indicators.reduce((sum, indicator) => sum + indicator.applicable, 0)
  const failed = applicable - fulfilled
  const na = indicators.filter(indicator => indicator.applicable === 0).length
  return { fulfilled, failed, na, applicable, compliance: applicable ? fulfilled / applicable : 0 }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkbookResult | null>(null)
  const [stage, setStage] = useState<LoadStage>('idle')
  const [error, setError] = useState('')
  const [selectedPeriods, setSelectedPeriods] = useState<Period[]>(['YTD'])
  const [pillar, setPillar] = useState<Pillar>('Todos')
  const [dm, setDm] = useState('Todos')
  const [area, setArea] = useState<Area>('Todos')

  const load = useCallback(async () => {
    setError('')
    setStage(current => current === 'ready' ? 'processing' : 'loading')
    try {
      const result = await loadDefault(selectedPeriods)
      setData(result)
      setStage('ready')
    } catch (cause) {
      console.error(cause)
      setError(cause instanceof Error ? cause.message : 'Error inesperado durante el procesamiento.')
      setStage('error')
    }
  }, [selectedPeriods])

  useEffect(() => { void load() }, [load])

  const togglePeriod = useCallback((value: Period) => {
    setSelectedPeriods(current => {
      if (value === 'YTD') return ['YTD']
      const months = current.filter((period): period is Month => period !== 'YTD')
      const next = months.includes(value) ? months.filter(month => month !== value) : [...months, value]
      return ALL_MONTHS.filter(month => next.includes(month))
    })
  }, [])

  const selectAllMonths = useCallback(() => setSelectedPeriods([...ALL_MONTHS]), [])
  const clearMonths = useCallback(() => setSelectedPeriods([]), [])

  const dms = useMemo(
    () => Array.from(new Set((data?.stores ?? []).map(store => store.DM).filter(Boolean))).sort((a,b) => a.localeCompare(b,'es')),
    [data],
  )

  const stores = useMemo(() => {
    const filteredByDistrict = (data?.stores ?? []).filter(store => dm === 'Todos' || store.DM === dm)
    return filteredByDistrict
      .map(store => {
        const pillarIndicators = pillar === 'Todos' ? store.indicators : store.indicators.filter(indicator => indicator.pillar === pillar)
        const indicators = area === 'Todos' ? pillarIndicators : pillarIndicators.filter(indicator => indicator.areas.includes(area))
        return { ...store, indicators, ...summarizeIndicators(indicators) }
      })
      .sort((a,b) => b.compliance - a.compliance || b.fulfilled - a.fulfilled || a.CeCo.localeCompare(b.CeCo))
      .map((store,index) => ({ ...store, rank:index + 1 }))
  }, [data, dm, pillar, area])

  const visibleIndicatorCount = useMemo(() => {
    const indicators = data?.stores[0]?.indicators ?? []
    return indicators.filter(indicator =>
      (pillar === 'Todos' || indicator.pillar === pillar)
      && (area === 'Todos' || indicator.areas.includes(area))
    ).length
  }, [data, pillar, area])

  return <DataContext.Provider value={{
    data, stores, stage, error, selectedPeriods, togglePeriod, selectAllMonths, clearMonths,
    pillar, setPillar, dm, setDm, dms, area, setArea, visibleIndicatorCount,
    retry:() => void load(),
  }}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('DataProvider requerido')
  return context
}
