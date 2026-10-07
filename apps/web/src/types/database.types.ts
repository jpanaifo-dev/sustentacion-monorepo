export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type RoleCode =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DEFENSE_MANAGER'
  | 'AGENDA_MANAGER'
  | 'UNIT_COORDINATOR'
  | 'IT_SUPPORT'
  | 'VIEWER';

export type SpaceType =
  | 'CLASSROOM'
  | 'AUDITORIUM'
  | 'DEGREE_ROOM'
  | 'MEETING_ROOM'
  | 'OTHER';

export type DefenseStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'RESCHEDULED'
  | 'COMPLETED'
  | 'CANCELLED';

export type DefenseModality =
  | 'PRESENTIAL'
  | 'VIRTUAL'
  | 'HYBRID';

export type ParticipantType =
  | 'STUDENT'
  | 'JUROR'
  | 'ADVISOR';

export type JurorRole =
  | 'PRESIDENT'
  | 'SECRETARY'
  | 'MEMBER'
  | 'OTHER';

export type NotificationStatus =
  | 'PENDING'
  | 'SENT'
  | 'FAILED';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone: string | null;
          document_number: string | null;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          phone?: string | null;
          document_number?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string | null;
          document_number?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          code: RoleCode;
          name: string;
          description: string | null;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: RoleCode;
          name: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: RoleCode;
          name?: string;
          description?: string | null;
          is_system?: boolean;
          created_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          name: string;
          module: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          module: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          module?: string;
          description?: string | null;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          created_at?: string;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
      };
      user_permissions: {
        Row: {
          id: string;
          user_id: string;
          permission_id: string;
          is_granted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          permission_id: string;
          is_granted?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          permission_id?: string;
          is_granted?: boolean;
          created_at?: string;
        };
      };
      units: {
        Row: {
          id: string;
          name: string;
          code: string;
          type: string;
          acronym: string | null;
          description: string | null;
          email: string | null;
          institutional_email: string | null;
          phone: string | null;
          is_faculty: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          type?: string;
          acronym?: string | null;
          description?: string | null;
          email?: string | null;
          institutional_email?: string | null;
          phone?: string | null;
          is_faculty?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          type?: string;
          acronym?: string | null;
          description?: string | null;
          email?: string | null;
          institutional_email?: string | null;
          phone?: string | null;
          is_faculty?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_units: {
        Row: {
          id: string;
          user_id: string;
          unit_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          unit_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          unit_id?: string;
          created_at?: string;
        };
      };
      facilities: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          address: string | null;
          reference: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          address?: string | null;
          reference?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          address?: string | null;
          reference?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      spaces: {
        Row: {
          id: string;
          facility_id: string;
          name: string;
          type: SpaceType;
          capacity: number | null;
          floor: string | null;
          location_reference: string | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          facility_id: string;
          name: string;
          type?: SpaceType;
          capacity?: number | null;
          floor?: string | null;
          location_reference?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          facility_id?: string;
          name?: string;
          type?: SpaceType;
          capacity?: number | null;
          floor?: string | null;
          location_reference?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      media: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          provider: string;
          provider_asset_id: string | null;
          url: string;
          mime_type: string | null;
          file_size: number | null;
          sort_order: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          entity_type: string;
          entity_id: string;
          provider?: string;
          provider_asset_id?: string | null;
          url: string;
          mime_type?: string | null;
          file_size?: number | null;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          provider?: string;
          provider_asset_id?: string | null;
          url?: string;
          mime_type?: string | null;
          file_size?: number | null;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
        };
      };
      persons: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          document_number: string | null;
          photo_url?: string | null;
          external_uuid?: string | null;
          external_id?: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          document_number?: string | null;
          photo_url?: string | null;
          external_uuid?: string | null;
          external_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          document_number?: string | null;
          photo_url?: string | null;
          external_uuid?: string | null;
          external_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      defenses: {
        Row: {
          id: string;
          code: string;
          unit_id: string;
          program_uuid?: string | null;
          program_code?: string | null;
          program_name?: string | null;
          office_number?: string | null;
          title: string;
          status: DefenseStatus;
          modality: DefenseModality;
          scheduled_date: string;
          start_time: string;
          estimated_end_time: string;
          estimated_duration_minutes: number;
          facility_id: string | null;
          space_id: string | null;
          virtual_platform: string | null;
          virtual_url: string | null;
          observations: string | null;
          internal_notes: string | null;
          completed_at: string | null;
          completed_by: string | null;
          actual_end_time: string | null;
          final_observations: string | null;
          cancelled_at: string | null;
          cancelled_by: string | null;
          cancellation_reason: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code?: string;
          unit_id: string;
          program_uuid?: string | null;
          program_code?: string | null;
          program_name?: string | null;
          office_number?: string | null;
          title: string;
          status?: DefenseStatus;
          modality?: DefenseModality;
          scheduled_date: string;
          start_time: string;
          estimated_end_time?: string;
          estimated_duration_minutes?: number;
          facility_id?: string | null;
          space_id?: string | null;
          virtual_platform?: string | null;
          virtual_url?: string | null;
          observations?: string | null;
          internal_notes?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          actual_end_time?: string | null;
          final_observations?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          unit_id?: string;
          program_uuid?: string | null;
          program_code?: string | null;
          program_name?: string | null;
          office_number?: string | null;
          title?: string;
          status?: DefenseStatus;
          modality?: DefenseModality;
          scheduled_date?: string;
          start_time?: string;
          estimated_end_time?: string;
          estimated_duration_minutes?: number;
          facility_id?: string | null;
          space_id?: string | null;
          virtual_platform?: string | null;
          virtual_url?: string | null;
          observations?: string | null;
          internal_notes?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          actual_end_time?: string | null;
          final_observations?: string | null;
          cancelled_at?: string | null;
          cancelled_by?: string | null;
          cancellation_reason?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      defense_participants: {
        Row: {
          id: string;
          defense_id: string;
          person_id: string;
          participant_type: ParticipantType;
          role: JurorRole | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          defense_id: string;
          person_id: string;
          participant_type: ParticipantType;
          role?: JurorRole | null;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          defense_id?: string;
          person_id?: string;
          participant_type?: ParticipantType;
          role?: JurorRole | null;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      defense_reschedules: {
        Row: {
          id: string;
          defense_id: string;
          previous_date: string;
          previous_start_time: string;
          previous_estimated_end_time: string;
          previous_facility_id: string | null;
          previous_space_id: string | null;
          new_date: string;
          new_start_time: string;
          new_estimated_end_time: string;
          new_facility_id: string | null;
          new_space_id: string | null;
          reason: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          defense_id: string;
          previous_date: string;
          previous_start_time: string;
          previous_estimated_end_time: string;
          previous_facility_id?: string | null;
          previous_space_id?: string | null;
          new_date: string;
          new_start_time: string;
          new_estimated_end_time: string;
          new_facility_id?: string | null;
          new_space_id?: string | null;
          reason: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          defense_id?: string;
          previous_date?: string;
          previous_start_time?: string;
          previous_estimated_end_time?: string;
          previous_facility_id?: string | null;
          previous_space_id?: string | null;
          new_date?: string;
          new_start_time?: string;
          new_estimated_end_time?: string;
          new_facility_id?: string | null;
          new_space_id?: string | null;
          reason?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      defense_status_history: {
        Row: {
          id: string;
          defense_id: string;
          previous_status: DefenseStatus | null;
          new_status: DefenseStatus;
          reason: string | null;
          changed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          defense_id: string;
          previous_status?: DefenseStatus | null;
          new_status: DefenseStatus;
          reason?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          defense_id?: string;
          previous_status?: DefenseStatus | null;
          new_status?: DefenseStatus;
          reason?: string | null;
          changed_by?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          defense_id: string | null;
          type: string;
          recipient_email: string;
          recipient_name: string;
          status: NotificationStatus;
          provider: string;
          provider_message_id: string | null;
          error: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          defense_id?: string | null;
          type: string;
          recipient_email: string;
          recipient_name: string;
          status?: NotificationStatus;
          provider?: string;
          provider_message_id?: string | null;
          error?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          defense_id?: string | null;
          type?: string;
          recipient_email?: string;
          recipient_name?: string;
          status?: NotificationStatus;
          provider?: string;
          provider_message_id?: string | null;
          error?: string | null;
          sent_at?: string | null;
          created_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      system_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}
