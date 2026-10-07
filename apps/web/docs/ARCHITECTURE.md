# Arquitectura del Sistema de Agenda de Sustentaciones
**Escuela de Postgrado — Universidad Nacional de la Amazonía Peruana (EPG - UNAP)**

---

## 1. Visión General y Principios de Diseño
El sistema está diseñado bajo un modelo **Serverless + BaaS institucional** con frontend reactivo en React 19 / Vite y Supabase PostgreSQL / Auth como backend principal.

### Principios Fundamentales:
1. **Velocidad y Mantenibilidad:** Arquitectura modular por capas y features sin servidores Node intermedios no gestionados.
2. **Seguridad en Profundidad:** Control de acceso en la capa de datos mediante **Row Level Security (RLS)** en PostgreSQL.
3. **Protección Estricta de Secretos:** Llaves privadas de terceros (`RESEND_API_KEY`, `CLOUDFLARE_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`) nunca se exponen al cliente. Se ejecutan únicamente en **Supabase Edge Functions**.
4. **Resiliencia Operativa:** Capa de servicios desacoplada con soporte de base de datos Supabase remota y almacenamiento en memoria/local reactivo para testing y demostraciones inmediatas.

---

## 2. Diagrama de Arquitectura

```text
┌────────────────────────────────────────────────────────┐
│                        CLIENTE                         │
│  React 19 / Vite / Tailwind CSS / Shadcn / FullCalendar│
└───────────┬────────────────────────────────┬───────────┘
            │                                │
            │ HTTP / WebSocket               │ Invoke JWT
            ▼                                ▼
┌───────────────────────┐        ┌─────────────────────────┐
│     SUPABASE BAAS     │        │  SUPABASE EDGE FUNCTION │
│  - Supabase Auth      │        ├─────────────────────────┤
│  - PostgreSQL 15+     │        │ - send-defense-notif    │
│  - Row Level Security │        │ - create-media-upload   │
└───────────────────────┘        └───────────┬─────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
              ┌─────────────────┐                        ┌──────────────────┐
              │  RESEND (Email) │                        │ CLOUDFLARE IMAGES│
              │  Notificaciones │                        │ Evidencias/Fotos │
              └─────────────────┘                        └──────────────────┘
```

---

## 3. Estructura de Directorios

```text
src/
├── app/
│   ├── layouts/           # AdminLayout (sidebar, header) y PublicLayout
│   ├── providers/         # AuthProvider (RBAC, switch) y QueryProvider
│   └── router/            # React Router v7 con rutas públicas y privadas
├── components/
│   ├── shared/            # StatusBadge, ConflictCheckerAlert, ConfirmModal, PageHeader
│   └── ui/                # Button, Badge, Card, Dialog, Table, Input, Select, etc.
├── pages/
│   ├── public/            # PublicAgendaPage (calendario y listado público oficial)
│   └── private/           # Dashboard, Defenses, Agenda, Units, Facilities, Spaces, etc.
├── schemas/               # Validaciones Zod (borrador vs confirmación estricta)
├── services/              # defenses, units, facilities, spaces, persons, users, etc.
├── types/                 # Database types generados y domain models
└── lib/                   # Supabase client y formateadores de fecha/hora
```

---

## 4. Flujo de Vida de una Sustentación (`defenses`)

```text
                    ┌──────────────┐
                    │    DRAFT     │ (Datos mínimos: fecha, hora, unidad)
                    └──────┬───────┘
                           │ Confirmación (Validación completa: título,
                           │ jurados, sustentantes, espacio)
                           ▼
                    ┌──────────────┐
              ┌────►│  CONFIRMED   │◄────┐
              │     └──────┬───────┘     │
Reapertura con│            │             │ Nueva fecha/hora
autorización  │            │ Reprogramar │ confirmada
y motivo      │            ▼             │
              │     ┌──────────────┐     │
              │     │ RESCHEDULED  ├─────┘
              │     └──────┬───────┘
              │            │ Finalizar
              │            ▼
              │     ┌──────────────┐
              └─────┤  COMPLETED   │ (Acta final, observaciones y cierre)
                    └──────────────┘

Cualquier estado no finalizado ──► CANCELLED (Con motivo inmutable de auditoría)
```

---

## 5. Prevención de Conflictos de Horario
El motor en `conflictChecker.ts` valida en tiempo real:
* **Espacios Físicos:** Si otra sustentación activa ocupa el mismo espacio en un horario coincidente.
* **Jurados:** Si un miembro del jurado calificador está convocado en otra defensa simultánea.
* **Sustentantes y Asesores:** Si existe coincidencia horaria con otras defensas.
* **Configuración:** Soporta modalidad `WARNING` (alerta no bloqueante) o `BLOCKING` según directiva institucional.
