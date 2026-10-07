import {
  Database,
  DefenseModality,
  DefenseStatus,
  JurorRole,
  ParticipantType,
  RoleCode,
  SpaceType,
} from './database.types';

export * from './database.types';

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Role = Database['public']['Tables']['roles']['Row'];
export type Permission = Database['public']['Tables']['permissions']['Row'];
export type Unit = Database['public']['Tables']['units']['Row'];
export type Facility = Database['public']['Tables']['facilities']['Row'];
export type Space = Database['public']['Tables']['spaces']['Row'];
export type Person = Database['public']['Tables']['persons']['Row'];
export type Defense = Database['public']['Tables']['defenses']['Row'];
export type DefenseParticipant = Database['public']['Tables']['defense_participants']['Row'];
export type DefenseReschedule = Database['public']['Tables']['defense_reschedules']['Row'];
export type DefenseStatusHistory = Database['public']['Tables']['defense_status_history']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type Media = Database['public']['Tables']['media']['Row'];
export type SystemSetting = Database['public']['Tables']['system_settings']['Row'];

// Enriched Domain Types
export interface CurrentUser {
  profile: Profile;
  roles: RoleCode[];
  permissions: string[];
  units: string[]; // unit IDs
  isSuperAdmin: boolean;
}

export interface DefenseParticipantWithPerson extends DefenseParticipant {
  person: Person;
}

export interface DefenseWithRelations extends Defense {
  unit?: Unit | null;
  facility?: Facility | null;
  space?: Space | null;
  participants?: DefenseParticipantWithPerson[];
  reschedules?: DefenseReschedule[];
  media?: Media[];
}

export interface SpaceWithFacility extends Space {
  facility?: Facility | null;
  images?: Media[];
}

export interface FacilityWithSpaces extends Facility {
  spaces?: Space[];
  images?: Media[];
}

export interface UserWithDetails extends Profile {
  roles: Role[];
  units: Unit[];
}

// Conflict Warning / Blocking Detection
export type ConflictSeverity = 'WARNING' | 'BLOCKING';

export interface ScheduleConflict {
  type: 'SPACE' | 'JUROR' | 'STUDENT' | 'ADVISOR';
  severity: ConflictSeverity;
  conflictingDefenseId: string;
  conflictingDefenseCode: string;
  conflictingDefenseTitle: string;
  conflictingTimeRange: string;
  participantName?: string;
  spaceName?: string;
  message: string;
}

// Defense Filters
export interface DefenseFilters {
  search?: string;
  status?: DefenseStatus | 'ALL';
  unit_id?: string | 'ALL';
  facility_id?: string | 'ALL';
  space_id?: string | 'ALL';
  modality?: DefenseModality | 'ALL';
  dateFrom?: string;
  dateTo?: string;
}
