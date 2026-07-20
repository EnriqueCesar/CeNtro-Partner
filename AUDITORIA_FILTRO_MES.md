# Auditoría técnica breve — Filtro Mes

Fecha: 20 de julio de 2026

## Hallazgo

El selector anterior utilizaba un `<details>` con un panel absoluto dentro de `.card`, mientras `.card` aplicaba `contain: layout`. El panel tenía `z-index: 20`, pero su Card no establecía una capa superior frente a la tabla renderizada después. Esta combinación permitía que el menú quedara cubierto o visualmente recortado. En móvil tampoco existía posicionamiento respecto del viewport. El componente nativo no controlaba cierre exterior, Escape ni navegación con flechas.

## Corrección

- Selector múltiple React controlado, sin cambios en `DataContext`, procesamiento del Excel, Ranking o Cumplimiento.
- YTD conserva exclusión mutua con meses; Seleccionar todo y Limpiar reutilizan las funciones existentes.
- Cierre por clic exterior y Escape; navegación por flechas, Inicio y Fin; estados `aria-expanded` y `aria-checked`.
- Card de filtros con desbordamiento visible y capa superior; menú de escritorio alineado al control y menú móvil fijo dentro del viewport.
- Resumen compacto para YTD, hasta tres meses, varios meses y todos los meses.
- Persistencia existente en `localStorage` conservada.

## Validación

- TypeScript: correcto.
- Build de producción y PWA: correcto.
- Manifest: válido.
- Referencias de GitHub Pages: correctas.
- JavaScript compilado: sin errores de sintaxis.
- Sin nombres de función duplicados.
