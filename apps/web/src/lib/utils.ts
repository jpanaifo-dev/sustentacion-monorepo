import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.slice(0, 10);
}

export const participantTypeLabels: Record<string, string> = {
  STUDENT: 'Sustentante',
  JUROR: 'Jurado calificador',
  ADVISOR: 'Asesor de tesis',
};

export const jurorRoleLabels: Record<string, string> = {
  PRESIDENT: 'Presidente',
  SECRETARY: 'Secretario',
  MEMBER: 'Miembro',
  OTHER: 'Otro',
};

export const modalityLabels: Record<string, string> = {
  PRESENTIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  HYBRID: 'Híbrida',
};

export function getParticipantTypeLabel(type?: string | null): string {
  return type ? participantTypeLabels[type] || type : 'Sin tipo asignado';
}

export function getJurorRoleLabel(role?: string | null): string {
  return role ? jurorRoleLabels[role] || role : 'Miembro';
}

export function getModalityLabel(modality?: string | null): string {
  return modality ? modalityLabels[modality] || modality : 'No definida';
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const [year, month, day] = normalizeDateOnly(dateStr).split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "-";
  try {
    const parts = timeStr.split(":");
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      return `${formattedHours}:${minutes} ${ampm}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

export function calculateEndTime(startTime: string, durationMinutes = 120): string {
  try {
    const [h, m] = startTime.split(":").map(Number);
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`;
  } catch {
    return "12:00:00";
  }
}
