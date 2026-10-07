import { z } from "zod";

// Participant in form
export const defenseParticipantSchema = z.object({
  person_id: z.string().min(1, "Debe seleccionar una persona"),
  participant_type: z.enum(["STUDENT", "JUROR", "ADVISOR"]),
  role: z.enum(["PRESIDENT", "SECRETARY", "MEMBER", "OTHER"]).optional().nullable(),
  is_primary: z.boolean().default(false),
});

// Draft Defense Schema (Loose, only basic fields required)
export const defenseDraftSchema = z.object({
  unit_id: z.string().min(1, "Debe seleccionar una unidad académica"),
  program_uuid: z.string().min(1, "Debe seleccionar un programa de posgrado"),
  program_code: z.string().optional().nullable(),
  program_name: z.string().min(1, "Debe seleccionar un programa de posgrado"),
  office_number: z.string().optional().nullable(),
  title: z.string().optional().default("Sustentación en borrador"),
  scheduled_date: z.string().min(1, "Debe seleccionar una fecha"),
  start_time: z.string().min(1, "Debe indicar la hora de inicio"),
  estimated_duration_minutes: z.coerce.number().min(30).max(480).default(120),
  modality: z.enum(["PRESENTIAL", "VIRTUAL", "HYBRID"]).default("PRESENTIAL"),
  facility_id: z.string().optional().nullable(),
  space_id: z.string().optional().nullable(),
  virtual_platform: z.string().optional().nullable(),
  virtual_url: z.string().url("Debe ser una URL válida").optional().nullable().or(z.literal("")),
  observations: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  participants: z.array(defenseParticipantSchema).default([]),
});

// Confirm Defense Schema (Strict validation)
export const defenseConfirmSchema = z.object({
  unit_id: z.string().min(1, "La unidad académica es requerida"),
  program_uuid: z.string().min(1, "El programa de posgrado es requerido"),
  program_code: z.string().optional().nullable(),
  program_name: z.string().min(1, "El programa de posgrado es requerido"),
  office_number: z.string().optional().nullable(),
  title: z.string().min(5, "El título de la tesis debe tener al menos 5 caracteres"),
  scheduled_date: z.string().min(1, "La fecha de sustentación es obligatoria"),
  start_time: z.string().min(1, "La hora de inicio es obligatoria"),
  estimated_duration_minutes: z.coerce.number().min(30).max(480).default(120),
  modality: z.enum(["PRESENTIAL", "VIRTUAL", "HYBRID"]),
  facility_id: z.string().optional().nullable(),
  space_id: z.string().optional().nullable(),
  virtual_platform: z.string().optional().nullable(),
  virtual_url: z.string().url("Debe ser una URL válida").optional().nullable().or(z.literal("")),
  observations: z.string().optional().nullable(),
  internal_notes: z.string().optional().nullable(),
  participants: z
    .array(defenseParticipantSchema)
    .min(2, "Se requieren participantes")
    .refine(
      (participants) => participants.some((p) => p.participant_type === "STUDENT"),
      "Debe incluir al menos un sustentante (alumno)"
    )
    .refine(
      (participants) => participants.some((p) => p.participant_type === "JUROR"),
      "Debe incluir al menos un miembro del jurado calificador"
    ),
});

// Reschedule Schema
export const rescheduleSchema = z.object({
  new_date: z.string().min(1, "La nueva fecha es obligatoria"),
  new_start_time: z.string().min(1, "La nueva hora es obligatoria"),
  new_facility_id: z.string().optional().nullable(),
  new_space_id: z.string().optional().nullable(),
  reason: z.string().min(5, "Debe especificar un motivo detallado de reprogramación"),
});

// Cancel Schema
export const cancelDefenseSchema = z.object({
  cancellation_reason: z.string().min(5, "Debe ingresar el motivo de la cancelación"),
});

// Complete Schema
export const completeDefenseSchema = z.object({
  actual_end_time: z.string().optional().nullable(),
  final_observations: z.string().optional().nullable(),
});

// Reopen Schema
export const reopenDefenseSchema = z.object({
  reason: z.string().min(5, "Debe fundamentar el motivo de reapertura"),
});

// Unit Schema
export const unitFormSchema = z.object({
  name: z.string().min(3, "El nombre de la unidad debe tener al menos 3 caracteres"),
  code: z.string().min(2, "El código es obligatorio (ej. UPG-CI)"),
  acronym: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  institutional_email: z.string().email("Correo institucional inválido").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

// Facility Schema
export const facilityFormSchema = z.object({
  name: z.string().min(3, "El nombre de la instalación es obligatorio"),
  description: z.string().optional().nullable(),
  address: z.string().min(3, "La dirección es obligatoria"),
  reference: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

// Space Schema
export const spaceFormSchema = z.object({
  facility_id: z.string().min(1, "Debe pertenecer a una instalación"),
  name: z.string().min(2, "El nombre del espacio es obligatorio"),
  type: z.enum(["CLASSROOM", "AUDITORIUM", "DEGREE_ROOM", "MEETING_ROOM", "OTHER"]),
  capacity: z.coerce.number().min(1, "Capacidad mínima 1 persona"),
  floor: z.string().optional().nullable(),
  location_reference: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

// Person Schema
export const personFormSchema = z.object({
  first_name: z.string().min(2, "Nombre requerido"),
  last_name: z.string().min(2, "Apellidos requeridos"),
  email: z.string().email("Correo electrónico inválido").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  document_number: z.string().min(8, "DNI/Documento debe tener al menos 8 dígitos").max(15).optional().nullable().or(z.literal("")),
});

// User Admin Form Schema
export const userAdminFormSchema = z.object({
  first_name: z.string().min(2, "Nombre requerido"),
  last_name: z.string().min(2, "Apellidos requeridos"),
  email: z.string().email("Correo inválido"),
  phone: z.string().optional().nullable(),
  document_number: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  role_ids: z.array(z.string()).default([]),
  unit_ids: z.array(z.string()).default([]),
});

export type DefenseDraftInput = z.infer<typeof defenseDraftSchema>;
export type DefenseConfirmInput = z.infer<typeof defenseConfirmSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type CancelDefenseInput = z.infer<typeof cancelDefenseSchema>;
export type CompleteDefenseInput = z.infer<typeof completeDefenseSchema>;
export type ReopenDefenseInput = z.infer<typeof reopenDefenseSchema>;
export type UnitFormInput = z.infer<typeof unitFormSchema>;
export type FacilityFormInput = z.infer<typeof facilityFormSchema>;
export type SpaceFormInput = z.infer<typeof spaceFormSchema>;
export type PersonFormInput = z.infer<typeof personFormSchema>;
export type UserAdminFormInput = z.infer<typeof userAdminFormSchema>;
