# CeNtro Partner — V1

PWA ejecutiva para procesar localmente `Base_CeNtro Partner.xlsx`, evaluar 18 indicadores por CeCo y generar el Ranking Regional dinámico.

## Funciones
- Dashboard ejecutivo
- Ranking Regional
- Auditoría del Excel
- Filtros por Mes, DM y Pilar
- Carga automática y carga manual
- Cálculo de cumplimiento excluyendo N/A
- PWA instalable
- Despliegue en GitHub Pages

## Ejecución
```bash
npm ci
npm run dev
```

## Compilación
```bash
npm run build
npm run preview
```

## GitHub Pages
1. Subir el contenido del proyecto a la rama `main` del repositorio `EnriqueCesar/CeNtro-Partner`.
2. En **Settings > Pages**, seleccionar **GitHub Actions**.
3. El workflow `.github/workflows/deploy.yml` compilará y publicará la aplicación en `/CeNtro-Partner/`.

## Archivos de datos
- `public/data/Base_CeNtro Partner.xlsx`
- `public/assets/CeNtro Partner.png`

La lectura se realiza por nombres normalizados de pestañas y encabezados. La llave única es `CeCo` como texto de 5 dígitos.
