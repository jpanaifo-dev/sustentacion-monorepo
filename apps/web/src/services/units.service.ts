import { isLiveSupabase, supabase } from '../lib/supabase';
import { Unit } from '../types';
import { initialUnits } from './mockData';
import { auditService } from './audit.service';

export const unitsService = {
  async getUnits(): Promise<Unit[]> {
    if (isLiveSupabase) {
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data as Unit[]) || [];
    }
    const stored = localStorage.getItem('epg_units');
    if (!stored) {
      localStorage.setItem('epg_units', JSON.stringify(initialUnits));
      return initialUnits;
    }
    return JSON.parse(stored);
  },

  async getUnitById(id: string): Promise<Unit | null> {
    const units = await this.getUnits();
    return units.find((u) => u.id === id) || null;
  },

  async createUnit(payload: Omit<Unit, 'id' | 'created_at' | 'updated_at'>): Promise<Unit> {
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('units').insert(payload as any).select().single();
      if (error) throw error;
      await auditService.logAction({ action: 'UNIT_CREATED', entity_type: 'unit', entity_id: (data as any).id, new_values: data });
      return data as Unit;
    }

    const units = await this.getUnits();
    const newUnit: Unit = {
      ...payload,
      id: `unit-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    units.push(newUnit);
    localStorage.setItem('epg_units', JSON.stringify(units));
    await auditService.logAction({ action: 'UNIT_CREATED', entity_type: 'unit', entity_id: newUnit.id, new_values: newUnit });
    return newUnit;
  },

  async updateUnit(id: string, payload: Partial<Unit>): Promise<Unit> {
    if (isLiveSupabase) {
      const { data, error } = await (supabase as any).from('units').update(payload as any).eq('id', id).select().single();
      if (error) throw error;
      await auditService.logAction({ action: 'UNIT_UPDATED', entity_type: 'unit', entity_id: id, new_values: payload });
      return data as Unit;
    }

    const units = await this.getUnits();
    const index = units.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Unidad no encontrada');
    const oldValues = units[index];
    const updated = { ...units[index], ...payload, updated_at: new Date().toISOString() };
    units[index] = updated;
    localStorage.setItem('epg_units', JSON.stringify(units));
    await auditService.logAction({ action: 'UNIT_UPDATED', entity_type: 'unit', entity_id: id, old_values: oldValues, new_values: payload });
    return updated;
  },

  async toggleActive(id: string, currentStatus: boolean): Promise<Unit> {
    return this.updateUnit(id, { is_active: !currentStatus });
  },

  async deleteUnit(id: string): Promise<void> {
    const { error } = await (supabase as any).from('units').delete().eq('id', id);
    if (error) throw error;
  },
};
