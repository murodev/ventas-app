# Sistema de Ventas · Guía de deploy

Stack: **React + Supabase + Vercel** — gratis para uso personal/pequeño negocio.

---

## PASO 1 — Crear proyecto en Supabase

1. Ir a **https://supabase.com** → "Start your project" → login con GitHub o Google
2. Click en **"New project"**
3. Completar:
   - Name: `ventas-app` (o el nombre que quieras)
   - Database Password: anotá esta contraseña (la necesitás si accedés directo a la DB)
   - Region: **South America (São Paulo)** — la más cercana a Argentina
4. Esperar ~2 minutos que se crea el proyecto

---

## PASO 2 — Crear las tablas (SQL)

1. En tu proyecto Supabase ir a **SQL Editor** (ícono de consola en la barra izquierda)
2. Click en **"New query"**
3. Pegar TODO el contenido del archivo `supabase-setup.sql`
4. Click en **"Run"** (o Ctrl+Enter)
5. Deberías ver "Success" — eso crea todas las tablas, permisos y datos de ejemplo

---

## PASO 3 — Crear tu usuario

1. En Supabase ir a **Authentication → Users**
2. Click **"Invite user"** → ingresá tu email
3. Revisá tu email y aceptá la invitación → vas a poder setear tu contraseña
4. Volvé a **Authentication → Users**, copiá el **UUID** de tu usuario (columna "UID")
5. Ir a **SQL Editor** → nueva query → ejecutar esto (con tu UUID y nombre):

```sql
insert into usuarios_roles (user_id, nombre, rol)
values ('PEGAR-UUID-AQUI', 'Tu Nombre', 'admin');
```

---

## PASO 4 — Obtener las API keys

1. En Supabase ir a **Settings → API** (engranaje en la barra izquierda)
2. Copiar:
   - **Project URL** → algo como `https://abcxyz.supabase.co`
   - **anon public key** → clave larga que empieza con `eyJ...`

---

## PASO 5 — Configurar el proyecto React

```bash
# 1. Abrir la carpeta del proyecto
cd ventas-app

# 2. Copiar el archivo de variables de entorno
cp .env.example .env.local

# 3. Editar .env.local con tus datos (cualquier editor de texto)
#    REACT_APP_SUPABASE_URL=https://TU-PROYECTO.supabase.co
#    REACT_APP_SUPABASE_ANON_KEY=TU-ANON-KEY

# 4. Instalar dependencias
npm install


# 5. Correr en local para probar
npm start
# → Abre http://localhost:3000 en tu navegador
```

---

## PASO 6 — Deploy en Vercel (gratis, web + mobile)

1. Ir a **https://vercel.com** → login con GitHub
2. Subir tu código a GitHub:

```bash
git init
git add .
git commit -m "primera version"
# Crear repo en github.com y seguir las instrucciones de push
```

3. En Vercel → **"Add New Project"** → importar tu repo de GitHub
4. En la configuración del proyecto, ir a **Environment Variables** y agregar:
   - `REACT_APP_SUPABASE_URL` = tu URL
   - `REACT_APP_SUPABASE_ANON_KEY` = tu anon key
5. Click **Deploy** — en ~2 minutos tu app está en internet con URL tipo `ventas-app.vercel.app`

---

## Módulos incluidos en esta versión

| Módulo | Estado |
|--------|--------|
| Login con auth real | ✅ Completo |
| Dashboard con métricas | ✅ Completo |
| Navegación con roles | ✅ Completo |
| Nueva venta | 🔜 Próximo |
| Cobros | 🔜 Próximo |
| Clientes | 🔜 Próximo |
| Stock | 🔜 Próximo |
| Fabricación | 🔜 Próximo |
| Reportes | 🔜 Próximo |

---

## Estructura de archivos

```
ventas-app/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   └── supabase.js          ← conexión a Supabase
│   ├── pages/
│   │   ├── Login.js             ← pantalla de login
│   │   ├── Login.module.css
│   │   ├── Dashboard.js         ← dashboard principal
│   │   └── Dashboard.module.css
│   ├── components/
│   │   ├── Layout.js            ← sidebar + navegación
│   │   └── Layout.module.css
│   ├── App.js                   ← rutas y auth state
│   ├── index.js
│   └── index.css                ← estilos globales
├── .env.example                 ← variables de entorno (plantilla)
├── supabase-setup.sql           ← SQL para crear todo en Supabase
└── package.json
```

---

## ¿Problemas comunes?

**"Invalid API key"** → verificar que copiaste bien las keys en `.env.local` y reiniciaste `npm start`

**"relation does not exist"** → el SQL no se ejecutó completo; volver a correr `supabase-setup.sql`

**No puedo logearme** → verificar que insertaste tu usuario en `usuarios_roles` con el UUID correcto

**La app anda en local pero no en Vercel** → verificar que agregaste las Environment Variables en el dashboard de Vercel
