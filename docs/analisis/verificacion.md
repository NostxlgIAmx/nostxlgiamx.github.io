# Primera investigación: población municipal de Durango

Fecha: 8 de octubre de 2026. Base: `ae93519c9abe836423beff0c3f0c8f101ce9e886`.

## Auditoría inicial

Sitio estático con carpetas por sección y enlaces relativos; sin framework ni
paso de compilación obligatorio. Análisis tenía únicamente un aviso de próxima
apertura. La navegación principal ya enlazaba al catálogo. Se reutilizan el
encabezado, el pie, Inter / Instrument Serif con sus respaldos, y la paleta oscura,
dorada y cyan. Los estilos editoriales y el código del mapa son archivos propios.
Las demás secciones y sus recursos permanecen sin modificaciones.

El dominio mostró `Site Unavailable` desde el navegador remoto y desde HTTP.
Se renderizó el HEAD clonado para revisar portada y Análisis, y se comparó con
la implementación nueva en Chromium. No se confunde esta revisión local con una
comprobación del sitio público desplegado.

## Validación numérica

- 39 filas, 39 polígonos, 39 claves distintas; nombres coincidentes.
- 2020: 1,821,273; 2025: 1,931,226; diferencia: 109,953; variación: 6.03715094 %.
- 18 municipios positivos y 21 negativos; sin casos cero.
- Durango: +78,451; Gómez Palacio: +32,075; otros 37: −573.
- Aumentos brutos: 126,619; disminuciones: −16,666.
- Porcentajes recalculados desde valores enteros, no desde cifras redondeadas.
- Fuentes y límites de inferencia se identifican en el artículo. No hay medidas
  de precisión en el insumo y no se hicieron pruebas de significancia.

## QA funcional aprobado

Chromium 153, 320 / 390 / 768 / 1024 / 1440 px:

- Búsqueda de los 39 municipios sin acentos y comprobación de ambas poblaciones.
- Click de ratón en el interior de los 39 polígonos y verificación del municipio.
- Búsqueda vacía, resultados inexistentes, Escape, flechas y Enter.
- Selección y comparación, exclusión de autocoincidencia, reset y recarga con URL.
- Enlaces desde los rankings, nota de precisión desplegable y tabla de 39 filas.
- Menú móvil, acceso al catálogo, regreso al artículo y comparación en móvil.
- Sin desbordamiento horizontal en los cinco anchos.
- Enlaces y recursos locales con HTTP 200; sin errores JavaScript.
- Canonical, JSON-LD y HTML/cartografía/tabla disponibles sin JavaScript.
- Imagen social 1200 × 630 generada con los polígonos suministrados.

Las capturas muestran la implementación local. La comprobación en producción
queda sujeta a recuperar acceso real al dominio; un commit no demuestra por sí
mismo que GitHub Pages haya actualizado su publicación.
