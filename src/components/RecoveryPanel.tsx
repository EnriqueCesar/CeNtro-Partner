import { AlertTriangle, RefreshCcw } from 'lucide-react'

export function RecoveryPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <section className="recovery-card">
    <AlertTriangle size={34} />
    <p className="eyebrow">No fue posible cargar la base</p>
    <h2 className="text-xl font-bold text-slate-900">Error de procesamiento</h2>
    <p className="text-slate-600">{message}</p>
    <button className="primary-button" onClick={onRetry}><RefreshCcw size={18} /> Reintentar</button>
  </section>
}
