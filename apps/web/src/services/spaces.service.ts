import { isLiveSupabase, supabase } from '../lib/supabase';
import { Space, SpaceWithFacility } from '../types';
import { initialSpaces, initialFacilities } from './mockData';
import { auditService } from './audit.service';

export const spacesService = {
  async getSpaces(facilityId?: string): Promise<SpaceWithFacility[]> {
    if (isLiveSupabase) {
      let query = supabase
        .from('spaces')
        .select(`
          *,
          facility:facilities(*)
        `)
        .order('name');
      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as any) || [];
    }

    const stored = localStorage.getItem('epg_spaces');
    let spaces: Space[] = initialSpaces;
    if (stored) {
      try {
        spaces = JSON.parse(stored);
      } catch {
        spaces = initialSpaces;
      }
    } else {
      localStorage.setItem('epg_spaces', JSON.stringify(initialSpaces));
    }

    if (facilityId) {
      spaces = spaces.filter((s) => s.facility_id === facilityId);
    }

    return spaces.map((s) => ({
      ...s,
      facility: initialFacilities.find((f) => f.id === s.facility_id) || null,
    }));
  },

  async getSpaceById(id: string): Promise<Space | null> {
    const spaces = await this.getSpaces();
    return spaces.find((s) => s.id === id) || null;
  },

  async createSpace(payload: Omit<Space, 'id' | 'created_at' | 'updated_at'>): Promise<Space> {
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('spaces').insert(payload as any).select().single();
      if (error) throw error;
      await auditService.logAction({ action: 'SPACE_CREATED', entity_type: 'space', entity_id: (data as any).id, new_values: data });
      return data as Space;
    }

    const spaces = await this.getSpaces();
    const newSpace: Space = {
      ...payload,
      id: `space-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    spaces.push(newSpace);
    localStorage.setItem('epg_spaces', JSON.stringify(spaces));
    await auditService.logAction({ action: 'SPACE_CREATED', entity_type: 'space', entity_id: newSpace.id, new_values: newSpace });
    return newSpace;
  },

  async updateSpace(id: string, payload: Partial<Space>): Promise<Space> {
    if (isLiveSupabase) {
      const { data, error } = await (supabase as any).from('spaces').update(payload as any).eq('id', id).select().single();
      if (error) throw error;
      await auditService.logAction({ action: 'SPACE_UPDATED', entity_type: 'space', entity_id: id, new_values: payload });
      return data as Space;
    }

    const spaces = await this.getSpaces();
    const idx = spaces.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Espacio no encontrado');
    const oldValues = spaces[idx];
    const updated = { ...spaces[idx], ...payload, updated_at: new Date().toISOString() };
    spaces[idx] = updated;
    localStorage.setItem('epg_spaces', JSON.stringify(spaces));
    await auditService.logAction({ action: 'SPACE_UPDATED', entity_type: 'space', entity_id: id, old_values: oldValues, new_values: payload });
    return updated;
  },

  async toggleActive(id: string, currentStatus: boolean): Promise<Space> {
    return this.updateSpace(id, { is_active: !currentStatus });
  },

  async deleteSpace(id: string): Promise<void> {
    const { error } = await (supabase as any).from('spaces').delete().eq('id', id);
    if (error) throw error;
  },
};
