type QueryState = { table: string; filters: Record<string, unknown>; operation: 'select' | 'insert' | 'update' | 'delete'; payload?: unknown; single?: boolean };
import { toast } from 'sonner';
const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/$/, '');
async function request(path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: 'include' });
  } catch (error) {
    const description = error instanceof Error ? error.message : 'No se pudo establecer conexión con el servidor.';
    toast.error('Error de conexión', { description });
    return { data: null, error: new Error(description) };
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (!path.includes('/auth/me')) toast.error('Error de la API', { description: data?.error || `El servidor respondió con el código ${response.status}.` });
    return { data: null, error: new Error(data?.error || `API ${response.status}`) };
  }
  return { data, error: null };
}

class TableQuery implements PromiseLike<{ data: unknown; error: Error | null }> {
  private state: QueryState;
  constructor(table: string) { this.state = { table, filters: {}, operation: 'select' }; }
  select(_columns = '*') { return this; }
  eq(column: string, value: unknown) { this.state.filters[column] = value; return this; }
  order(_column: string, _options?: unknown) { return this; }
  limit(_count: number) { return this; }
  insert(payload: unknown) { this.state.operation = 'insert'; this.state.payload = payload; return this; }
  update(payload: unknown) { this.state.operation = 'update'; this.state.payload = payload; return this; }
  delete() { this.state.operation = 'delete'; return this; }
  single() { this.state.single = true; return this; }
  async then<TResult1 = any, TResult2 = never>(onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) {
    try {
      const { table, filters, operation, payload, single } = this.state;
      const query = new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)]));
      let result;
      if (operation === 'select') result = await request(`/api/${table}${query.size ? `?${query}` : ''}`);
      else if (operation === 'insert') result = await request(`/api/${table}`, { method: 'POST', body: JSON.stringify(payload) });
      else if (operation === 'update') {
        const id = String(filters.id || '');
        result = await request(`/api/${table}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        const deletePath = filters.id ? `/api/${table}/${String(filters.id)}` : `/api/${table}${query.size ? `?${query}` : ''}`;
        result = await request(deletePath, { method: 'DELETE' });
      }
      if (single && Array.isArray(result.data)) result.data = result.data[0] ?? null;
      return onfulfilled ? onfulfilled(result) : result as TResult1;
    } catch (error) { return onrejected ? onrejected(error) : Promise.reject(error); }
  }
}

export const api = {
  from: (table: string): any => new TableQuery(table),
  auth: {
    getUser: async (): Promise<any> => { const result = await request('/api/auth/me'); return { data: result.data ? { user: result.data.user } : { user: null }, error: result.error }; },
    login: async (email: string, password: string) => {
      const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      return result;
    },
    signOut: async () => { await request('/api/auth/logout', { method: 'POST' }); },
  },
  admin: {
    users: {
      get: async () => request('/api/admin/users'),
      create: async (payload: unknown) => request('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
      update: async (id: string, payload: unknown) => request(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    },
  },
  holidays: {
    get: async (year: number) => request(`/api/holidays?year=${year}`),
  },
  agendaHours: {
    get: async () => request('/api/settings/agenda-hours'),
    save: async (hours: { start: string; end: string }) => request('/api/settings/agenda-hours', { method: 'PUT', body: JSON.stringify(hours) }),
  },
  programs: {
    get: async (search?: string) => request(`/api/programs${search?.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`),
  },
  persons: {
    search: async (search: string) => request(`/api/persons/search?search=${encodeURIComponent(search)}`),
    resolve: async (payload: unknown) => request('/api/persons/resolve', { method: 'POST', body: JSON.stringify(payload) }),
  },
  defenses: {
    getParticipants: async (id: string) => request(`/api/defenses/${id}/participants`),
    syncParticipants: async (id: string, participants: unknown[]) => request(`/api/defenses/${id}/participants`, { method: 'PUT', body: JSON.stringify(participants) }),
  },
  functions: { invoke: async (name: string, options: { body?: unknown }) => request(`/api/${name}`, { method: 'POST', body: JSON.stringify(options.body ?? {}) }) },
};

