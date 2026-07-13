# CeNtro Partner — V2 Funcional

PWA ejecutiva para procesar localmente `Base_CeNtro Partner.xlsx`, evaluar 18 indicadores y generar el Ranking Regional de la Región Centro Norte.

## Funciones V2
- Dashboard, Ranking Regional y Auditoría.
- Carga automática y reemplazo manual del Excel sin recargar la aplicación.
- Lectura por nombre normalizado de pestaña y encabezado.
- CeCo preservado como texto de cinco dígitos.
- Cumplimiento: cumplidos / indicadores evaluables; N/A excluido.
- Desempate: cumplimiento, cantidad de cumplidos y CeCo.
- Estados de carga, validación, procesamiento, éxito y recuperación.
- Error Boundary y captura de errores globales.
- HashRouter compatible con GitHub Pages.
- PWA con actualización automática y limpieza de cachés antiguas.

## Desarrollo
```bash
npm ci
npm run dev
```

## Validación
```bash
npm run check
npm run build
npm run preview
```

## GitHub Pages
El repositorio objetivo es `EnriqueCesar/CeNtro-Partner` y Vite usa:
```ts
base: '/CeNtro-Partner/'
```

En **Settings > Pages**, seleccionar **GitHub Actions**. El workflow compila y publica exclusivamente `dist`.

## Archivos obligatorios
- `public/data/Base_CeNtro Partner.xlsx`
- `public/assets/CeNtro Partner.png`
