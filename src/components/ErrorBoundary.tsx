import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

type Props={children:ReactNode}
type State={hasError:boolean;message:string}
export class ErrorBoundary extends Component<Props,State>{
  state:State={hasError:false,message:''}
  static getDerivedStateFromError(error:Error):State{return{hasError:true,message:error.message||'Error inesperado'}}
  componentDidCatch(error:Error,info:ErrorInfo){console.error('CeNtro Partner error boundary',error,info)}
  render(){if(!this.state.hasError)return this.props.children;return <main className="min-h-screen bg-slate-50 p-6 grid place-items-center"><section className="recovery-card"><AlertTriangle size={36}/><p className="eyebrow">Recuperación segura</p><h1 className="text-2xl font-bold">La aplicación encontró un problema</h1><p className="text-slate-600">No se mostrará una pantalla en blanco. Recarga la herramienta para iniciar una sesión limpia.</p><button className="primary-button" onClick={()=>window.location.reload()}><RefreshCcw size={18}/> Reintentar</button></section></main>}
}
