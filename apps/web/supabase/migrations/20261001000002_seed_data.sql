-- Migration 20261001000002: Seed Data, Permissions, Roles & Auth Triggers
-- Sistema de Agenda de Sustentaciones EPG - UNAP

-- ============================================================================
-- 1. INSERT INITIAL PERMISSIONS
-- ============================================================================
INSERT INTO public.permissions (code, name, module, description) VALUES
  -- Users
  ('users.view', 'Ver usuarios', 'users', 'Permite consultar el listado y detalle de usuarios'),
  ('users.create', 'Crear usuarios', 'users', 'Permite registrar nuevos usuarios en el sistema'),
  ('users.update', 'Editar usuarios', 'users', 'Permite modificar datos de usuarios'),
  ('users.disable', 'Desactivar usuarios', 'users', 'Permite deshabilitar o habilitar acceso de usuarios'),

  -- Roles & Permissions
  ('roles.view', 'Ver roles', 'roles', 'Permite consultar roles y asignaciones'),
  ('roles.manage', 'Gestionar roles', 'roles', 'Permite asignar o revocar roles a usuarios'),
  ('permissions.view', 'Ver permisos', 'permissions', 'Permite consultar permisos del sistema'),
  ('permissions.manage', 'Gestionar permisos', 'permissions', 'Permite modificar matriz de permisos'),

  -- Units
  ('units.view', 'Ver unidades académicas', 'units', 'Permite listar y ver información de unidades'),
  ('units.create', 'Crear unidades', 'units', 'Permite registrar nuevas unidades académicas'),
  ('units.update', 'Editar unidades', 'units', 'Permite modificar unidades académicas'),
  ('units.disable', 'Desactivar unidades', 'units', 'Permite desactivar unidades académicas'),

  -- Facilities & Spaces
  ('facilities.view', 'Ver instalaciones', 'facilities', 'Permite consultar sedes e instalaciones'),
  ('facilities.create', 'Crear instalaciones', 'facilities', 'Permite registrar nuevas instalaciones'),
  ('facilities.update', 'Editar instalaciones', 'facilities', 'Permite actualizar datos de instalaciones'),
  ('spaces.view', 'Ver espacios', 'spaces', 'Permite consultar aulas, auditorios y salas'),
  ('spaces.create', 'Crear espacios', 'spaces', 'Permite registrar nuevos espacios físicos'),
  ('spaces.update', 'Editar espacios', 'spaces', 'Permite actualizar datos de espacios'),

  -- Defenses (Sustentaciones)
  ('defenses.view', 'Ver sustentaciones', 'defenses', 'Permite consultar agenda y listado de sustentaciones'),
  ('defenses.create', 'Crear sustentaciones', 'defenses', 'Permite registrar sustentaciones en borrador o programar'),
  ('defenses.update', 'Editar sustentaciones', 'defenses', 'Permite actualizar datos de sustentaciones'),
  ('defenses.confirm', 'Confirmar sustentaciones', 'defenses', 'Permite validar requisitos y confirmar sustentaciones'),
  ('defenses.reschedule', 'Reprogramar sustentaciones', 'defenses', 'Permite cambiar fecha, hora o espacio de sustentaciones confirmadas'),
  ('defenses.cancel', 'Cancelar sustentaciones', 'defenses', 'Permite cancelar sustentaciones con motivo'),
  ('defenses.complete', 'Finalizar sustentaciones', 'defenses', 'Permite marcar sustentaciones como completadas'),
  ('defenses.reopen', 'Reabrir sustentaciones', 'defenses', 'Permite reabrir sustentaciones finalizadas para correcciones'),
  ('defense_participants.manage', 'Gestionar participantes', 'defenses', 'Permite asignar sustentantes, jurados y asesores'),

  -- Calendar
  ('calendar.view', 'Ver calendario institucional', 'calendar', 'Permite ver el calendario en vista mes, semana, día y lista'),
  ('calendar.manage', 'Gestionar calendario', 'calendar', 'Permite coordinar y mover eventos en calendario'),

  -- Attachments / Media
  ('attachments.view', 'Ver evidencias/archivos', 'attachments', 'Permite consultar actas, fotos y evidencias'),
  ('attachments.upload', 'Cargar evidencias/archivos', 'attachments', 'Permite subir imágenes o documentos'),
  ('attachments.delete', 'Eliminar evidencias/archivos', 'attachments', 'Permite eliminar archivos multimedia'),

  -- Notifications
  ('notifications.send', 'Enviar notificaciones', 'notifications', 'Permite emitir correos de confirmación y reprogramación'),

  -- Audit & Reports
  ('audit.view', 'Consultar auditoría', 'audit', 'Permite visualizar la trazabilidad de acciones del sistema'),
  ('reports.view', 'Ver reportes', 'reports', 'Permite visualizar estadísticas e indicadores'),
  ('reports.export', 'Exportar reportes', 'reports', 'Permite exportar datos a Excel / PDF')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 2. INSERT SYSTEM ROLES
