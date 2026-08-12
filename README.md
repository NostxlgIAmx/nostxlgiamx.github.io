# NostxlgIA — sitio web

Sitio estático preparado para GitHub Pages.

## Estructura
- `index.html`: Inicio
- `analisis/`: Análisis
- `datos/`: Datos
- `visualizaciones/`: Visualizaciones
- `proyectos/`: Proyectos
- `servicios/`: Servicios
- `contacto/`: Contacto
- `assets/css/styles.css`: estilos globales
- `assets/js/main.js`: navegación móvil y formulario mailto

## Vista local
Los enlaces comienzan con `/`, por lo que conviene servir la carpeta con un servidor local en lugar de abrir `index.html` directamente. Ejemplo: `python -m http.server 8000`.

## GitHub Pages
El sitio está pensado para un repositorio de usuario/organización llamado `nostxlgia.github.io`, de forma que la URL final sea `https://nostxlgia.github.io/`.


## Vista previa local

Puedes abrir `index.html` directamente con doble clic. Esta versión usa rutas relativas para cargar CSS/JS y contiene un pequeño helper que permite navegar las páginas también bajo `file://`. En GitHub Pages las URLs se mantienen limpias (`/analisis/`, `/servicios/`, etc.).
