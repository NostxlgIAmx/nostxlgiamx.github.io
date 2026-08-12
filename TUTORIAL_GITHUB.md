# Tutorial de publicación — NostxlgIA en GitHub Pages

Este sitio está preparado como sitio estático para GitHub Pages.

## Objetivo de URL

Para obtener exactamente:

`https://nostxlgia.github.io/`

la cuenta u organización de GitHub debe llamarse `nostxlgia` y el repositorio debe llamarse exactamente `nostxlgia.github.io`.

## 1. Crear o usar la cuenta/organización

Si puedes usar el nombre `nostxlgia` como cuenta de GitHub, úsalo. Si prefieres mantener tu cuenta personal separada, crea una organización llamada `nostxlgia` y crea el repositorio dentro de esa organización.

## 2. Crear el repositorio

1. En GitHub, pulsa **+** en la esquina superior derecha.
2. Elige **New repository**.
3. Owner: selecciona `nostxlgia`.
4. Repository name: `nostxlgia.github.io`.
5. Para usar GitHub Pages con GitHub Free, deja el repositorio **Public**.
6. Puedes crear el repositorio vacío. No necesitas plantilla ni framework.
7. Pulsa **Create repository**.

## 3. Subir este sitio desde el navegador

1. Descomprime el ZIP de NostxlgIA en tu computadora.
2. En el repositorio, pulsa **Add file** → **Upload files**.
3. Arrastra **el contenido de la carpeta**, no la carpeta contenedora completa.
4. Verifica que `index.html` quede en la raíz del repositorio.
5. También deben quedar en la raíz: `404.html`, `.nojekyll`, `README.md`, `TUTORIAL_GITHUB.md` y las carpetas `assets`, `analisis`, `datos`, `visualizaciones`, `proyectos`, `servicios` y `contacto`.
6. Escribe un mensaje como `Primera versión del sitio`.
7. Pulsa **Commit changes**.

## 4. Activar GitHub Pages

1. Abre **Settings** del repositorio.
2. En la barra lateral, entra a **Pages**.
3. En **Build and deployment**, en **Source**, elige **Deploy from a branch**.
4. En **Branch**, selecciona `main`.
5. En carpeta, selecciona `/(root)`.
6. Pulsa **Save**.
7. GitHub desplegará el sitio. La primera publicación puede tardar varios minutos.

## 5. Comprobar la publicación

Vuelve a **Settings → Pages**. Cuando termine, GitHub mostrará la dirección publicada. Si owner y repositorio se llaman `nostxlgia` / `nostxlgia.github.io`, la dirección será:

`https://nostxlgia.github.io/`

Las rutas principales serán:

- `/analisis/`
- `/datos/`
- `/visualizaciones/`
- `/proyectos/`
- `/servicios/`
- `/contacto/`

## 6. Cómo modificar textos directamente en GitHub

1. Entra al archivo que quieras cambiar.
2. Pulsa el icono del lápiz **Edit this file**.
3. Cambia el texto.
4. Pulsa **Commit changes**.
5. GitHub Pages volverá a publicar automáticamente la nueva versión.

La portada está en `index.html`.

## 7. Cómo cambiar el diseño

La mayor parte del diseño global está en:

`assets/css/styles.css`

Colores principales al inicio del archivo:

- `--bg`: fondo principal.
- `--surface`: tarjetas y superficies.
- `--purple`: morado.
- `--cyan`: cian.
- `--gold`: dorado.
- `--content`: ancho máximo del contenido.

Cambiar esas variables permite modificar gran parte del sitio sin editar cada página.

## 8. Cómo agregar imágenes reales

1. Sube las imágenes a `assets/images/`.
2. En el HTML sustituye un bloque placeholder por una etiqueta como:

```html
<img src="/assets/images/nombre.webp" alt="Descripción de la imagen">
```

Para web conviene usar JPG/WebP optimizados y evitar archivos innecesariamente pesados.

## 9. Cómo agregar una publicación nueva

En esta primera versión las publicaciones son tarjetas de ejemplo. Puedes:

1. Copiar una tarjeta existente.
2. Cambiar categoría, título, fecha y texto.
3. Crear después una carpeta por publicación, por ejemplo:

`analisis/empleo-durango/index.html`

Así la URL quedaría:

`https://nostxlgia.github.io/analisis/empleo-durango/`

## 10. Cómo trabajar conmigo en modificaciones posteriores

Cuando quieras cambiar la web puedes subir aquí el ZIP actualizado del repositorio y especificar el cambio. Se puede devolver otro ZIP completo o únicamente los archivos modificados.

## 11. Formulario de contacto

La primera versión no utiliza un servidor de formularios. El formulario de Contacto prepara un mensaje para `NostxlgIA@proton.me` y abre la aplicación de correo del visitante.

Esto evita depender inicialmente de un servicio externo o de una base de datos. Más adelante puede sustituirse por un servicio de formularios o una función serverless.


## Antes de subir: comprobar visualmente

Abre `index.html` con doble clic. Debe aparecer el diseño oscuro completo. Esta versión está preparada para vista local y para GitHub Pages.