-- ============================================================================
INSERT INTO public.roles (code, name, description, is_system) VALUES
  ('SUPER_ADMIN', 'SUPER_ADMIN', 'Acceso irrestricto y global a todos los módulos y configuraciones del sistema', true),
  ('ADMIN', 'Administrador', 'Gestión integral académica, instalaciones, usuarios y sustentaciones', true),
  ('DEFENSE_MANAGER', 'Gestor de sustentaciones', 'Creación, confirmación, reprogramación y seguimiento de sustentaciones', true),
  ('AGENDA_MANAGER', 'Encargado de agenda', 'Planificación de horarios, asignación de espacios y resolución de cruces', true),
  ('UNIT_COORDINATOR', 'Coordinador de unidad', 'Gestión de sustentaciones exclusivamente asociadas a su unidad académica', true),
  ('IT_SUPPORT', 'Soporte informático', 'Supervisión de auditoría, usuarios y estado de integraciones', true),
  ('VIEWER', 'Visualizador', 'Acceso de solo lectura a la agenda institucional y sustentaciones', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 3. ASSIGN PERMISSIONS TO ROLES
-- ============================================================================
DO $$
DECLARE
  v_role_super_admin UUID;
  v_role_admin UUID;
  v_role_defense_mgr UUID;
  v_role_agenda_mgr UUID;
  v_role_unit_coord UUID;
  v_role_it_support UUID;
  v_role_viewer UUID;
BEGIN
  SELECT id INTO v_role_super_admin FROM public.roles WHERE code = 'SUPER_ADMIN';
  SELECT id INTO v_role_admin FROM public.roles WHERE code = 'ADMIN';
  SELECT id INTO v_role_defense_mgr FROM public.roles WHERE code = 'DEFENSE_MANAGER';
  SELECT id INTO v_role_agenda_mgr FROM public.roles WHERE code = 'AGENDA_MANAGER';
  SELECT id INTO v_role_unit_coord FROM public.roles WHERE code = 'UNIT_COORDINATOR';
  SELECT id INTO v_role_it_support FROM public.roles WHERE code = 'IT_SUPPORT';
  SELECT id INTO v_role_viewer FROM public.roles WHERE code = 'VIEWER';

  -- SUPER_ADMIN gets ALL permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_super_admin, id FROM public.permissions
  ON CONFLICT DO NOTHING;

  -- ADMIN permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_admin, id FROM public.permissions
  WHERE code NOT IN ('permissions.manage')
  ON CONFLICT DO NOTHING;

  -- DEFENSE_MANAGER permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_defense_mgr, id FROM public.permissions
  WHERE code IN (
    'defenses.view', 'defenses.create', 'defenses.update', 'defenses.confirm',
    'defenses.reschedule', 'defenses.cancel', 'defenses.complete',
    'defense_participants.manage', 'calendar.view', 'calendar.manage',
    'units.view', 'facilities.view', 'spaces.view', 'attachments.view',
    'attachments.upload', 'notifications.send', 'reports.view'
  )
  ON CONFLICT DO NOTHING;

  -- AGENDA_MANAGER permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_agenda_mgr, id FROM public.permissions
  WHERE code IN (
    'defenses.view', 'defenses.reschedule', 'calendar.view', 'calendar.manage',
    'facilities.view', 'spaces.view', 'units.view', 'notifications.send'
  )
  ON CONFLICT DO NOTHING;

  -- UNIT_COORDINATOR permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_unit_coord, id FROM public.permissions
  WHERE code IN (
    'defenses.view', 'defenses.create', 'defenses.update', 'defense_participants.manage',
    'calendar.view', 'units.view', 'facilities.view', 'spaces.view'
  )
  ON CONFLICT DO NOTHING;

  -- IT_SUPPORT permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_it_support, id FROM public.permissions
  WHERE code IN (
    'users.view', 'roles.view', 'permissions.view', 'audit.view', 'reports.view',
    'facilities.view', 'spaces.view', 'defenses.view', 'calendar.view'
  )
  ON CONFLICT DO NOTHING;

  -- VIEWER permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT v_role_viewer, id FROM public.permissions
  WHERE code IN ('defenses.view', 'calendar.view', 'units.view', 'facilities.view', 'spaces.view')
  ON CONFLICT DO NOTHING;
END $$;

-- ============================================================================
-- 4. SYSTEM SETTINGS
-- ============================================================================
INSERT INTO public.system_settings (key, value, description) VALUES
  ('default_defense_duration_minutes', '120', 'Duración estimada predeterminada en minutos para cada sustentación'),
  ('public_show_jurors', 'true', 'Permite visualizar jurados en el portal público'),
  ('public_show_completed', 'true', 'Muestra sustentaciones completadas en el historial público'),
  ('institution_name', '"Escuela de Postgrado UNAP"', 'Nombre oficial de la institución'),
  ('conflict_rule_space', '"WARNING"', 'Regla ante cruce de espacio: WARNING o BLOCKING'),
  ('conflict_rule_juror', '"WARNING"', 'Regla ante cruce de jurado: WARNING o BLOCKING')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- 5. AUTH TRIGGER TO CREATE PROFILE AUTOMATICALLY
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_super_admin_role_id UUID;
  v_viewer_role_id UUID;
  v_user_count INT;
BEGIN
  v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1));
  v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', 'UNAP');

  INSERT INTO public.profiles (id, first_name, last_name, email, is_active)
  VALUES (NEW.id, v_first_name, v_last_name, NEW.email, true)
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email;

  -- Check if this is the very first user in the system: grant SUPER_ADMIN automatically
  SELECT count(*) INTO v_user_count FROM public.user_roles;
  IF v_user_count = 0 THEN
    SELECT id INTO v_super_admin_role_id FROM public.roles WHERE code = 'SUPER_ADMIN';
    IF v_super_admin_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (NEW.id, v_super_admin_role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    -- Default role for subsequent users: VIEWER unless invited/assigned
    SELECT id INTO v_viewer_role_id FROM public.roles WHERE code = 'VIEWER';
    IF v_viewer_role_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role_id)
      VALUES (NEW.id, v_viewer_role_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 6. SEED INSTITUTIONAL DATA (UNITS, FACILITIES, SPACES, PERSONS, DEFENSES)
-- ============================================================================

-- Units
INSERT INTO public.units (id, name, code, acronym, description, institutional_email, phone, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Unidad de Posgrado de Ciencias e Ingeniería', 'UPG-CI', 'UPG-CI', 'Maestrías y Doctorados en Ciencias Exactas e Ingeniería', 'posgrado.ci@unapiquitos.edu.pe', '+51 065 241512', true),
  ('22222222-2222-2222-2222-222222222222', 'Unidad de Posgrado de Ciencias de la Salud', 'UPG-CS', 'UPG-CS', 'Maestrías y Doctorados en Salud Pública y Medicina Tropical', 'posgrado.salud@unapiquitos.edu.pe', '+51 065 241513', true),
  ('33333333-3333-3333-3333-333333333333', 'Unidad de Posgrado de Ciencias de la Educación', 'UPG-ED', 'UPG-ED', 'Maestrías en Docencia Universitaria e Investigación Educativa', 'posgrado.educacion@unapiquitos.edu.pe', '+51 065 241514', true)
ON CONFLICT (code) DO NOTHING;

-- Facility
INSERT INTO public.facilities (id, name, description, address, reference, is_active)
VALUES
  ('44444444-4444-4444-4444-444444444444', 'Escuela de Postgrado UNAP - Sede Central', 'Sede principal de la Escuela de Postgrado de la Universidad Nacional de la Amazonía Peruana', 'Calle Los Lirios 125, San Juan Bautista, Iquitos, Loreto', 'Frente a la Plaza Abelardo Quiñones', true)
ON CONFLICT DO NOTHING;

-- Spaces
INSERT INTO public.spaces (id, facility_id, name, type, capacity, floor, location_reference, description, is_active)
VALUES
  ('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444444', 'Sala de Grados y Títulos A', 'DEGREE_ROOM', 40, 'Piso 2', 'Ala Norte - Pabellón Administrativo', 'Equipada con sistema de audio, proyector láser y transmisión híbrida', true),
  ('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444444', 'Auditorio Principal EPG', 'AUDITORIUM', 120, 'Piso 1', 'Ingreso Principal', 'Auditorio institucional para sustentaciones magnas y conferencias', true),
  ('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444444', 'Aula Multimedia 204', 'CLASSROOM', 30, 'Piso 2', 'Pabellón Académico', 'Aula habilitada para sustentaciones de maestría con conectividad LAN de alta velocidad', true)
ON CONFLICT DO NOTHING;

-- Persons (Students, Jurors, Advisors)
INSERT INTO public.persons (id, first_name, last_name, email, phone, document_number)
VALUES
  ('66666666-6666-6666-6666-666666666601', 'Carlos Alberto', 'Mendoza Ríos', 'cmendoza_est@unapiquitos.edu.pe', '965123401', '72341201'),
  ('66666666-6666-6666-6666-666666666602', 'Lucía Fiorella', 'Panduro Vásquez', 'lpanduro_est@unapiquitos.edu.pe', '965123402', '72341202'),
  ('66666666-6666-6666-6666-666666666603', 'Dr. Walter', 'Ramos García', 'wramos@unapiquitos.edu.pe', '965123403', '05341203'),
  ('66666666-6666-6666-6666-666666666604', 'Dra. Carmen Rosa', 'Gómez Dávila', 'cgomez@unapiquitos.edu.pe', '965123404', '05341204'),
  ('66666666-6666-6666-6666-666666666605', 'Mg. Jorge Luis', 'Silva Pinedo', 'jsilva@unapiquitos.edu.pe', '965123405', '05341205'),
  ('66666666-6666-6666-6666-666666666606', 'Dra. Betty Elvira', 'Sánchez Torres', 'bsanchez@unapiquitos.edu.pe', '965123406', '05341206'),
  ('66666666-6666-6666-6666-666666666607', 'Dr. Manuel', 'Chávez López', 'mchavez@unapiquitos.edu.pe', '965123407', '05341207'),
  ('66666666-6666-6666-6666-666666666608', 'Edwin Fernando', 'Tello Reátegui', 'etello_est@unapiquitos.edu.pe', '965123408', '72341208'),
  ('66666666-6666-6666-6666-666666666609', 'Ana María', 'Flores Arévalo', 'aflores_est@unapiquitos.edu.pe', '965123409', '72341209'),
  ('66666666-6666-6666-6666-666666666610', 'Dr. Segundo Pedro', 'Pinedo Vela', 'spinedo@unapiquitos.edu.pe', '965123410', '05341210')
ON CONFLICT DO NOTHING;

-- Defenses
INSERT INTO public.defenses (
  id, code, unit_id, title, status, modality,
  scheduled_date, start_time, estimated_end_time, estimated_duration_minutes,
  facility_id, space_id, observations, internal_notes
) VALUES
  -- 1. CONFIRMED Defense
  (
    '77777777-7777-7777-7777-777777777701',
    'DEF-2026-00001',
    '11111111-1111-1111-1111-111111111111',
    'Optimización de Modelos de Inteligencia Artificial para el Monitoreo Hidrológico de la Cuenca del Río Amazonas',
    'CONFIRMED',
    'PRESENTIAL',
    CURRENT_DATE + INTERVAL '2 days',
    '10:00:00',
    '12:00:00',
    120,
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555501',
    'Se requiere proyector y puntero láser.',
    'Expediente de grado conforme con resolución decanal.'
  ),
  -- 2. CONFIRMED Hybrid Defense
  (
    '77777777-7777-7777-7777-777777777702',
    'DEF-2026-00002',
    '22222222-2222-2222-2222-222222222222',
    'Prevalencia de Enfermedades Zoonóticas Emergentes en Poblaciones Rurales de Loreto 2024-2025',
    'CONFIRMED',
    'HYBRID',
    CURRENT_DATE + INTERVAL '4 days',
    '15:00:00',
    '17:00:00',
    120,
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555502',
    'Transmisión vía Google Meet para jurado externo internacional.',
    'Jurado externo confirmado desde Manaos.'
  ),
  -- 3. RESCHEDULED Defense
  (
    '77777777-7777-7777-7777-777777777703',
    'DEF-2026-00003',
    '33333333-3333-3333-3333-333333333333',
    'Impacto de las Tecnologías Digitales en la Enseñanza de Lenguas Originarias en Comunidades Bilingües',
    'RESCHEDULED',
    'PRESENTIAL',
    CURRENT_DATE + INTERVAL '6 days',
    '09:00:00',
    '11:00:00',
    120,
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555503',
    'Reprogramada a solicitud del presidente de jurado por comisión oficial.',
    'Se notificó a los sustentantes y jurado.'
  ),
  -- 4. DRAFT Defense
  (
    '77777777-7777-7777-7777-777777777704',
    'DEF-2026-00004',
    '11111111-1111-1111-1111-111111111111',
    'Evaluación Biogeoquímica de Suelos Inundables en la Reserva Nacional Pacaya Samiria',
    'DRAFT',
    'PRESENTIAL',
    CURRENT_DATE + INTERVAL '10 days',
    '11:00:00',
    '13:00:00',
    120,
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555501',
    'Pendiente confirmación de jurado secretario.',
    'Borrador registrado por el coordinador de posgrado.'
  ),
  -- 5. COMPLETED Defense
  (
    '77777777-7777-7777-7777-777777777705',
    'DEF-2026-00005',
    '22222222-2222-2222-2222-222222222222',
    'Factores Epidemiológicos Asociados al Dengue Grave en el Hospital Regional de Loreto',
    'COMPLETED',
    'PRESENTIAL',
    CURRENT_DATE - INTERVAL '3 days',
    '09:00:00',
    '11:00:00',
    120,
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555501',
    'Sustentación aprobada por unanimidad con mención sobresaliente.',
    'Acta N° 045-2026-EPG firmada y archivada.'
  )
ON CONFLICT (code) DO NOTHING;

-- Participants for DEF-2026-00001
INSERT INTO public.defense_participants (defense_id, person_id, participant_type, role, is_primary)
VALUES
  ('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666601', 'STUDENT', NULL, true),
  ('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666603', 'JUROR', 'PRESIDENT', false),
  ('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666604', 'JUROR', 'SECRETARY', false),
  ('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666605', 'JUROR', 'MEMBER', false),
  ('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666607', 'ADVISOR', NULL, true)
ON CONFLICT DO NOTHING;

-- Participants for DEF-2026-00002
INSERT INTO public.defense_participants (defense_id, person_id, participant_type, role, is_primary)
VALUES
  ('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666602', 'STUDENT', NULL, true),
  ('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666606', 'JUROR', 'PRESIDENT', false),
  ('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666604', 'JUROR', 'SECRETARY', false),
  ('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666607', 'JUROR', 'MEMBER', false),
  ('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666610', 'ADVISOR', NULL, true)
ON CONFLICT DO NOTHING;

-- Audit log sample entry
INSERT INTO public.audit_logs (action, entity_type, entity_id, new_values, metadata)
VALUES
  ('SYSTEM_INITIALIZED', 'system', '44444444-4444-4444-4444-444444444444', '{"status":"ready"}'::jsonb, '{"description":"Sistema inicializado con configuración base EPG-UNAP"}'::jsonb);
