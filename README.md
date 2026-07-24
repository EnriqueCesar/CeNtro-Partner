# CeNtro Partner V2

Vista única de Ranking Regional para GitHub Pages.

## Validación

```bash
npm ci
npm run check
npm run build
```

La publicación se realiza mediante `.github/workflows/deploy-pages.yml` desde la carpeta compilada `dist`.

## Sugerencias

El pie de página incluye un acceso discreto para sugerencias. Mientras no exista un destino autorizado muestra `Canal de sugerencias pendiente de configuración.` Para habilitarlo, modifica únicamente `SUGGESTIONS_CHANNEL_URL` en `src/layouts/AppLayout.tsx`.
