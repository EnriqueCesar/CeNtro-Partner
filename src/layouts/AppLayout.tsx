import { useEffect, useState, type ReactNode } from 'react'

type Campaign = { primary:string; accent:string; primaryColor:string; accentColor:string; style:string; regionLabel:string }
const defaultCampaign: Campaign = {
  primary:'JUNTÉMONOS', accent:'más', primaryColor:'#006241', accentColor:'#111111',
  style:'corporativo-expresivo', regionLabel:'#JUNTÉMONOSCENTROS',
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [campaign, setCampaign] = useState(defaultCampaign)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/campaign.json`, { cache:'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(data => setCampaign({ ...defaultCampaign, ...(data?.campaign ?? {}) }))
      .catch(() => setCampaign(defaultCampaign))
  }, [])

  return <div className="min-h-screen bg-slate-50">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1800px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <img src={`${import.meta.env.BASE_URL}assets/CeNtro Partner.png`} alt="CeNtro Partner" className="h-14 w-14 rounded-2xl object-cover" />
        <div className="campaign-heading" data-style={campaign.style}>
          <div className="campaign-lockup" aria-label={`${campaign.primary} ${campaign.accent}`}>
            <span style={{ color:campaign.primaryColor }}>{campaign.primary}</span>
            <span style={{ color:campaign.accentColor }}>{campaign.accent}</span>
          </div>
          <p className="campaign-region" style={{ color:campaign.primaryColor }}>{campaign.regionLabel}</p>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Ranking Regional</h1>
        </div>
      </div>
    </header>
    <main className="mx-auto max-w-[1800px] p-4 sm:p-6 lg:p-8">{children}</main>
  </div>
}
