import { CurrentUser, Profile, RoleCode } from '../types';
import { initialProfiles, initialRoles, initialUnits } from './mockData';
import { api } from '../lib/api';

let devAutoLoginPromise: Promise<void> | null = null;

const ensureDevSession = async (): Promise<void> => {
  if (!import.meta.env.DEV || !import.meta.env.VITE_ADMIN_EMAIL || !import.meta.env.VITE_ADMIN_PASSWORD) return;
  if (!devAutoLoginPromise) {
    devAutoLoginPromise = api.auth
      .login(import.meta.env.VITE_ADMIN_EMAIL, import.meta.env.VITE_ADMIN_PASSWORD)
      .then(() => undefined)
      .catch(() => undefined);
  }
  await devAutoLoginPromise;
};

export const authService = {
  async login(email: string, password: string): Promise<CurrentUser> {
    const session = await api.auth.login(email, password);
    if (session.error || !session.data) throw session.error || new Error('No se pudo iniciar sesión');
    return this.setDemoRole('SUPER_ADMIN');
  },
  async getCurrentUser(): Promise<CurrentUser | null> {
    let session = await api.auth.getUser();
    if (!session.data.user) {
      await ensureDevSession();
      session = await api.auth.getUser();
    }
    if (!session.data.user) return null;

    // Default to SUPER_ADMIN for immediate full feature evaluation
    const defaultSuperAdmin: CurrentUser = {
      profile: initialProfiles[0],
      roles: ['SUPER_ADMIN'],
      permissions: [
        'users.view', 'users.create', 'users.update', 'users.disable',
        'roles.view', 'roles.manage', 'permissions.view', 'permissions.manage',
        'units.view', 'units.create', 'units.update', 'units.disable',
        'facilities.view', 'facilities.create', 'facilities.update',
        'spaces.view', 'spaces.create', 'spaces.update',
        'defenses.view', 'defenses.create', 'defenses.update', 'defenses.confirm',
        'defenses.reschedule', 'defenses.cancel', 'defenses.complete', 'defenses.reopen',
        'defense_participants.manage', 'calendar.view', 'calendar.manage',
        'attachments.view', 'attachments.upload', 'attachments.delete',
        'notifications.send', 'audit.view', 'reports.view', 'reports.export'
      ],
      units: [initialUnits[0].id, initialUnits[1].id],
      isSuperAdmin: true,
    };

    return defaultSuperAdmin;
  },

  async setDemoRole(role: RoleCode): Promise<CurrentUser> {
    const isSuperAdmin = role === 'SUPER_ADMIN';
    let permissions: string[] = [];

    if (isSuperAdmin) {
      permissions = ['defenses.view', 'defenses.create', 'defenses.update', 'defenses.confirm', 'defenses.reschedule', 'defenses.cancel', 'defenses.complete', 'defenses.reopen', 'defense_participants.manage', 'calendar.view', 'calendar.manage', 'users.view', 'users.create', 'users.update', 'users.disable', 'roles.view', 'roles.manage', 'units.view', 'units.create', 'units.update', 'facilities.view', 'facilities.create', 'spaces.view', 'spaces.create', 'audit.view', 'notifications.send'];
    } else if (role === 'UNIT_COORDINATOR') {
      permissions = ['defenses.view', 'defenses.create', 'defenses.update', 'defense_participants.manage', 'calendar.view', 'units.view', 'facilities.view', 'spaces.view'];
    } else if (role === 'VIEWER') {
      permissions = ['defenses.view', 'calendar.view', 'units.view', 'facilities.view', 'spaces.view'];
    } else {
      permissions = ['defenses.view', 'defenses.create', 'defenses.update', 'defenses.confirm', 'defenses.reschedule', 'defense_participants.manage', 'calendar.view', 'calendar.manage', 'facilities.view', 'spaces.view', 'units.view', 'notifications.send'];
    }

    const newUser: CurrentUser = {
      profile: {
        ...initialProfiles[0],
        first_name: role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'UNIT_COORDINATOR' ? 'Coordinador' : 'Usuario',
        last_name: role,
        email: `${role.toLowerCase()}@unapiquitos.edu.pe`,
      },
      roles: [role],
      permissions,
      units: [initialUnits[0].id],
      isSuperAdmin,
    };

    return newUser;
  },

  async signOut(): Promise<void> {
    await api.auth.signOut();
  },
};
