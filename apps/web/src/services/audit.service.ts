import { isLiveSupabase, supabase } from '../lib/supabase';
import { AuditLog } from '../types';

export const auditService = {
  async getLogs(): Promise<AuditLog[]> {
    if (isLiveSupabase) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as AuditLog[]) || [];
    }
    const stored = localStorage.getItem('epg_audit_logs');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  },

  async logAction(params: {
    action: string;
    entity_type: string;
    entity_id?: string | null;
    old_values?: any;
    new_values?: any;
    metadata?: any;
    user_id?: string | null;
  }): Promise<void> {
    const payload = {
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      old_values: params.old_values || null,
      new_values: params.new_values || null,
      metadata: params.metadata || null,
      user_id: params.user_id || null,
      created_at: new Date().toISOString(),
    };

    if (isLiveSupabase) {
      try {
        await supabase.from('audit_logs').insert(payload as any);
      } catch (err) {
        console.error('Error logging to Supabase audit:', err);
      }
    } else {
      const logs = await this.getLogs();
      const newLog: AuditLog = {
        id: `audit-${Date.now()}`,
        ...payload,
        ip_address: '127.0.0.1',
        user_agent: navigator.userAgent,
      };
      logs.unshift(newLog);
      localStorage.setItem('epg_audit_logs', JSON.stringify(logs.slice(0, 200)));
    }
  },
};
