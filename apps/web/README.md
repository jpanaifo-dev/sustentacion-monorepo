# Sistema de Agenda de Sustentaciones — Escuela de Postgrado UNAP

Plataforma web institucional desarrollada para gestionar integralmente el ciclo de vida de las **sustentaciones de tesis y defensas de grado de maestría y doctorado** de la Escuela de Postgrado de la **Universidad Nacional de la Amazonía Peruana (UNAP)**.

---

## 🚀 Tecnologías Principales (Stack)

* **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS, Shadcn UI / Radix UI, Lucide Icons.
* **Calendario:** FullCalendar (Mes, Semana, Día, Listado).
* **Gestión de Estado y Servidor:** TanStack Query v5.
* **Formularios y Validación:** React Hook Form + Zod (validación diferenciada para Borrador vs Confirmada).
* **Backend BaaS:** Supabase PostgreSQL 15+, Supabase Auth, Row Level Security (RLS) integral.
* **Notificaciones:** Resend vía Supabase Edge Functions (`send-defense-notification`).
* **Multimedia:** Cloudflare Images / Direct Uploads vía Edge Functions (`create-media-upload`).

---

## 🏛️ Características y Flujo Funcional

1. **Portal Público Oficial (`/agenda`):**
   - Vista dual de Calendario Institucional y Listado interactivo.
   - Filtros dinámicos por Unidad de Posgrado, Fecha y Búsqueda textual.
   - Detalle de sustentación que protege notas internas y datos personales sensibles.
2. **Ciclo de Estados de Sustentación:**
   - `DRAFT` ➔ Permite guardado preliminar con datos mínimos.
   - `CONFIRMED` ➔ Exige validación rigurosa (al menos 1 sustentante, 1 jurado, título completo, instalación y espacio físico si es presencial). Emite citación vía correo electrónico.
   - `RESCHEDULED` ➔ Trazabilidad de reprogramación con fechas anteriores, nuevos espacios y justificación obligatoria.
   - `COMPLETED` ➔ Cierre formal con hora real y dictamen del jurado.
   - `CANCELLED` ➔ Cancelación justificada sin borrado físico.
   - `REOPEN` ➔ Reapertura controlada para correcciones con permiso `defenses.reopen`.
3. **Detección de Conflictos de Horario en Tiempo Real:**
   - Alertas inmediatas de cruces por espacio físico.
   - Detección de coincidencia horaria de jurados calificadores, sustentantes y asesores en múltiples defensas simultáneas.
4. **Control de Acceso Basado en Roles (RBAC):**
   - Multi-rol por usuario (`SUPER_ADMIN`, `ADMIN`, `DEFENSE_MANAGER`, `AGENDA_MANAGER`, `UNIT_COORDINATOR`, `IT_SUPPORT`, `VIEWER`).
   - Restricción de alcance por unidades asignadas para coordinadores.
   - Selector rápido de simulación de rol en el panel para testing inmediato.
5. **Auditoría y Trazabilidad:**
   - Registro inmutable en PostgreSQL (`audit_logs`) con instantáneas `old_values` y `new_values`.

---

## 🛠️ Instalación y Ejecución Local

### 1. Clonar y preparar dependencias
```bash
git clone <url-del-repositorio>
cd sustentacion-agenda
pnpm install # o npm install
```

### 2. Configurar variables de entorno
Copiar `.env.example` a `.env`:
```bash
cp .env.example .env
```
*(El sistema incluye datos semilla locales mock de alta fidelidad para evaluación inmediata aun sin credenciales remotas activas).*

### 3. Iniciar servidor de desarrollo
```bash
pnpm run dev # o npm run dev
```
Abrir [http://localhost:5173](http://localhost:5173) en el navegador.

### 4. Compilar para Producción
```bash
pnpm run build
```

---

## 📂 Documentación Técnica

* 📐 [Arquitectura del Sistema (ARCHITECTURE.md)](docs/ARCHITECTURE.md)
* 🗄️ [Modelo de Datos y Diccionario SQL (DATABASE.md)](docs/DATABASE.md)
* 🔐 [Matriz de Roles, Permisos y RLS (PERMISSIONS.md)](docs/PERMISSIONS.md)
* 🚀 [Manual de Despliegue en Producción (DEPLOYMENT.md)](docs/DEPLOYMENT.md)

---

## 📜 Migraciones SQL y Datos Semilla
Las migraciones completas listas para producción se ubican en:
* `supabase/migrations/20261001000001_initial_schema.sql` (Esquema, ENUMs, RLS y triggers)
* `supabase/migrations/20261001000002_seed_data.sql` (Roles, permisos, unidades iniciales, espacios y sustentaciones de demostración)
* `supabase/functions/` (Edge Functions para Resend y Cloudflare)

---
© Universidad Nacional de la Amazonía Peruana — Escuela de Postgrado.
