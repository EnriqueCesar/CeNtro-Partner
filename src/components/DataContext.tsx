import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Area, IndicatorValue, LoadStage, Month, Period, Pillar, StoreResult, WorkbookResult } from '../types'
import { loadDefault } from '../services/excelService'

const ALL_MONTHS: Month[] = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
const FILTER_STORAGE_KEY = 'centro-partner-filters-v1'
type SavedFilters = { selectedPeriods?:Period[]; pillar?:Pillar; region?:string; dm?:string; area?:Area }

function readSavedFilters(): SavedFilters {
  try {
    const saved = JSON.parse(localStorage.getItem(FILTER_STORAGE_KEY) ?? '{}') as SavedFilters
    const validPeriods = (saved.selectedPeriods ?? []).filter(period => period === 'YTD' || ALL_MONTHS.includes(period as Month))
    return {
      selectedPeriods:validPeriods.length ? validPeriods : undefined,
      pillar:['Todos','Partner','Cliente','Negocio'].includes(saved.pillar ?? '') ? saved.pillar : undefined,
      region:typeof saved.region === 'string' ? saved.region : undefined,
      dm:typeof saved.dm === 'string' ? saved.dm : undefined,
      area:['Todos','Ops','RH'].includes(saved.area ?? '') ? saved.area : undefined,
    }
  } catch { return {} }
}

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
  region: string
  setRegion: (value: string) => void
  regions: string[]
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
  const [savedFilters] = useState(readSavedFilters)
  const [data, setData] = useState<WorkbookResult | null>(null)
  const [stage, setStage] = useState<LoadStage>('idle')
  const [error, setError] = useState('')
  const [selectedPeriods, setSelectedPeriods] = useState<Period[]>(savedFilters.selectedPeriods ?? ['YTD'])
  const [pillar, setPillar] = useState<Pillar>(savedFilters.pillar ?? 'Todos')
  const [region, setRegion] = useState(savedFilters.region ?? 'Todas')
  const [dm, setDm] = useState(savedFilters.dm ?? 'Todos')
  const [area, setArea] = useState<Area>(savedFilters.area ?? 'Todos')

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

  useEffect(() => {
    const reloadOnReconnect = () => void load()
    window.addEventListener('online', reloadOnReconnect)
    return () => window.removeEventListener('online', reloadOnReconnect)
  }, [load])

  useEffect(() => {
    try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ selectedPeriods, pillar, region, dm, area })) }
    catch { /* Persistencia progresiva; la aplicación sigue funcionando sin almacenamiento. */ }
  }, [selectedPeriods, pillar, region, dm, area])

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

  const regions = useMemo(
    () => Array.from(new Set((data?.stores ?? []).map(store => store.Región).filter(Boolean))).sort((a,b) => a.localeCompare(b,'es')),
    [data],
  )

  const dms = useMemo(
    () => Array.from(new Set((data?.stores ?? [])
      .filter(store => region === 'Todas' || store.Región === region)
      .map(store => store.DM)
      .filter(Boolean))).sort((a,b) => a.localeCompare(b,'es')),
    [data, region],
  )

  useEffect(() => {
    if (dm !== 'Todos' && !dms.includes(dm)) setDm('Todos')
  }, [dm, dms])

  const stores = useMemo(() => {
    const filteredByDirectory = (data?.stores ?? []).filter(store =>
      (region === 'Todas' || store.Región === region)
      && (dm === 'Todos' || store.DM === dm)
    )
    return filteredByDirectory
      .map(store => {
        const pillarIndicators = pillar === 'Todos' ? store.indicators : store.indicators.filter(indicator => indicator.pillar === pillar)
        const indicators = area === 'Todos' ? pillarIndicators : pillarIndicators.filter(indicator => indicator.areas.includes(area))
        return { ...store, indicators, ...summarizeIndicators(indicators) }
      })
      .sort((a,b) => b.compliance - a.compliance || b.fulfilled - a.fulfilled || a.CeCo.localeCompare(b.CeCo))
      .map((store,index) => ({ ...store, rank:index + 1 }))
  }, [data, region, dm, pillar, area])

  const visibleIndicatorCount = useMemo(() => {
    const indicators = data?.stores[0]?.indicators ?? []
    return indicators.filter(indicator =>
      (pillar === 'Todos' || indicator.pillar === pillar)
      && (area === 'Todos' || indicator.areas.includes(area))
    ).length
  }, [data, pillar, area])

  return <DataContext.Provider value={{
    data, stores, stage, error, selectedPeriods, togglePeriod, selectAllMonths, clearMonths,
    pillar, setPillar, region, setRegion, regions, dm, setDm, dms, area, setArea, visibleIndicatorCount,
    retry:() => void load(),
  }}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('DataProvider requerido')
  return context
}
