# Guía de Despliegue y Configuración en Producción
**Sistema de Agenda de Sustentaciones — EPG UNAP**

---

## 1. Requisitos Previos
* Node.js v20+ o v24
* Gestor de paquetes: `pnpm` o `npm`
* Cuenta activa en [Supabase](https://supabase.com)
* Cuenta en [Resend](https://resend.com) (con dominio institucional o remitente verificado)
* Cuenta en [Cloudflare](https://cloudflare.com) (Images o R2)
* Plataforma de hosting frontend (Vercel, Cloudflare Pages o Netlify)

---

## 2. Variables de Entorno

### Frontend (`.env`)
```bash
# URL del proyecto Supabase
VITE_SUPABASE_URL=https://<TU-PROYECTO>.supabase.co

# Clave pública anónima (Anon Key) de Supabase
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# URL base pública de la aplicación
VITE_APP_URL=https://agenda-posgrado.unapiquitos.edu.pe
```

### Supabase Edge Functions (Secrets en Supabase Dashboard o CLI)
Configurar mediante el comando `supabase secrets set`:
```bash
supabase secrets set RESEND_API_KEY="re_123456789..."
supabase secrets set RESEND_FROM_EMAIL="posgrado@unapiquitos.edu.pe"
supabase secrets set CLOUDFLARE_ACCOUNT_ID="tu-account-id"
supabase secrets set CLOUDFLARE_API_TOKEN="tu-api-token"
supabase secrets set APP_URL="https://agenda-posgrado.unapiquitos.edu.pe"
```

---

## 3. Despliegue de Base de Datos y Migraciones

### Opción A: Mediante Supabase CLI
```bash
# 1. Iniciar sesión en Supabase CLI
supabase login

# 2. Vincular con el proyecto
supabase link --project-ref <TU-PROJECT-REF>

# 3. Aplicar migraciones
supabase db push

# 4. Desplegar Edge Functions
supabase functions deploy send-defense-notification
supabase functions deploy create-media-upload
```

### Opción B: Mediante SQL Editor de Supabase
1. Abrir la consola de Supabase ➔ **SQL Editor**.
2. Copiar y ejecutar el contenido de:
   - `supabase/migrations/20261001000001_initial_schema.sql`
   - `supabase/migrations/20261001000002_seed_data.sql`

---

## 4. Despliegue del Frontend (Vercel / Cloudflare Pages)

### En Vercel:
1. Conectar el repositorio de Git.
2. Build Command: `pnpm run build` o `npm run build`
3. Output Directory: `dist`
4. Configurar las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`.
5. Desplegar.

### En Cloudflare Pages:
1. Conectar Git.
2. Framework preset: **Vite**.
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Agregar variables de entorno correspondientes.
