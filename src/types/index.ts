export type Period = 'ene'|'feb'|'mar'|'abr'|'may'|'jun'|'YTD'
export type Pillar = 'Todos'|'Partner'|'Cliente'|'Negocio'
export type LoadStage = 'idle'|'loading'|'validating'|'processing'|'ready'|'error'
export interface DirectoryRow { CeCo: string; Tienda: string; DM: string }
export interface IndicatorValue {
  sheet: string
  indicator: string
  pillar: Exclude<Pillar,'Todos'>
  rule: string
  value: unknown
  score: number | null
  status: 'cumple'|'no-cumple'|'na'
}
export interface StoreResult extends DirectoryRow {
  indicators: IndicatorValue[]
  compliance: number
  applicable: number
  fulfilled: number
  failed: number
  na: number
  rank: number
}
export interface AuditItem { level: 'ok'|'warning'|'error'; category: string; message: string }
export interface SheetAudit {
  sheet: string
  found: boolean
  rows: number
  headers: string[]
  missingHeaders: string[]
  validCeCos: number
  duplicateCeCos: string[]
}
export interface WorkbookResult {
  stores: StoreResult[]
  audit: AuditItem[]
  sheets: SheetAudit[]
  periods: Period[]
  fileName: string
  processedAt: string
  foundSheets: string[]
  missingSheets: string[]
  indicatorCount: number
  validCeCos: number
  duplicateDirectoryCeCos: string[]
}
