import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

declare global {
  interface Window {
    __CENTRO_BOOT_TIMER__?: number
    __CENTRO_UPDATE_SW__?: () => Promise<void>
  }
}

function showBootError(message: string) {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML = `<main style="font-family:Inter,Arial,sans-serif;min-height:100vh;display:grid;place-items:center;background:#f8fafc;padding:24px"><section style="max-width:620px;background:#fff;border:1px solid #dbe3e8;border-radius:24px;padding:32px;text-align:center"><h1 style="color:#006241">CeNtro Partner</h1><h2>No fue posible iniciar la aplicación</h2><p style="color:#475569;line-height:1.6">${message}</p><button onclick="location.reload()" style="border:0;border-radius:12px;background:#006241;color:#fff;padding:12px 18px;font-weight:700;cursor:pointer">Reintentar</button></section></main>`
}

try {
  const root = document.getElementById('root')
  if (!root) throw new Error('No se encontró el contenedor principal.')
  if (window.__CENTRO_BOOT_TIMER__) window.clearTimeout(window.__CENTRO_BOOT_TIMER__)

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary><App /></ErrorBoundary>
    </React.StrictMode>,
  )

  window.setTimeout(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() { window.dispatchEvent(new Event('centro:update-available')) },
      onOfflineReady() { window.dispatchEvent(new Event('centro:offline-ready')) },
      onRegisteredSW(_, registration) {
        registration?.update().catch(console.error)
        window.setInterval(() => registration?.update().catch(console.error), 60 * 60 * 1000)
      },
      onRegisterError(error) { console.error('PWA registration error', error) },
    })
    window.__CENTRO_UPDATE_SW__ = () => updateSW(true)
  }, 1000)
} catch (error) {
  console.error('CeNtro Partner bootstrap error', error)
  showBootError(error instanceof Error ? error.message : 'Ocurrió un error inesperado durante el inicio.')
}
