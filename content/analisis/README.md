# Colección editorial de NostxlgIA

## Publicación

`/analisis/` es el catálogo. Cada investigación tiene un `index.html` propio bajo
`/analisis/<slug>/`. GitHub Pages resuelve estas carpetas directamente; no hay
enrutador, servidor de aplicaciones ni redirecciones a `404.html`.

Los HTML generados se versionan junto con el contenido. GitHub Pages no necesita
ejecutar Python ni instalar paquetes. El artículo, las cifras, la tabla y la
cartografía inicial se entregan en HTML. JavaScript añade las interacciones.

## Añadir una investigación

1. Crear `content/analisis/<slug>/body.html` con la estructura que necesite el tema.
2. Añadir sus metadatos a `articles.json`: slug, título, descripción, categoría,
   fecha, fecha legible, tiempo de lectura, imagen social, miniatura y textos
   alternativo y de pie (`imageAlt`, `thumbnailCaption`).
3. Si necesita interacción, añadir archivos a `assets/js/` e incluirlos en la
   lista `scripts` de esa entrada. Se pueden usar clases y módulos propios en
   el cuerpo: la plantilla no exige mapas, indicadores ni una cantidad fija de
   secciones. `editorial.css` contiene el marco visual común.
4. Ejecutar `python scripts/build_analysis.py` y verificar las páginas generadas.

Los encabezados y pies compartidos están en `scripts/templates/editorial-*.html`.
El generador produce metadatos canonical, Open Graph, Twitter Card y JSON-LD.
Cada artículo tiene contenido indexable sin JavaScript. La imagen social se
sirve desde una URL absoluta; la caché de Facebook puede requerir una nueva
consulta del enlace después del despliegue.

## Población de Durango

Se conservaron los seis archivos proporcionados en `poblacion-durango/source/`.
`prepare_population.py` coteja las 39 claves, nombres, valores y variaciones;
produce JSON, CSV limpio, mapa SVG y un informe `audit.json` con SHA-256.
El SVG mantiene EPSG:6372 y los límites originales. La cobertura contiene
intersecciones entre polígonos según Shapely: no se aplicó la simplificación
automática de cobertura. Los 39 polígonos individuales son válidos.

Para reconstruir los recursos:

```sh
python -m pip install pyshp shapely pillow
python scripts/prepare_population.py
python scripts/build_population_social.py
python scripts/build_analysis.py
```

El generador de imagen usa DejaVu instalado en el sistema. La imagen PNG de
1200 × 630 ya está versionada; no se genera durante el despliegue.

El cálculo principal es `POBVPH25 - OCUPVIV20`, con porcentaje sobre
`OCUPVIV20`. No se utiliza `POBTOT20`. Tampoco se interpreta `CENSO25` como una
medida de precisión. Los datos no incluyen errores estándar ni intervalos:
no se inferirá significancia a partir de las diferencias puntuales.

Los estados opcionales `?municipio=10005&comparar=10007` se validan contra las
39 claves; el enlace canonical mantiene la dirección del artículo sin parámetros.
La búsqueda ignora acentos. El mapa admite ratón, toque y teclado; la tabla
continúa disponible sin JavaScript. `Escape` cierra la búsqueda o restablece
la selección del mapa; las flechas recorren sus municipios.

## Verificación

`scripts/tests/analysis.cjs` comprueba cifras, las 39 búsquedas y selecciones
geográficas, teclado, comparación, restauración de URL, reset, enlaces internos,
tabla, metadatos, navegación móvil, cinco anchos de pantalla y HTML sin JS.

```sh
PLAYWRIGHT_MODULE=/ruta/a/playwright-core \
CHROMIUM_PATH=/ruta/a/chromium node scripts/tests/analysis.cjs
```

La prueba sirve el repositorio en un servidor local y no modifica el sitio remoto.
