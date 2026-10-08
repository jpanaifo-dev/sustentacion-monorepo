import { isLiveSupabase } from '../lib/supabase';
import { api } from '../lib/api';

export type AgendaHours = {
  start: string;
  end: string;
};

export const DEFAULT_AGENDA_HOURS: AgendaHours = { start: '07:00', end: '14:00' };
const SETTINGS_KEY = 'epg_system_settings';

export const readAgendaHours = (): AgendaHours => {
  if (typeof localStorage === 'undefined') return DEFAULT_AGENDA_HOURS;
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      start: typeof settings.agendaStartTime === 'string' ? settings.agendaStartTime : DEFAULT_AGENDA_HOURS.start,
      end: typeof settings.agendaEndTime === 'string' ? settings.agendaEndTime : DEFAULT_AGENDA_HOURS.end,
    };
  } catch {
    return DEFAULT_AGENDA_HOURS;
  }
};

export const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

export const isValidAgendaHours = ({ start, end }: AgendaHours) => {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return startMinutes >= 6 * 60 && endMinutes <= 23 * 60 && startMinutes < endMinutes;
};

export const hourRange = ({ start, end }: AgendaHours) => {
  const first = Math.floor(timeToMinutes(start) / 60);
  const last = Math.ceil(timeToMinutes(end) / 60);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
};

export const getAgendaHours = async (): Promise<AgendaHours> => {
  if (!isLiveSupabase) return readAgendaHours();
  const { data, error } = await api.agendaHours.get();
  if (error) throw error;
  const hours = data as AgendaHours;
  if (hours?.start && hours?.end && isValidAgendaHours(hours)) return hours;
  return DEFAULT_AGENDA_HOURS;
};

export const saveAgendaHours = async (hours: AgendaHours): Promise<AgendaHours> => {
  if (!isValidAgendaHours(hours)) throw new Error('El horario debe estar entre las 06:00 y las 23:00 y la hora de fin debe ser posterior al inicio.');
  if (!isLiveSupabase) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'), agendaStartTime: hours.start, agendaEndTime: hours.end }));
    return hours;
  }
  const { data, error } = await api.agendaHours.save(hours);
  if (error) throw error;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'), agendaStartTime: hours.start, agendaEndTime: hours.end }));
  return (data as AgendaHours) || hours;
};
