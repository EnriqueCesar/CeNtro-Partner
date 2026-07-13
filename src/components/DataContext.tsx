import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { LoadStage, Period, Pillar, StoreResult, WorkbookResult } from '../types'
import { loadDefault, parseWorkbook } from '../services/excelService'

type Ctx={
 data:WorkbookResult|null;stores:StoreResult[];loading:boolean;stage:LoadStage;error:string;
 period:Period;setPeriod:(p:Period)=>void;dm:string;setDm:(v:string)=>void;pillar:Pillar;setPillar:(v:Pillar)=>void;
 dms:string[];upload:(f:File)=>Promise<void>;retry:()=>void;resetFilters:()=>void
}
const DataContext=createContext<Ctx|null>(null)
function applyPillar(store:StoreResult,pillar:Pillar):StoreResult{
 const indicators=pillar==='Todos'?store.indicators:store.indicators.filter(i=>i.pillar===pillar)
 const fulfilled=indicators.filter(i=>i.score===1).length,failed=indicators.filter(i=>i.score===0).length,na=indicators.filter(i=>i.score===null).length
 const applicable=fulfilled+failed
 return {...store,indicators,fulfilled,failed,na,applicable,compliance:applicable?fulfilled/applicable:0}
}
export function DataProvider({children}:{children:React.ReactNode}){
 const[data,setData]=useState<WorkbookResult|null>(null),[stage,setStage]=useState<LoadStage>('idle'),[error,setError]=useState('')
 const[period,setPeriodState]=useState<Period>('YTD'),[dm,setDm]=useState('Todos'),[pillar,setPillar]=useState<Pillar>('Todos')
 const uploadedBuffer=useRef<ArrayBuffer|null>(null),uploadedName=useRef('')
 const load=useCallback(async(p:Period)=>{setError('');setStage('loading');try{await new Promise(r=>setTimeout(r,100));setStage('validating');const result=uploadedBuffer.current?await parseWorkbook(uploadedBuffer.current.slice(0),uploadedName.current,p):await loadDefault(p);setStage('processing');await new Promise(r=>setTimeout(r,80));setData(result);setStage('ready')}catch(e){console.error(e);setError(e instanceof Error?e.message:'Error inesperado durante el procesamiento.');setStage('error')}},[])
 useEffect(()=>{void load('YTD')},[load])
 useEffect(()=>{const onError=(event:ErrorEvent)=>{console.error('window error',event.error);setError('Ocurrió un error no controlado.');setStage('error')};const onRejection=(event:PromiseRejectionEvent)=>{console.error('unhandled rejection',event.reason);setError('Una operación no pudo completarse.');setStage('error')};window.addEventListener('error',onError);window.addEventListener('unhandledrejection',onRejection);return()=>{window.removeEventListener('error',onError);window.removeEventListener('unhandledrejection',onRejection)}},[])
 const setPeriod=(p:Period)=>{setPeriodState(p);void load(p)}
 const upload=async(file:File)=>{uploadedBuffer.current=await file.arrayBuffer();uploadedName.current=file.name;await load(period)}
 const retry=()=>void load(period)
 const dms=useMemo(()=>Array.from(new Set((data?.stores??[]).map(s=>s.DM).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'es')),[data])
 const stores=useMemo(()=>{const result=(data?.stores??[]).filter(s=>dm==='Todos'||s.DM===dm).map(s=>applyPillar(s,pillar));return result.sort((a,b)=>b.compliance-a.compliance||b.fulfilled-a.fulfilled||a.CeCo.localeCompare(b.CeCo)).map((s,i)=>({...s,rank:i+1}))},[data,dm,pillar])
 const resetFilters=()=>{setDm('Todos');setPillar('Todos')}
 return <DataContext.Provider value={{data,stores,loading:stage!=='ready'&&stage!=='error',stage,error,period,setPeriod,dm,setDm,pillar,setPillar,dms,upload,retry,resetFilters}}>{children}</DataContext.Provider>
}
export const useData=()=>{const ctx=useContext(DataContext);if(!ctx)throw new Error('DataProvider requerido');return ctx}
