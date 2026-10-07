import { isLiveSupabase, supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { calculateEndTime } from '../lib/utils';
import {
  DefenseFilters,
  DefenseStatus,
  DefenseWithRelations,
  JurorRole,
  ParticipantType,
} from '../types';
import { auditService } from './audit.service';
import { initialDefenses, initialFacilities, initialPersons, initialSpaces, initialUnits } from './mockData';
import { notificationsService } from './notifications.service';

export interface CreateDefensePayload {
  unit_id: string;
  program_uuid?: string | null;
  program_code?: string | null;
  program_name?: string | null;
  office_number?: string | null;
  title?: string;
  scheduled_date: string;
  start_time: string;
  estimated_duration_minutes?: number;
  modality?: 'PRESENTIAL' | 'VIRTUAL' | 'HYBRID';
  facility_id?: string | null;
  space_id?: string | null;
  virtual_platform?: string | null;
  virtual_url?: string | null;
  observations?: string | null;
  internal_notes?: string | null;
  participants?: {
    person_id: string;
    participant_type: ParticipantType;
    role?: JurorRole | null;
    is_primary?: boolean;
  }[];
  asConfirmed?: boolean;
}

export const defensesService = {
  async syncParticipants(id: string, participants: CreateDefensePayload['participants'] = []) {
    if (isLiveSupabase) {
      const participantRows = participants.map((p) => ({
        defense_id: id,
        person_id: p.person_id,
        participant_type: p.participant_type,
        role: p.role || null,
        is_primary: p.is_primary ?? false,
      }));
      const result = await api.defenses.syncParticipants(id, participantRows);
      if (result.error) throw result.error;
      return result.data;
    }
    return participants;
  },

  async getDefenses(filters?: DefenseFilters): Promise<DefenseWithRelations[]> {
    if (isLiveSupabase) {
      let query = (supabase as any)
        .from('defenses')
        .select(`
          *,
          unit:units(*),
          facility:facilities(*),
          space:spaces(*),
          participants:defense_participants(
            *,
            person:persons(*)
          ),
          reschedules:defense_reschedules(*)
        `)
        .order('scheduled_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters?.unit_id && filters.unit_id !== 'ALL') {
        query = query.eq('unit_id', filters.unit_id);
      }
      if (filters?.facility_id && filters.facility_id !== 'ALL') {
        query = query.eq('facility_id', filters.facility_id);
      }
      if (filters?.space_id && filters.space_id !== 'ALL') {
        query = query.eq('space_id', filters.space_id);
      }
      if (filters?.modality && filters.modality !== 'ALL') {
        query = query.eq('modality', filters.modality);
      }
      if (filters?.dateFrom) {
        query = query.gte('scheduled_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('scheduled_date', filters.dateTo);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any) || [];
    }

    const stored = localStorage.getItem('epg_defenses');
    let list: DefenseWithRelations[] = initialDefenses;
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {
        list = initialDefenses;
      }
    } else {
      localStorage.setItem('epg_defenses', JSON.stringify(initialDefenses));
    }

    if (!filters) return list;

    return list.filter((item) => {
      if (filters.status && filters.status !== 'ALL' && item.status !== filters.status) return false;
      if (filters.unit_id && filters.unit_id !== 'ALL' && item.unit_id !== filters.unit_id) return false;
      if (filters.facility_id && filters.facility_id !== 'ALL' && item.facility_id !== filters.facility_id) return false;
      if (filters.space_id && filters.space_id !== 'ALL' && item.space_id !== filters.space_id) return false;
      if (filters.modality && filters.modality !== 'ALL' && item.modality !== filters.modality) return false;
      if (filters.dateFrom && item.scheduled_date < filters.dateFrom) return false;
      if (filters.dateTo && item.scheduled_date > filters.dateTo) return false;
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const codeMatch = item.code.toLowerCase().includes(query);
        const titleMatch = item.title.toLowerCase().includes(query);
        const studentMatch = item.participants?.some(
          (p) =>
            p.participant_type === 'STUDENT' &&
            `${p.person.first_name} ${p.person.last_name}`.toLowerCase().includes(query)
        );
        if (!codeMatch && !titleMatch && !studentMatch) return false;
      }
      return true;
    });
  },

  async getPublicDefenses(): Promise<DefenseWithRelations[]> {
    const all = await this.getDefenses();
    // Portal público: Confirmed, Rescheduled, and optionally Completed. NEVER Draft or Cancelled.
    return all.filter((d) => ['CONFIRMED', 'RESCHEDULED', 'COMPLETED'].includes(d.status));
  },

  async getDefenseById(id: string): Promise<DefenseWithRelations | null> {
    const list = await this.getDefenses();
    const defense = list.find((d) => d.id === id) || null;
    if (!defense || !isLiveSupabase) return defense;
    const participantResult = await api.defenses.getParticipants(id);
    if (!participantResult.error) defense.participants = (participantResult.data ?? []) as any;
    return defense;
  },

  async createDefense(payload: CreateDefensePayload): Promise<DefenseWithRelations> {
    const duration = payload.estimated_duration_minutes || 120;
    const endTime = calculateEndTime(payload.start_time, duration);
    const initialStatus: DefenseStatus = payload.asConfirmed ? 'CONFIRMED' : 'DRAFT';

    if (isLiveSupabase) {
      // 1. Insert defense
      const { data: defData, error: defErr }: any = await (supabase as any)
        .from('defenses')
        .insert({
          unit_id: payload.unit_id,
          program_uuid: payload.program_uuid || null,
          program_code: payload.program_code || null,
          program_name: payload.program_name || null,
          office_number: payload.office_number || null,
          title: payload.title || 'Sustentación en borrador',
          status: initialStatus,
          modality: payload.modality || 'PRESENTIAL',
          scheduled_date: payload.scheduled_date,
          start_time: payload.start_time,
          estimated_end_time: endTime,
          estimated_duration_minutes: duration,
          facility_id: payload.facility_id || null,
          space_id: payload.space_id || null,
          virtual_platform: payload.virtual_platform || null,
          virtual_url: payload.virtual_url || null,
          observations: payload.observations || null,
          internal_notes: payload.internal_notes || null,
        } as any)
        .select()
        .single();

      if (defErr) throw defErr;

      // 2. Insert participants
      if (payload.participants && payload.participants.length > 0) {
        const participantRows = payload.participants.map((p) => ({
          defense_id: defData.id,
          person_id: p.person_id,
          participant_type: p.participant_type,
          role: p.role || null,
          is_primary: p.is_primary ?? false,
        }));
        const participantResult = await api.defenses.syncParticipants(defData.id, participantRows);
        if (participantResult.error) throw participantResult.error;
      }

      await auditService.logAction({
        action: initialStatus === 'CONFIRMED' ? 'DEFENSE_CONFIRMED' : 'DEFENSE_CREATED',
        entity_type: 'defense',
        entity_id: defData.id,
        new_values: defData,
      });

      if (initialStatus === 'CONFIRMED') {
        await notificationsService.sendDefenseNotification({
          defense_id: defData.id,
          type: 'CONFIRMATION',
        });
      }

      return (await this.getDefenseById(defData.id))!;
    }

    // Local Mock
    const defenses = await this.getDefenses();
    const count = defenses.length + 1;
    const code = `DEF-2026-${String(count).padStart(5, '0')}`;
    const newId = `def-${Date.now()}`;

    const units = await import('./units.service').then((m) => m.unitsService.getUnits());
    const unit = units.find((u) => u.id === payload.unit_id) || initialUnits[0];
    const facility = initialFacilities.find((f) => f.id === payload.facility_id) || null;
    const space = initialSpaces.find((s) => s.id === payload.space_id) || null;

    const participantsWithPersons = (payload.participants || []).map((p, idx) => {
      const person = initialPersons.find((item) => item.id === p.person_id) || {
        id: p.person_id,
        first_name: 'Persona',
        last_name: 'Registrada',
        email: 'test@unap.edu.pe',
        phone: null,
        document_number: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return {
        id: `dp-new-${idx}-${Date.now()}`,
        defense_id: newId,
        person_id: p.person_id,
        participant_type: p.participant_type,
        role: p.role || null,
        is_primary: p.is_primary || false,
        created_at: new Date().toISOString(),
        person,
      };
    });

    const newDefense: DefenseWithRelations = {
      id: newId,
      code,
      unit_id: payload.unit_id,
      program_uuid: payload.program_uuid || null,
      program_code: payload.program_code || null,
      program_name: payload.program_name || null,
      office_number: payload.office_number || null,
      title: payload.title || 'Sustentación en borrador',
      status: initialStatus,
      modality: payload.modality || 'PRESENTIAL',
      scheduled_date: payload.scheduled_date,
      start_time: payload.start_time,
      estimated_end_time: endTime,
      estimated_duration_minutes: duration,
      facility_id: payload.facility_id || null,
      space_id: payload.space_id || null,
      virtual_platform: payload.virtual_platform || null,
      virtual_url: payload.virtual_url || null,
      observations: payload.observations || null,
      internal_notes: payload.internal_notes || null,
      completed_at: null,
      completed_by: null,
      actual_end_time: null,
      final_observations: null,
      cancelled_at: null,
      cancelled_by: null,
      cancellation_reason: null,
      created_by: 'user-super-admin',
      updated_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      unit,
      facility,
      space,
      participants: participantsWithPersons,
      reschedules: [],
    };

    defenses.unshift(newDefense);
    localStorage.setItem('epg_defenses', JSON.stringify(defenses));

    await auditService.logAction({
      action: initialStatus === 'CONFIRMED' ? 'DEFENSE_CONFIRMED' : 'DEFENSE_CREATED',
      entity_type: 'defense',
      entity_id: newId,
      new_values: newDefense,
    });

    if (initialStatus === 'CONFIRMED') {
      await notificationsService.sendDefenseNotification({
        defense_id: newId,
        type: 'CONFIRMATION',
      });
    }

    return newDefense;
  },

  async updateDefense(id: string, payload: Partial<CreateDefensePayload>): Promise<DefenseWithRelations> {
    const current = await this.getDefenseById(id);
    if (!current) throw new Error('Sustentación no encontrada');

    const duration = payload.estimated_duration_minutes || current.estimated_duration_minutes;
    const startTime = payload.start_time || current.start_time;
    const endTime = calculateEndTime(startTime, duration);

    if (isLiveSupabase) {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (payload.unit_id) updateData.unit_id = payload.unit_id;
      if (payload.program_uuid !== undefined) updateData.program_uuid = payload.program_uuid;
      if (payload.program_code !== undefined) updateData.program_code = payload.program_code;
      if (payload.program_name !== undefined) updateData.program_name = payload.program_name;
      if (payload.office_number !== undefined) updateData.office_number = payload.office_number;
      if (payload.title) updateData.title = payload.title;
      if (payload.scheduled_date) updateData.scheduled_date = payload.scheduled_date;
      if (payload.start_time) updateData.start_time = payload.start_time;
      if (payload.modality) updateData.modality = payload.modality;
      if (payload.facility_id !== undefined) updateData.facility_id = payload.facility_id;
      if (payload.space_id !== undefined) updateData.space_id = payload.space_id;
      if (payload.virtual_platform !== undefined) updateData.virtual_platform = payload.virtual_platform;
      if (payload.virtual_url !== undefined) updateData.virtual_url = payload.virtual_url;
      if (payload.observations !== undefined) updateData.observations = payload.observations;
      if (payload.internal_notes !== undefined) updateData.internal_notes = payload.internal_notes;
      if (payload.asConfirmed) updateData.status = 'CONFIRMED';
      updateData.estimated_duration_minutes = duration;
      updateData.estimated_end_time = endTime;

      const { error } = await (supabase as any).from('defenses').update(updateData).eq('id', id);
      if (error) throw error;

      // Update participants if provided
      if (payload.participants) {
        const participantRows = payload.participants.map((p) => ({
          defense_id: id,
          person_id: p.person_id,
          participant_type: p.participant_type,
          role: p.role || null,
          is_primary: p.is_primary ?? false,
        }));
        const participantResult = await api.defenses.syncParticipants(id, participantRows);
        if (participantResult.error) throw participantResult.error;
      }

      await auditService.logAction({
        action: 'DEFENSE_UPDATED',
        entity_type: 'defense',
        entity_id: id,
        old_values: current,
        new_values: payload,
      });

      if (payload.asConfirmed) {
        await notificationsService.sendDefenseNotification({
          defense_id: id,
          type: 'CONFIRMATION',
        });
      }

      return (await this.getDefenseById(id))!;
    }

    const defenses = await this.getDefenses();
    const idx = defenses.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error('Sustentación no encontrada');

    let updatedParticipants = defenses[idx].participants;
    if (payload.participants) {
      updatedParticipants = payload.participants.map((p, pIdx) => {
        const person = initialPersons.find((item) => item.id === p.person_id) || {
          id: p.person_id,
          first_name: 'Persona',
          last_name: 'Registrada',
          email: 'test@unap.edu.pe',
          phone: null,
          document_number: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return {
          id: `dp-edit-${pIdx}-${Date.now()}`,
          defense_id: id,
          person_id: p.person_id,
          participant_type: p.participant_type,
          role: p.role || null,
          is_primary: p.is_primary || false,
          created_at: new Date().toISOString(),
          person,
        };
      });
    }

    const updated: DefenseWithRelations = {
      ...defenses[idx],
      ...payload,
      status: payload.asConfirmed ? 'CONFIRMED' : defenses[idx].status,
      start_time: startTime,
      estimated_duration_minutes: duration,
      estimated_end_time: endTime,
      participants: updatedParticipants,
      updated_at: new Date().toISOString(),
    };

    defenses[idx] = updated;
    localStorage.setItem('epg_defenses', JSON.stringify(defenses));

    await auditService.logAction({
      action: 'DEFENSE_UPDATED',
      entity_type: 'defense',
      entity_id: id,
      old_values: current,
      new_values: payload,
    });

    return updated;
  },

  async deleteDefense(id: string): Promise<void> {
    const { error } = await (supabase as any).from('defenses').delete().eq('id', id);
    if (error) throw error;
  },

  async confirmDefense(id: string): Promise<DefenseWithRelations> {
    const defense = await this.getDefenseById(id);
    if (!defense) throw new Error('Sustentación no encontrada');

    // Validation according to business requirements
    if (!defense.unit_id) throw new Error('No es posible confirmar: debe especificar una unidad académica');
    if (!defense.scheduled_date) throw new Error('No es posible confirmar: falta la fecha');
    if (!defense.start_time) throw new Error('No es posible confirmar: falta la hora de inicio');
    if (!defense.title || defense.title.trim().length < 5) throw new Error('No es posible confirmar: título incompleto');

    const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
    const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');

    if (students.length === 0) throw new Error('No es posible confirmar: debe contar con al menos 1 sustentante');
    if (jurors.length === 0) throw new Error('No es posible confirmar: debe contar con al menos 1 jurado calificador');

    if (isLiveSupabase) {
      const { error } = await (supabase as any).from('defenses').update({ status: 'CONFIRMED' }).eq('id', id);
      if (error) throw error;
    } else {
      const defenses = await this.getDefenses();
      const idx = defenses.findIndex((d) => d.id === id);
      defenses[idx].status = 'CONFIRMED';
      defenses[idx].updated_at = new Date().toISOString();
      localStorage.setItem('epg_defenses', JSON.stringify(defenses));
    }

    await auditService.logAction({
      action: 'DEFENSE_CONFIRMED',
      entity_type: 'defense',
      entity_id: id,
      new_values: { status: 'CONFIRMED' },
    });

    await notificationsService.sendDefenseNotification({
      defense_id: id,
      type: 'CONFIRMATION',
    });

    return (await this.getDefenseById(id))!;
  },

  async rescheduleDefense(params: {
    defenseId: string;
    new_date: string;
    new_start_time: string;
    new_facility_id?: string | null;
    new_space_id?: string | null;
    reason: string;
  }): Promise<DefenseWithRelations> {
    const defense = await this.getDefenseById(params.defenseId);
    if (!defense) throw new Error('Sustentación no encontrada');

    const duration = defense.estimated_duration_minutes || 120;
    const newEndTime = calculateEndTime(params.new_start_time, duration);

    const rescheduleRecord = {
      defense_id: defense.id,
      previous_date: defense.scheduled_date,
      previous_start_time: defense.start_time,
      previous_estimated_end_time: defense.estimated_end_time,
      previous_facility_id: defense.facility_id,
      previous_space_id: defense.space_id,
      new_date: params.new_date,
      new_start_time: params.new_start_time,
      new_estimated_end_time: newEndTime,
      new_facility_id: params.new_facility_id || defense.facility_id,
      new_space_id: params.new_space_id || defense.space_id,
      reason: params.reason,
      created_at: new Date().toISOString(),
    };

    if (isLiveSupabase) {
      await (supabase as any).from('defense_reschedules').insert(rescheduleRecord as any);
      await (supabase as any)
        .from('defenses')
        .update({
          status: 'RESCHEDULED',
          scheduled_date: params.new_date,
          start_time: params.new_start_time,
          estimated_end_time: newEndTime,
          facility_id: rescheduleRecord.new_facility_id,
          space_id: rescheduleRecord.new_space_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', defense.id);
    } else {
      const defenses = await this.getDefenses();
      const idx = defenses.findIndex((d) => d.id === defense.id);
      const reschedules = defenses[idx].reschedules || [];
      reschedules.push({ id: `resch-${Date.now()}`, ...rescheduleRecord, created_by: 'user-super-admin' });

      defenses[idx] = {
        ...defenses[idx],
        status: 'RESCHEDULED',
        scheduled_date: params.new_date,
        start_time: params.new_start_time,
        estimated_end_time: newEndTime,
        facility_id: rescheduleRecord.new_facility_id,
        space_id: rescheduleRecord.new_space_id,
        space: initialSpaces.find((s) => s.id === rescheduleRecord.new_space_id) || defenses[idx].space,
        reschedules,
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('epg_defenses', JSON.stringify(defenses));
    }

    await auditService.logAction({
      action: 'DEFENSE_RESCHEDULED',
      entity_type: 'defense',
      entity_id: defense.id,
      metadata: rescheduleRecord,
    });

    await notificationsService.sendDefenseNotification({
      defense_id: defense.id,
      type: 'RESCHEDULE',
      reason: params.reason,
    });

    return (await this.getDefenseById(defense.id))!;
  },

  async completeDefense(params: {
    defenseId: string;
    actual_end_time?: string | null;
    final_observations?: string | null;
  }): Promise<DefenseWithRelations> {
    const defense = await this.getDefenseById(params.defenseId);
    if (!defense) throw new Error('Sustentación no encontrada');

    const updateFields = {
      status: 'COMPLETED' as DefenseStatus,
      completed_at: new Date().toISOString(),
      actual_end_time: params.actual_end_time || null,
      final_observations: params.final_observations || null,
      updated_at: new Date().toISOString(),
    };

    if (isLiveSupabase) {
      await (supabase as any).from('defenses').update(updateFields).eq('id', defense.id);
    } else {
      const defenses = await this.getDefenses();
      const idx = defenses.findIndex((d) => d.id === defense.id);
      defenses[idx] = { ...defenses[idx], ...updateFields };
      localStorage.setItem('epg_defenses', JSON.stringify(defenses));
    }

    await auditService.logAction({
      action: 'DEFENSE_COMPLETED',
      entity_type: 'defense',
      entity_id: defense.id,
      new_values: updateFields,
    });

    return (await this.getDefenseById(defense.id))!;
  },

  async reopenDefense(params: { defenseId: string; reason: string }): Promise<DefenseWithRelations> {
    const defense = await this.getDefenseById(params.defenseId);
    if (!defense) throw new Error('Sustentación no encontrada');

    const updateFields = {
      status: 'CONFIRMED' as DefenseStatus,
      completed_at: null,
      completed_by: null,
      updated_at: new Date().toISOString(),
    };

    if (isLiveSupabase) {
      await (supabase as any).from('defenses').update(updateFields).eq('id', defense.id);
    } else {
      const defenses = await this.getDefenses();
      const idx = defenses.findIndex((d) => d.id === defense.id);
      defenses[idx] = { ...defenses[idx], ...updateFields };
      localStorage.setItem('epg_defenses', JSON.stringify(defenses));
    }

    await auditService.logAction({
      action: 'DEFENSE_REOPENED',
      entity_type: 'defense',
      entity_id: defense.id,
      metadata: { reason: params.reason },
    });

    return (await this.getDefenseById(defense.id))!;
  },

  async cancelDefense(params: { defenseId: string; cancellation_reason: string }): Promise<DefenseWithRelations> {
    const defense = await this.getDefenseById(params.defenseId);
    if (!defense) throw new Error('Sustentación no encontrada');

    const updateFields = {
      status: 'CANCELLED' as DefenseStatus,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: params.cancellation_reason,
      updated_at: new Date().toISOString(),
    };

    if (isLiveSupabase) {
      await (supabase as any).from('defenses').update(updateFields).eq('id', defense.id);
    } else {
      const defenses = await this.getDefenses();
      const idx = defenses.findIndex((d) => d.id === defense.id);
      defenses[idx] = { ...defenses[idx], ...updateFields };
      localStorage.setItem('epg_defenses', JSON.stringify(defenses));
    }

    await auditService.logAction({
      action: 'DEFENSE_CANCELLED',
      entity_type: 'defense',
      entity_id: defense.id,
      metadata: { reason: params.cancellation_reason },
    });

    await notificationsService.sendDefenseNotification({
      defense_id: defense.id,
      type: 'CANCELLATION',
      reason: params.cancellation_reason,
    });

    return (await this.getDefenseById(defense.id))!;
  },
};
