# Pilchas Caballito 22

Sitio web completo con catálogo público + panel de administración.

## 1. Crear Supabase

1. Crear un proyecto en Supabase.
2. Ir a SQL Editor.
3. Pegar todo el contenido de `supabase.sql`.
4. Ejecutarlo.
5. Ir a Authentication > Users.
6. Crear el usuario administrador con email y contraseña.

## 2. Configurar la web

Abrir:

`js/config.js`

Cambiar:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STORE.whatsapp`
- `STORE.instagram`

Usar solamente la `anon/public key`. Nunca publicar una `service_role key`.

## 3. Subir a GitHub

Subir todos los archivos manteniendo exactamente las carpetas.

La página pública queda en:

`https://TU-USUARIO.github.io/TU-REPOSITORIO/`

El administrador queda en:

`https://TU-USUARIO.github.io/TU-REPOSITORIO/admin/`

## 4. Funcionamiento

El visitante ve los productos activos desde Supabase.

El administrador entra con el usuario creado en Supabase y puede:

- crear productos
- editar productos
- eliminar productos
- cambiar precios
- cambiar categorías
- cambiar talles
- escribir descripciones
- marcar destacados
- publicar fotos
- ocultar/eliminar productos

Las imágenes se almacenan en Supabase Storage.

## Importante

GitHub Pages solamente sirve los archivos del frontend. La base de datos y el almacenamiento los proporciona Supabase.

No pongas una contraseña de administrador dentro de JavaScript. El login de este proyecto usa Supabase Auth.
