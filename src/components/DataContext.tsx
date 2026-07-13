import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Period, Pillar, StoreResult, WorkbookResult } from '../types'
import { loadDefault, parseWorkbook } from '../services/excelService'

type Ctx = {
  data: WorkbookResult|null; stores: StoreResult[]; loading:boolean; error:string;
  period:Period; setPeriod:(p:Period)=>void; dm:string; setDm:(v:string)=>void;
  pillar:Pillar; setPillar:(v:Pillar)=>void; dms:string[]; upload:(f:File)=>Promise<void>; resetFilters:()=>void
}
const DataContext=createContext<Ctx|null>(null)

function applyPillar(store: StoreResult, pillar: Pillar): StoreResult {
  const indicators = pillar === 'Todos' ? store.indicators : store.indicators.filter(i => i.pillar === pillar)
  const applicable = indicators.filter(i => i.score !== null)
  const compliance = applicable.length ? applicable.reduce((sum,item)=>sum+(item.score??0),0)/applicable.length : 0
  return {...store, indicators, applicable:applicable.length, compliance}
}

export function DataProvider({children}:{children:React.ReactNode}) {
  const [data,setData]=useState<WorkbookResult|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [period,setPeriodState]=useState<Period>('YTD')
  const [dm,setDm]=useState('Todos')
  const [pillar,setPillar]=useState<Pillar>('Todos')
  const uploadedBuffer=useRef<ArrayBuffer|null>(null)
  const uploadedName=useRef('')

  const load=async(p:Period)=>{setLoading(true);setError('');try{const result=uploadedBuffer.current?await parseWorkbook(uploadedBuffer.current.slice(0),uploadedName.current,p):await loadDefault(p);setData(result)}catch(e){setError(e instanceof Error?e.message:'Error inesperado')}finally{setLoading(false)}}
  useEffect(()=>{void load('YTD')},[])
  const setPeriod=(p:Period)=>{setPeriodState(p);void load(p)}
  const upload=async(file:File)=>{uploadedBuffer.current=await file.arrayBuffer();uploadedName.current=file.name;await load(period)}
  const dms=useMemo(()=>Array.from(new Set((data?.stores??[]).map(s=>s.DM).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es')),[data])
  const stores=useMemo(()=>{
    const result=(data?.stores??[]).filter(s=>dm==='Todos'||s.DM===dm).map(s=>applyPillar(s,pillar))
    return result.sort((a,b)=>b.compliance-a.compliance||a.Tienda.localeCompare(b.Tienda,'es')).map((s,i)=>({...s,rank:i+1}))
  },[data,dm,pillar])
  const resetFilters=()=>{setDm('Todos');setPillar('Todos')}
  return <DataContext.Provider value={{data,stores,loading,error,period,setPeriod,dm,setDm,pillar,setPillar,dms,upload,resetFilters}}>{children}</DataContext.Provider>
}
export const useData=()=>{const context=useContext(DataContext);if(!context)throw new Error('DataProvider requerido');return context}
