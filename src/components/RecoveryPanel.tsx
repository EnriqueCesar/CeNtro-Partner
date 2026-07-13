import { AlertTriangle, RefreshCcw, Upload } from 'lucide-react'
export function RecoveryPanel({message,onRetry,onUpload}:{message:string;onRetry:()=>void;onUpload:(file:File)=>void}){
  return <section className="recovery-card"><AlertTriangle size={34}/><p className="eyebrow">No fue posible completar la carga</p><h2 className="text-xl font-bold">Revisa el archivo de datos</h2><p className="text-slate-600">{message}</p><div className="flex flex-wrap gap-3"><button className="primary-button" onClick={onRetry}><RefreshCcw size={18}/> Reintentar</button><label className="secondary-button"><Upload size={18}/> Cargar Excel manualmente<input className="hidden" type="file" accept=".xlsx,.xls" onChange={e=>e.target.files?.[0]&&onUpload(e.target.files[0])}/></label></div></section>
}
