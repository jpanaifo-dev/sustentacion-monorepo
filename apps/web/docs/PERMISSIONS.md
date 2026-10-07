# Matriz de Roles y Permisos (RBAC y RLS)
**Sistema de Agenda de Sustentaciones — EPG UNAP**

---

## 1. Definición de Roles del Sistema

| Rol | Código | Alcance | Descripción |
| :--- | :--- | :--- | :--- |
| **SUPER_ADMIN** | `SUPER_ADMIN` | Global | Control absoluto del sistema, usuarios, roles, auditoría y configuraciones. |
| **Administrador** | `ADMIN` | Global | Gestión académica integral de sustentaciones, instalaciones, espacios y unidades. |
| **Gestor de Sustentaciones** | `DEFENSE_MANAGER` | Global | Creación, confirmación, reprogramación, finalización y seguimiento de defensas. |
| **Encargado de Agenda** | `AGENDA_MANAGER` | Global | Planificación horaria, asignación de aulas/auditorios y resolución de cruces. |
| **Coordinador de Unidad** | `UNIT_COORDINATOR` | Por Unidad | Gestión de sustentaciones asociadas a sus unidades académicas asignadas (`user_units`). |
| **Soporte Informático** | `IT_SUPPORT` | Global | Supervisión técnica, visualización de auditoría y soporte de usuarios. |
| **Visualizador** | `VIEWER` | Solo Lectura | Consulta de agenda institucional interna sin permisos de edición. |

---

## 2. Matriz de Permisos por Rol

| Permiso | Acción | SUPER_ADMIN | ADMIN | DEFENSE_MGR | AGENDA_MGR | UNIT_COORD | VIEWER |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `defenses.view` | Ver sustentaciones |  |  |  |  | *(Solo su unidad)* |  |
| `defenses.create` | Registrar sustentaciones |  |  |  | ❌ | *(Solo su unidad)* | ❌ |
| `defenses.update` | Modificar sustentación |  |  |  | ❌ | *(Solo su unidad)* | ❌ |
| `defenses.confirm` | Confirmar sustentación |  |  |  | ❌ | ❌ | ❌ |
| `defenses.reschedule`| Reprogramar fecha/hora/espacio |  |  |  |  | ❌ | ❌ |
| `defenses.complete` | Finalizar y registrar dictamen |  |  |  | ❌ | ❌ | ❌ |
| `defenses.reopen` | Reabrir sustentación completada |  |  | ❌ | ❌ | ❌ | ❌ |
| `defenses.cancel` | Cancelar sustentación con motivo |  |  |  | ❌ | ❌ | ❌ |
| `defense_participants.manage` | Gestionar jurados/alumnos |  |  |  | ❌ |  | ❌ |
| `calendar.view` | Ver calendario institucional |  |  |  |  |  |  |
| `calendar.manage` | Mover y programar agenda |  |  |  |  | ❌ | ❌ |
| `units.view` | Consultar unidades |  |  |  |  |  |  |
| `units.create` | Crear nuevas unidades |  |  | ❌ | ❌ | ❌ | ❌ |
| `facilities.view` | Ver instalaciones |  |  |  |  |  |  |
| `spaces.view` | Ver espacios y aforos |  |  |  |  |  |  |
| `spaces.create` | Crear aulas/auditorios |  |  | ❌ | ❌ | ❌ | ❌ |
| `attachments.upload`| Subir actas/fotos |  |  |  | ❌ | ❌ | ❌ |
| `notifications.send`| Emitir emails Resend |  |  |  |  | ❌ | ❌ |
| `audit.view` | Consultar auditoría |  | ❌ | ❌ | ❌ | ❌ | ❌ |
| `users.view` | Ver usuarios del sistema |  |  | ❌ | ❌ | ❌ | ❌ |
| `users.create` | Crear cuentas de usuario |  |  | ❌ | ❌ | ❌ | ❌ |
| `roles.manage` | Asignar roles a usuarios |  |  | ❌ | ❌ | ❌ | ❌ |

---

## 3. Funciones RLS en PostgreSQL

En [20261001000001_initial_schema.sql](file:///c:/EPG/sustentacion-agenda/supabase/migrations/20261001000001_initial_schema.sql) se implementan las funciones evaluadas directamente en las políticas RLS:

* `is_super_admin(user_uuid)`: Retorna `true` si el usuario tiene rol `SUPER_ADMIN`.
* `has_permission(permission_code, user_uuid)`: Valida la asignación en `role_permissions` y excepciones en `user_permissions`.
* `user_has_unit(unit_id, user_uuid)`: Evalúa si el usuario tiene alcance global (`ADMIN`, `DEFENSE_MANAGER`) o si pertenece a la unidad mediante `user_units`.
