export type Period = 'ene'|'feb'|'mar'|'abr'|'may'|'jun'|'YTD'
export type Pillar = 'Todos'|'Partner'|'Cliente'|'Negocio'
export interface DirectoryRow { CeCo: string; Tienda: string; DM: string }
export interface IndicatorValue { indicator: string; pillar: Exclude<Pillar,'Todos'>; value: unknown; score: number | null; status: 'cumple'|'no-cumple'|'na' }
export interface StoreResult extends DirectoryRow { indicators: IndicatorValue[]; compliance: number; applicable: number; rank: number }
export interface AuditItem { level: 'ok'|'warning'|'error'; message: string }
export interface WorkbookResult { stores: StoreResult[]; audit: AuditItem[]; periods: Period[]; fileName: string }
