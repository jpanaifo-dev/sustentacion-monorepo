import { isLiveSupabase, supabase } from '../lib/supabase';
import { Facility, FacilityWithSpaces } from '../types';
import { initialFacilities } from './mockData';
import { auditService } from './audit.service';

export const facilitiesService = {
  async getFacilities(): Promise<FacilityWithSpaces[]> {
    if (isLiveSupabase) {
      const { data, error } = await supabase
        .from('facilities')
        .select(`
          *,
          spaces (*)
        `)
        .order('name');
      if (error) throw error;
      return (data as any) || [];
    }

    const stored = localStorage.getItem('epg_facilities');
    if (!stored) {
      localStorage.setItem('epg_facilities', JSON.stringify(initialFacilities));
      return initialFacilities;
    }
    return JSON.parse(stored);
  },

  async getFacilityById(id: string): Promise<Facility | null> {
    const facilities = await this.getFacilities();
    return facilities.find((f) => f.id === id) || null;
  },

  async createFacility(payload: Omit<Facility, 'id' | 'created_at' | 'updated_at'>): Promise<Facility> {
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('facilities').insert(payload as any).select().single();
      if (error) throw error;
      await auditService.logAction({ action: 'FACILITY_CREATED', entity_type: 'facility', entity_id: (data as any).id, new_values: data });
      return data as Facility;
    }

    const facilities = await this.getFacilities();
    const newFacility: Facility = {
      ...payload,
      id: `facility-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    facilities.push(newFacility);
    localStorage.setItem('epg_facilities', JSON.stringify(facilities));
    await auditService.logAction({ action: 'FACILITY_CREATED', entity_type: 'facility', entity_id: newFacility.id, new_values: newFacility });
    return newFacility;
  },

  async updateFacility(id: string, payload: Partial<Facility>): Promise<Facility> {
    if (isLiveSupabase) {
      const { data, error } = await (supabase as any).from('facilities').update(payload as any).eq('id', id).select().single();
      if (error) throw error;
      await auditService.logAction({ action: 'FACILITY_UPDATED', entity_type: 'facility', entity_id: id, new_values: payload });
      return data as Facility;
    }

    const facilities = await this.getFacilities();
    const idx = facilities.findIndex((f) => f.id === id);
    if (idx === -1) throw new Error('Instalación no encontrada');
    const oldValues = facilities[idx];
    const updated = { ...facilities[idx], ...payload, updated_at: new Date().toISOString() };
    facilities[idx] = updated;
    localStorage.setItem('epg_facilities', JSON.stringify(facilities));
    await auditService.logAction({ action: 'FACILITY_UPDATED', entity_type: 'facility', entity_id: id, old_values: oldValues, new_values: payload });
    return updated;
  },

  async toggleActive(id: string, currentStatus: boolean): Promise<Facility> {
    return this.updateFacility(id, { is_active: !currentStatus });
  },

  async deleteFacility(id: string): Promise<void> {
    const { error } = await (supabase as any).from('facilities').delete().eq('id', id);
    if (error) throw error;
  },
};
