import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { LoadStage, StoreResult, WorkbookResult } from '../types'
import { loadDefault } from '../services/excelService'

type Ctx = {
  data: WorkbookResult | null
  stores: StoreResult[]
  stage: LoadStage
  error: string
  dm: string
  setDm: (value: string) => void
  dms: string[]
  retry: () => void
}

const DataContext = createContext<Ctx | null>(null)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<WorkbookResult | null>(null)
  const [stage, setStage] = useState<LoadStage>('idle')
  const [error, setError] = useState('')
  const [dm, setDm] = useState('Todos')

  const load = useCallback(async () => {
    setError('')
    setStage('loading')
    try {
      setStage('validating')
      const result = await loadDefault('YTD')
      setStage('processing')
      setData(result)
      setStage('ready')
    } catch (cause) {
      console.error(cause)
      setError(cause instanceof Error ? cause.message : 'Error inesperado durante el procesamiento.')
      setStage('error')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const dms = useMemo(
    () => Array.from(new Set((data?.stores ?? []).map(store => store.DM).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [data],
  )

  const stores = useMemo(() => {
    const filtered = (data?.stores ?? []).filter(store => dm === 'Todos' || store.DM === dm)
    return [...filtered]
      .sort((a, b) => b.compliance - a.compliance || b.fulfilled - a.fulfilled || a.CeCo.localeCompare(b.CeCo))
      .map((store, index) => ({ ...store, rank: index + 1 }))
  }, [data, dm])

  return <DataContext.Provider value={{ data, stores, stage, error, dm, setDm, dms, retry: () => void load() }}>{children}</DataContext.Provider>
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('DataProvider requerido')
  return context
}
