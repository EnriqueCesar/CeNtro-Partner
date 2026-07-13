import type { ReactNode } from 'react'

export function AppLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1800px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <img src={`${import.meta.env.BASE_URL}assets/CeNtro Partner.png`} alt="CeNtro Partner" className="h-14 w-14 rounded-2xl object-cover" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-starbucks">Región Centro Norte</p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Ranking Regional</h1>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[1800px] p-4 sm:p-6 lg:p-8">{children}</main>
  </div>
}
