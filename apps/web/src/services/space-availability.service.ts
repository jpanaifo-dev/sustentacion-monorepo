import { isLiveSupabase, supabase } from '../lib/supabase';

export type SpaceUnavailability = {
  id: string;
  space_id: string;
  type: 'MAINTENANCE' | 'EXTERNAL_EVENT' | 'UNAVAILABLE' | 'RESERVED';
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  starts_at: string;
  ends_at: string | null;
  reason: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export const spaceAvailabilityService = {
  async getAll(): Promise<SpaceUnavailability[]> {
    const { data, error } = await (supabase as any).from('space_unavailability').select('*').order('starts_at');
    if (error) throw error;
    return (data || []) as SpaceUnavailability[];
  },
  async getBySpace(spaceId: string): Promise<SpaceUnavailability[]> {
    const { data, error } = await (supabase as any).from('space_unavailability').select('*').eq('space_id', spaceId).order('starts_at');
    if (error) throw error;
    return (data || []) as SpaceUnavailability[];
  },
  async create(payload: Omit<SpaceUnavailability, 'id' | 'created_at' | 'updated_at'>): Promise<SpaceUnavailability> {
    const { data, error } = await (supabase as any).from('space_unavailability').insert(payload).select().single();
    if (error) throw error;
    return data as SpaceUnavailability;
  },
  async update(id: string, payload: Partial<SpaceUnavailability>): Promise<SpaceUnavailability> {
    const { data, error } = await (supabase as any).from('space_unavailability').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data as SpaceUnavailability;
  },
  async remove(id: string): Promise<void> {
    const { error } = await (supabase as any).from('space_unavailability').delete().eq('id', id);
    if (error) throw error;
  },
  overlaps(item: SpaceUnavailability, start: string, end: string) {
    return item.status !== 'CANCELLED' && item.status !== 'COMPLETED' && item.starts_at < end && (!item.ends_at || item.ends_at > start);
  },
};
