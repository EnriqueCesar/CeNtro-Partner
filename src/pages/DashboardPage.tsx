import { Building2, CircleGauge, Trophy, Users } from 'lucide-react'
import { StatCard } from '../components/StatCard'
import { Toolbar } from '../components/Toolbar'
import { useData } from '../components/DataContext'

export function DashboardPage(){
  const {stores,loading,error,pillar}=useData()
  if(loading)return <div className="loading">Cargando y evaluando indicadores…</div>
  if(error)return <div className="error">{error}</div>
  const avg=stores.length?stores.reduce((a,s)=>a+s.compliance,0)/stores.length:0
  const dms=new Set(stores.map(s=>s.DM)).size
  return <><Toolbar/><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><StatCard label="Tiendas" value={stores.length} icon={Building2}/><StatCard label="District Managers" value={dms} icon={Users}/><StatCard label={`Cumplimiento ${pillar==='Todos'?'región':pillar}`} value={`${(avg*100).toFixed(1)}%`} icon={CircleGauge}/><StatCard label="Líder regional" value={stores[0]?.Tienda??'—'} icon={Trophy}/></div><section className="card mt-6"><div className="section-heading"><div><p className="eyebrow">Resumen regional</p><h3 className="section-title">Top 5 de cumplimiento</h3></div><span className="summary-chip">{stores.length} tiendas</span></div><div className="overflow-x-auto"><table><thead><tr><th>Ranking</th><th>Tienda</th><th>DM</th><th>Aplicables</th><th>Cumplimiento</th></tr></thead><tbody>{stores.slice(0,5).map(s=><tr key={s.CeCo}><td className="rank">#{s.rank}</td><td className="font-semibold">{s.Tienda}</td><td>{s.DM}</td><td>{s.applicable}</td><td><span className={`badge ${s.compliance>=.8?'ok':s.compliance>=.6?'warn':'bad'}`}>{(s.compliance*100).toFixed(1)}%</span></td></tr>)}</tbody></table></div></section></>
}
