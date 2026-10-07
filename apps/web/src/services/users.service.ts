import { isLiveSupabase, supabase } from '../lib/supabase';
import { Profile, Role, Unit, UserWithDetails } from '../types';
import { initialProfiles, initialRoles, initialUnits } from './mockData';
import { auditService } from './audit.service';
import { api } from '../lib/api';

export const usersService = {
  async getUsers(): Promise<UserWithDetails[]> {
    if (isLiveSupabase) {
      const { data, error } = await api.admin.users.get();
      if (error) throw error;
      return ((data as any[]) || []).map((u: any) => ({ ...u, roles: u.roles || [], units: u.units || [] }));
    }

    const stored = localStorage.getItem('epg_users_list');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // ignore
      }
    }

    const sampleUsers: UserWithDetails[] = [
      {
        ...initialProfiles[0],
        roles: [initialRoles[0]], // SUPER_ADMIN
        units: [initialUnits[0], initialUnits[1]],
      },
      {
        ...initialProfiles[1],
        roles: [initialRoles[4]], // UNIT_COORDINATOR
        units: [initialUnits[0]],
      },
      {
        id: 'user-defense-mgr',
        first_name: 'Elena',
        last_name: 'Paredes Salazar',
        email: 'gestor.sustentaciones@unapiquitos.edu.pe',
        phone: '965000003',
        document_number: '05000003',
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        roles: [initialRoles[2]], // DEFENSE_MANAGER
        units: [initialUnits[0], initialUnits[1], initialUnits[2]],
      },
    ];

    localStorage.setItem('epg_users_list', JSON.stringify(sampleUsers));
    return sampleUsers;
  },

  async getRoles(): Promise<Role[]> {
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('roles').select('*').order('name');
      if (error) throw error;
      return (data as Role[]) || [];
    }
    return initialRoles;
  },

  async createUser(payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string | null;
    document_number?: string | null;
    role_ids: string[];
    unit_ids: string[];
  }): Promise<UserWithDetails> {
    if (isLiveSupabase) {
      const { data, error } = await api.admin.users.create(payload);
      if (error) throw error;
      return data as UserWithDetails;
    }
    const users = await this.getUsers();
    const roles = await this.getRoles();
    const allUnits = initialUnits;

    const newId = `user-${Date.now()}`;
    const newUser: UserWithDetails = {
      id: newId,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      phone: payload.phone || null,
      document_number: payload.document_number || null,
      avatar_url: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      roles: roles.filter((r) => payload.role_ids.includes(r.id)),
      units: allUnits.filter((u) => payload.unit_ids.includes(u.id)),
    };

    users.push(newUser);
    localStorage.setItem('epg_users_list', JSON.stringify(users));

    await auditService.logAction({
      action: 'USER_CREATED',
      entity_type: 'user',
      entity_id: newId,
      new_values: newUser,
    });

    return newUser;
  },

  async updateUser(
    id: string,
    payload: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string | null;
      document_number?: string | null;
      is_active?: boolean;
      role_ids?: string[];
      unit_ids?: string[];
    }
  ): Promise<UserWithDetails> {
    if (isLiveSupabase) {
      const { data, error } = await api.admin.users.update(id, payload);
      if (error) throw error;
      return data as UserWithDetails;
    }
    const users = await this.getUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Usuario no encontrado');

    const roles = await this.getRoles();
    const allUnits = initialUnits;
    const old = users[idx];

    const updatedRoles = payload.role_ids ? roles.filter((r) => payload.role_ids!.includes(r.id)) : old.roles;
    const updatedUnits = payload.unit_ids ? allUnits.filter((u) => payload.unit_ids!.includes(u.id)) : old.units;

    const updatedUser: UserWithDetails = {
      ...old,
      first_name: payload.first_name ?? old.first_name,
      last_name: payload.last_name ?? old.last_name,
      email: payload.email ?? old.email,
      phone: payload.phone !== undefined ? payload.phone : old.phone,
      document_number: payload.document_number !== undefined ? payload.document_number : old.document_number,
      is_active: payload.is_active !== undefined ? payload.is_active : old.is_active,
      roles: updatedRoles,
      units: updatedUnits,
      updated_at: new Date().toISOString(),
    };

    users[idx] = updatedUser;
    localStorage.setItem('epg_users_list', JSON.stringify(users));

    await auditService.logAction({
      action: 'USER_UPDATED',
      entity_type: 'user',
      entity_id: id,
      old_values: old,
      new_values: payload,
    });

    return updatedUser;
  },

  async toggleActive(id: string, currentStatus: boolean): Promise<UserWithDetails> {
    return this.updateUser(id, { is_active: !currentStatus });
  },

  async deleteUser(id: string): Promise<void> {
    const { error } = await (api.from('profiles') as any).delete().eq('id', id);
    if (error) throw error;
  },
};
