import { isLiveSupabase, supabase } from '../lib/supabase';
import { Notification } from '../types';
import { auditService } from './audit.service';

export const notificationsService = {
  async getNotifications(defenseId?: string): Promise<Notification[]> {
    if (isLiveSupabase) {
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (defenseId) {
        query = query.eq('defense_id', defenseId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data as Notification[]) || [];
    }
    const stored = localStorage.getItem('epg_notifications');
    const notifs: Notification[] = stored ? JSON.parse(stored) : [];
    if (defenseId) {
      return notifs.filter((n) => n.defense_id === defenseId);
    }
    return notifs;
  },

  async sendDefenseNotification(params: {
    defense_id: string;
    type: 'CONFIRMATION' | 'RESCHEDULE' | 'CANCELLATION';
    reason?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (isLiveSupabase) {
      const { data, error } = await supabase.functions.invoke('send-defense-notification', {
        body: params,
      });
      if (error) throw error;
      return { success: true, message: 'Notificación procesada y enviada' };
    }

    // Local simulated notification
    const existing = await this.getNotifications();
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      defense_id: params.defense_id,
      type: params.type,
      recipient_email: 'posgrado@unapiquitos.edu.pe',
      recipient_name: 'Comunidad Académica EPG',
      status: 'SENT',
      provider: 'resend-simulated',
      provider_message_id: `msg-${Date.now()}`,
      error: null,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    existing.unshift(newNotif);
    localStorage.setItem('epg_notifications', JSON.stringify(existing));

    await auditService.logAction({
      action: 'NOTIFICATION_SENT',
      entity_type: 'defense',
      entity_id: params.defense_id,
      metadata: { type: params.type, reason: params.reason },
    });

    return { success: true, message: `Correo de ${params.type} enviado con éxito vía Resend` };
  },
};
