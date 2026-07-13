import type { Pillar } from '../types'

export const SHEETS = {
  directory: 'Directorio',
  instructions: 'Instrucciones',
  indicators: [
    'Rotacion','Bajas<90','Estabilidad 12M','Estabilidad 24M','BB','BT','SS',
    'NPS','Desempeño','Conexion','Bebida','SR% ',
    'ADT_AA','VMT_AA%','V_ppto','V_AT_AA%','vCOGS','SegundasCx'
  ]
} as const

export const PILLARS: Exclude<Pillar,'Todos'>[] = ['Partner','Cliente','Negocio']

export const normalize = (value: unknown) => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-zA-Z0-9%<>=]+/g,' ')
  .trim().toLowerCase().replace(/\s+/g,' ')

export const indicatorPillar = (indicator: string): Exclude<Pillar,'Todos'> => {
  const n = normalize(indicator)
  if (['rotacion','bajas<90','estabilidad 12m','estabilidad 24m','bb','bt','ss'].includes(n)) return 'Partner'
  if (['nps','desempeno','conexion','bebida','sr%'].includes(n)) return 'Cliente'
  return 'Negocio'
}
