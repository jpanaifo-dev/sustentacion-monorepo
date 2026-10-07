import { api } from './api';

// Compatibilidad temporal para no tocar las pantallas: los servicios existentes
// conservan su interfaz, pero todas las operaciones pasan por nuestra API.
export const isLiveSupabase = true;
export const supabase = api;
