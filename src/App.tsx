import { DataProvider } from './components/DataContext'
import { AppLayout } from './layouts/AppLayout'
import { RankingPage } from './pages/RankingPage'

export default function App() {
  return <DataProvider><AppLayout><RankingPage /></AppLayout></DataProvider>
}
