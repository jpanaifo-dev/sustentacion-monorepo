-- Migration 20261001000001: Initial Schema for Sistema de Agenda de Sustentaciones EPG - UNAP
-- Timezone: America/Lima

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================
DO $$ BEGIN
  CREATE TYPE role_code AS ENUM (
    'SUPER_ADMIN',
    'ADMIN',
    'DEFENSE_MANAGER',
    'AGENDA_MANAGER',
    'UNIT_COORDINATOR',
    'IT_SUPPORT',
    'VIEWER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE space_type AS ENUM (
    'CLASSROOM',
    'AUDITORIUM',
    'DEGREE_ROOM',
    'MEETING_ROOM',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE defense_status AS ENUM (
    'DRAFT',
    'CONFIRMED',
    'RESCHEDULED',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE defense_modality AS ENUM (
    'PRESENTIAL',
    'VIRTUAL',
    'HYBRID'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE participant_type AS ENUM (
    'STUDENT',
    'JUROR',
    'ADVISOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE juror_role AS ENUM (
    'PRESIDENT',
    'SECRETARY',
    'MEMBER',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM (
    'PENDING',
    'SENT',
    'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for human-readable defense code: DEF-YYYY-XXXXX
CREATE SEQUENCE IF NOT EXISTS defense_code_seq START 1;

CREATE OR REPLACE FUNCTION fn_generate_defense_code()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  seq_num TEXT;
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    current_year := TO_CHAR(NOW(), 'YYYY');
    seq_num := LPAD(nextval('defense_code_seq')::TEXT, 5, '0');
    NEW.code := 'DEF-' || current_year || '-' || seq_num;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  document_number TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. ROLES
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code role_code NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PERMISSIONS
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. USER_ROLES (N:N users <-> roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- 5. ROLE_PERMISSIONS (N:N roles <-> permissions)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 6. USER_PERMISSIONS (Custom exceptions per user)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  is_granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_id)
);

-- 7. ACADEMIC UNITS
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  acronym TEXT,
  description TEXT,
  institutional_email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. USER_UNITS (N:N users <-> academic units)
CREATE TABLE IF NOT EXISTS public.user_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

-- 9. FACILITIES
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  reference TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 10. SPACES (Rooms / Auditoriums / etc. inside a facility)
CREATE TABLE IF NOT EXISTS public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  type space_type NOT NULL DEFAULT 'CLASSROOM',
  capacity INTEGER DEFAULT 30,
  floor TEXT,
  location_reference TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_spaces_updated_at
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 11. MEDIA (Polymorphic media table for Facilities, Spaces, Defense Evidence)
CREATE TABLE IF NOT EXISTS public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'facility', 'space', 'defense_evidence'
  entity_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'cloudflare',
  provider_asset_id TEXT,
  url TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PERSONS (Students, Jurors, Advisors who might not have user accounts)
CREATE TABLE IF NOT EXISTS public.persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_persons_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 13. DEFENSES (Sustentaciones)
CREATE TABLE IF NOT EXISTS public.defenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  status defense_status NOT NULL DEFAULT 'DRAFT',
  modality defense_modality NOT NULL DEFAULT 'PRESENTIAL',
  scheduled_date DATE NOT NULL,
  start_time TIME NOT NULL,
  estimated_end_time TIME NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 120,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  virtual_platform TEXT,
  virtual_url TEXT,
  observations TEXT,
  internal_notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actual_end_time TIME,
  final_observations TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tr_defenses_code
  BEFORE INSERT ON public.defenses
  FOR EACH ROW EXECUTE FUNCTION fn_generate_defense_code();

CREATE TRIGGER tr_defenses_updated_at
  BEFORE UPDATE ON public.defenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 14. DEFENSE_PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.defense_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defense_id UUID NOT NULL REFERENCES public.defenses(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE RESTRICT,
  participant_type participant_type NOT NULL,
  role juror_role,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. DEFENSE_RESCHEDULES
CREATE TABLE IF NOT EXISTS public.defense_reschedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defense_id UUID NOT NULL REFERENCES public.defenses(id) ON DELETE CASCADE,
  previous_date DATE NOT NULL,
  previous_start_time TIME NOT NULL,
  previous_estimated_end_time TIME NOT NULL,
  previous_facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  previous_space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  new_date DATE NOT NULL,
  new_start_time TIME NOT NULL,
  new_estimated_end_time TIME NOT NULL,
  new_facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  new_space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. DEFENSE_STATUS_HISTORY
CREATE TABLE IF NOT EXISTS public.defense_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defense_id UUID NOT NULL REFERENCES public.defenses(id) ON DELETE CASCADE,
  previous_status defense_status,
  new_status defense_status NOT NULL,
  reason TEXT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  defense_id UUID REFERENCES public.defenses(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'CONFIRMATION', 'RESCHEDULE', 'CANCELLATION'
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'PENDING',
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18. AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. SYSTEM_SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_defenses_status ON public.defenses(status);
CREATE INDEX IF NOT EXISTS idx_defenses_unit_id ON public.defenses(unit_id);
CREATE INDEX IF NOT EXISTS idx_defenses_scheduled_date ON public.defenses(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_defenses_space_id ON public.defenses(space_id);
CREATE INDEX IF NOT EXISTS idx_defense_participants_defense_id ON public.defense_participants(defense_id);
CREATE INDEX IF NOT EXISTS idx_defense_participants_person_id ON public.defense_participants(person_id);
CREATE INDEX IF NOT EXISTS idx_user_units_user_id ON public.user_units(user_id);
CREATE INDEX IF NOT EXISTS idx_user_units_unit_id ON public.user_units(unit_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_entity ON public.media(entity_type, entity_id);

-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
      AND r.code = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_role_codes(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT[] AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN ARRAY[]::TEXT[];
  END IF;

  RETURN ARRAY(
    SELECT r.code::TEXT
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.has_permission(permission_code TEXT, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Super admin has all permissions
  IF public.is_super_admin(user_uuid) THEN
    RETURN TRUE;
  END IF;

  -- Check explicit user_permission override first
  IF EXISTS (
    SELECT 1
    FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = user_uuid AND p.code = permission_code
  ) THEN
    RETURN (
      SELECT up.is_granted
      FROM public.user_permissions up
      JOIN public.permissions p ON up.permission_id = p.id
      WHERE up.user_id = user_uuid AND p.code = permission_code
      LIMIT 1
    );
  END IF;

  -- Check roles permissions
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid
      AND p.code = permission_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_has_unit(check_unit_id UUID, user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Super admin has access to all units
  IF public.is_super_admin(user_uuid) THEN
    RETURN TRUE;
  END IF;

  -- Global role check (ADMIN or DEFENSE_MANAGER without unit restriction)
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
      AND r.code IN ('ADMIN', 'DEFENSE_MANAGER', 'AGENDA_MANAGER', 'VIEWER')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Unit coordinator or unit restricted users
  RETURN EXISTS (
    SELECT 1
    FROM public.user_units uu
    WHERE uu.user_id = user_uuid
      AND uu.unit_id = check_unit_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Trigger to track defense status changes automatically
CREATE OR REPLACE FUNCTION fn_track_defense_status()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.defense_status_history (
      defense_id,
      previous_status,
      new_status,
      reason,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.cancellation_reason, NEW.observations),
      COALESCE(NEW.updated_by, auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_defenses_status_history
  AFTER UPDATE OF status ON public.defenses
  FOR EACH ROW EXECUTE FUNCTION fn_track_defense_status();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defense_reschedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defense_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES RLS
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_super_admin() OR public.has_permission('users.update'));

CREATE POLICY "Users can create profiles if admin"
  ON public.profiles FOR INSERT TO authenticated
  USING (public.is_super_admin() OR public.has_permission('users.create') OR id = auth.uid());

-- 2. ROLES & PERMISSIONS RLS
CREATE POLICY "Roles are viewable by authenticated users"
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permissions viewable by authenticated users"
  ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "User roles viewable by authenticated users"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "User roles manageable by super_admin or roles.manage"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_permission('roles.manage'));

CREATE POLICY "Role permissions viewable by authenticated users"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Role permissions manageable by super_admin"
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "User permissions viewable by authenticated users"
  ON public.user_permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "User permissions manageable by super_admin"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.is_super_admin());

-- 3. UNITS RLS
CREATE POLICY "Units are public viewable if active"
  ON public.units FOR SELECT TO anon, authenticated
  USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Units manageable by authorized users"
  ON public.units FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_permission('units.create') OR public.has_permission('units.update'));

CREATE POLICY "User units viewable by authenticated"
  ON public.user_units FOR SELECT TO authenticated USING (true);

CREATE POLICY "User units manageable by super admin or units managers"
  ON public.user_units FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_permission('units.update'));

-- 4. FACILITIES & SPACES RLS
CREATE POLICY "Facilities public viewable if active"
  ON public.facilities FOR SELECT TO anon, authenticated
  USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Facilities manageable by authorized users"
  ON public.facilities FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_permission('facilities.create') OR public.has_permission('facilities.update'));

CREATE POLICY "Spaces public viewable if active"
  ON public.spaces FOR SELECT TO anon, authenticated
  USING (is_active = true OR auth.role() = 'authenticated');

CREATE POLICY "Spaces manageable by authorized users"
  ON public.spaces FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_permission('spaces.create') OR public.has_permission('spaces.update'));

-- 5. MEDIA RLS
CREATE POLICY "Media is viewable by all"
  ON public.media FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Media upload by authenticated users with upload permission"
  ON public.media FOR INSERT TO authenticated
  USING (public.is_super_admin() OR public.has_permission('attachments.upload'));

CREATE POLICY "Media delete by authorized users"
  ON public.media FOR DELETE TO authenticated
  USING (public.is_super_admin() OR public.has_permission('attachments.delete'));

-- 6. PERSONS RLS
CREATE POLICY "Persons viewable by authenticated users"
  ON public.persons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Persons manageable by authenticated users with defenses/participants permissions"
  ON public.persons FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_permission('defenses.create') OR public.has_permission('defenses.update') OR public.has_permission('defense_participants.manage'));

-- 7. DEFENSES RLS
-- Public portal can view CONFIRMED, RESCHEDULED, and COMPLETED defenses (never DRAFT or CANCELLED)
CREATE POLICY "Defenses public view policy"
  ON public.defenses FOR SELECT TO anon
  USING (status IN ('CONFIRMED', 'RESCHEDULED', 'COMPLETED'));

-- Authenticated users view based on permission and unit scope
CREATE POLICY "Defenses authenticated view policy"
  ON public.defenses FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR public.has_permission('defenses.view')
    AND public.user_has_unit(unit_id)
  );

CREATE POLICY "Defenses insert policy"
  ON public.defenses FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (public.has_permission('defenses.create') AND public.user_has_unit(unit_id))
  );

CREATE POLICY "Defenses update policy"
  ON public.defenses FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (public.has_permission('defenses.update') AND public.user_has_unit(unit_id))
  );

-- 8. DEFENSE PARTICIPANTS RLS
CREATE POLICY "Participants public viewable for public defenses"
  ON public.defense_participants FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.defenses d
      WHERE d.id = defense_id AND d.status IN ('CONFIRMED', 'RESCHEDULED', 'COMPLETED')
    )
  );

CREATE POLICY "Participants authenticated view policy"
  ON public.defense_participants FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Participants manage policy"
  ON public.defense_participants FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_permission('defense_participants.manage') OR public.has_permission('defenses.update'));

