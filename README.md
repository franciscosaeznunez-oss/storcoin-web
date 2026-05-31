# StorCoin — Web Minimarket

## Iniciar el servidor local

```bash
npm start
```

Luego abrí en tu navegador:
- **Sitio web**: http://localhost:3000
- **Panel admin**: http://localhost:3000/admin/login.html

**Credenciales por defecto:** usuario `admin`, contraseña `garci2024`

---

## Panel Admin — ¿Cómo usar?

1. Entrá a `/admin/login.html` con tus credenciales
2. En **Productos** podés agregar, editar y eliminar productos con fotos
3. En **Banners** gestionás el carrusel de la página principal
4. En **Configuración** cambiás el WhatsApp, email, horario, etc.
5. Los cambios se ven instantáneamente en el sitio público

---

## Subir imágenes (Cloudinary)

Para subir fotos de productos necesitás configurar Cloudinary (gratis):

1. Creá cuenta en https://cloudinary.com
2. Copiá tu Cloud Name, API Key y API Secret
3. Pegálos en el archivo `.env`:

```
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
```

4. Reiniciá el servidor con `npm start`

---

## Cambiar la contraseña del admin

1. Abrí una terminal en la carpeta del proyecto
2. Ejecutá: `node -e "require('bcryptjs').hash('TU_NUEVA_CONTRASEÑA',10).then(console.log)"`
3. Copiá el resultado y pegálo en `.env` como `ADMIN_PASS_HASH=...`
4. Reiniciá el servidor

---

## Deploy en Railway (gratis)

1. Subí el proyecto a GitHub (sin el `.env`)
2. Creá cuenta en https://railway.app
3. Nuevo proyecto → Deploy from GitHub
4. En Variables de entorno agregá todas las del `.env`
5. Railway da una URL pública automáticamente

---

## Archivos de datos

Los productos y la configuración se guardan en:
- `data/products.json` — catálogo completo
- `data/config.json` — datos del negocio
- `data/slides.json` — banners del carrusel
