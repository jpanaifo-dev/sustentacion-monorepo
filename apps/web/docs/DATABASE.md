# Modelo de Base de Datos y Diccionario de Datos
**Sistema de Agenda de Sustentaciones — EPG UNAP**

---

## 1. Convenciones y Estándares
* **Motor:** PostgreSQL 15+ (Supabase)
* **Zona Horaria:** `America/Lima` (`TIMESTAMPTZ`)
* **Identificadores:** UUID v4 (`gen_random_uuid()`)
* **Código Humano de Sustentación:** `DEF-YYYY-XXXXX` autogenerado por secuencia y trigger (`fn_generate_defense_code()`).
* **Borrado Lógico (Soft Delete):** `is_active BOOLEAN` en unidades, instalaciones, espacios y perfiles.

---

## 2. Tipos Enumerados (ENUMs)

| Enum | Valores |
| :--- | :--- |
| `role_code` | `SUPER_ADMIN`, `ADMIN`, `DEFENSE_MANAGER`, `AGENDA_MANAGER`, `UNIT_COORDINATOR`, `IT_SUPPORT`, `VIEWER` |
| `defense_status` | `DRAFT`, `CONFIRMED`, `RESCHEDULED`, `COMPLETED`, `CANCELLED` |
| `defense_modality` | `PRESENTIAL`, `VIRTUAL`, `HYBRID` |
| `space_type` | `CLASSROOM`, `AUDITORIUM`, `DEGREE_ROOM`, `MEETING_ROOM`, `OTHER` |
| `participant_type` | `STUDENT`, `JUROR`, `ADVISOR` |
| `juror_role` | `PRESIDENT`, `SECRETARY`, `MEMBER`, `OTHER` |
| `notification_status` | `PENDING`, `SENT`, `FAILED` |

---

## 3. Tablas Principales

### `profiles` (Usuarios del Sistema)
Extiende la autenticación de Supabase (`auth.users`).
* `id` UUID PK (FK `auth.users(id) ON DELETE CASCADE`)
* `first_name`, `last_name`, `email` (UNIQUE)
* `phone`, `document_number`, `avatar_url`
* `is_active` BOOLEAN DEFAULT true

### `units` (Unidades Académicas de Posgrado)
* `id` UUID PK
* `name`, `code` (UNIQUE, ej. 'UPG-CI'), `acronym`
* `institutional_email`, `phone`, `description`
* `is_active` BOOLEAN DEFAULT true

### `facilities` y `spaces` (Infraestructura Física)
* `facilities`: `id`, `name`, `description`, `address`, `reference`, `is_active`
* `spaces`: `id`, `facility_id` FK, `name`, `type` (`space_type`), `capacity`, `floor`, `location_reference`, `description`, `is_active`

### `persons` (Directorio de Personas)
Entidad reutilizable para quienes participan en sustentaciones sin requerir cuenta de acceso.
* `id`, `first_name`, `last_name`, `email`, `phone`, `document_number`

### `defenses` (Sustentaciones)
Entidad central del sistema.
* `id` UUID PK
* `code` TEXT UNIQUE (ej. `DEF-2026-00001`)
* `unit_id` UUID FK `units(id)`
* `title` TEXT NOT NULL
* `status` `defense_status` DEFAULT 'DRAFT'
* `modality` `defense_modality` DEFAULT 'PRESENTIAL'
* `scheduled_date` DATE, `start_time` TIME, `estimated_end_time` TIME
* `estimated_duration_minutes` INT DEFAULT 120
* `facility_id`, `space_id` UUID FK nullable
* `virtual_platform`, `virtual_url` TEXT nullable
* `observations`, `internal_notes` TEXT nullable
* `completed_at`, `completed_by`, `actual_end_time`, `final_observations`
* `cancelled_at`, `cancelled_by`, `cancellation_reason`
* `created_by`, `updated_by`, `created_at`, `updated_at`

### `defense_participants` (Participación N:N)
* `id` UUID PK
* `defense_id` UUID FK `defenses(id) ON DELETE CASCADE`
* `person_id` UUID FK `persons(id)`
* `participant_type` (`STUDENT`, `JUROR`, `ADVISOR`)
* `role` (`juror_role`: `PRESIDENT`, `SECRETARY`, `MEMBER`, etc.)
* `is_primary` BOOLEAN DEFAULT false

### `defense_reschedules` (Trazabilidad de Reprogramaciones)
* `id`, `defense_id` FK
* `previous_date`, `previous_start_time`, `previous_space_id`
* `new_date`, `new_start_time`, `new_space_id`
* `reason` TEXT NOT NULL, `created_by` FK, `created_at`

### `defense_status_history`
Registro automático de transiciones de estado disparado por el trigger `tr_defenses_status_history`.

### `media` (Cloudflare Assets)
Polimórfica: almacena imágenes de espacios, instalaciones y actas/evidencias.
* `id`, `entity_type` ('facility', 'space', 'defense_evidence'), `entity_id` UUID
* `provider` ('cloudflare'), `provider_asset_id`, `url`, `mime_type`, `file_size`

### `audit_logs` (Auditoría Inmutable)
* `id`, `user_id`, `action`, `entity_type`, `entity_id`, `old_values` JSONB, `new_values` JSONB, `metadata` JSONB, `ip_address`, `user_agent`, `created_at`