-- 9. DEFENSE RESCHEDULES RLS
CREATE POLICY "Reschedules public view for public defenses"
  ON public.defense_reschedules FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.defenses d
      WHERE d.id = defense_id AND d.status IN ('CONFIRMED', 'RESCHEDULED', 'COMPLETED')
    )
  );

CREATE POLICY "Reschedules view for authenticated"
  ON public.defense_reschedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Reschedules insert policy"
  ON public.defense_reschedules FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.has_permission('defenses.reschedule'));

-- 10. DEFENSE STATUS HISTORY RLS
CREATE POLICY "Status history view for authenticated"
  ON public.defense_status_history FOR SELECT TO authenticated USING (true);

-- 11. NOTIFICATIONS RLS
CREATE POLICY "Notifications view for authenticated"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.has_permission('notifications.send'));

CREATE POLICY "Notifications insert for authenticated"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR public.has_permission('notifications.send'));

-- 12. AUDIT LOGS RLS
CREATE POLICY "Audit logs viewable only by super admin or audit.view"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_super_admin() OR public.has_permission('audit.view'));

CREATE POLICY "Audit logs insert by authenticated"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- 13. SYSTEM SETTINGS RLS
CREATE POLICY "Settings viewable by all authenticated"
  ON public.system_settings FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Settings manageable by super admin"
  ON public.system_settings FOR ALL TO authenticated
  USING (public.is_super_admin());
