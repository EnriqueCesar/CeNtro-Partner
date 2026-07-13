import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { DataProvider } from './components/DataContext'
import { AppLayout } from './layouts/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { RankingPage } from './pages/RankingPage'
import { AuditPage } from './pages/AuditPage'
export default function App(){return <ErrorBoundaryWrapper><DataProvider><HashRouter><Routes><Route element={<AppLayout/>}><Route index element={<DashboardPage/>}/><Route path="dashboard" element={<DashboardPage/>}/><Route path="ranking" element={<RankingPage/>}/><Route path="auditoria" element={<AuditPage/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></HashRouter></DataProvider></ErrorBoundaryWrapper>}
function ErrorBoundaryWrapper({children}:{children:React.ReactNode}){return <>{children}</>}
