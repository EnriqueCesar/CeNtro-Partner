import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

const root=document.getElementById('root')
if(!root)throw new Error('No se encontró el contenedor principal de la aplicación.')
registerSW({immediate:true,onRegisteredSW(_,registration){registration?.update().catch(console.error)},onRegisterError(error){console.error('PWA registration error',error)}})
ReactDOM.createRoot(root).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>)
