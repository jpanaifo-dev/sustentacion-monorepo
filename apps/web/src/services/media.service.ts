import { isLiveSupabase, supabase } from '../lib/supabase';
import { Media } from '../types';
import { auditService } from './audit.service';

export const mediaService = {
  async getMediaByEntity(entityType: string, entityId: string): Promise<Media[]> {
    if (isLiveSupabase) {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as Media[]) || [];
    }

    const stored = localStorage.getItem('epg_media');
    const allMedia: Media[] = stored ? JSON.parse(stored) : [];
    return allMedia.filter((m) => m.entity_type === entityType && m.entity_id === entityId);
  },

  async uploadMedia(params: {
    entity_type: string;
    entity_id: string;
    file: File;
  }): Promise<Media> {
    if (isLiveSupabase) {
      // 1. Ask Edge function for Cloudflare direct upload URL
      const { data: uploadInfo, error: funcError } = await supabase.functions.invoke('create-media-upload', {
        body: { entity_type: params.entity_type, entity_id: params.entity_id },
      });
      if (funcError) throw funcError;

      let publicUrl = '';
      let assetId = '';

      if (uploadInfo.uploadUrl) {
        // Direct upload to Cloudflare
        const formData = new FormData();
        formData.append('file', params.file);
        const cfRes = await fetch(uploadInfo.uploadUrl, { method: 'POST', body: formData });
        const cfData = await cfRes.json();
        assetId = uploadInfo.assetId;
        publicUrl = cfData.result?.variants?.[0] || `https://imagedelivery.net/${assetId}/public`;
      } else {
        // Fallback / mock
        publicUrl = uploadInfo.publicUrlPlaceholder || URL.createObjectURL(params.file);
        assetId = uploadInfo.assetId;
      }

      // 2. Insert into media table
      const { data: mediaRow, error: insertError } = await supabase
        .from('media')
        .insert({
          entity_type: params.entity_type,
          entity_id: params.entity_id,
          provider: 'cloudflare',
          provider_asset_id: assetId,
          url: publicUrl,
          mime_type: params.file.type,
          file_size: params.file.size,
          sort_order: 0,
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;
      return mediaRow as Media;
    }

    // Local simulated media storage
    const stored = localStorage.getItem('epg_media');
    const allMedia: Media[] = stored ? JSON.parse(stored) : [];
    const previewUrl = URL.createObjectURL(params.file);

    const newMedia: Media = {
      id: `media-${Date.now()}`,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      provider: 'cloudflare',
      provider_asset_id: `cf-asset-${Date.now()}`,
      url: previewUrl,
      mime_type: params.file.type,
      file_size: params.file.size,
      sort_order: allMedia.length,
      created_by: 'user-super-admin',
      created_at: new Date().toISOString(),
    };

    allMedia.push(newMedia);
    localStorage.setItem('epg_media', JSON.stringify(allMedia));

    await auditService.logAction({
      action: 'MEDIA_UPLOADED',
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      metadata: { fileName: params.file.name, size: params.file.size },
    });

    return newMedia;
  },

  async deleteMedia(id: string): Promise<void> {
    if (isLiveSupabase) {
      const { error } = await supabase.from('media').delete().eq('id', id);
      if (error) throw error;
      return;
    }

    const stored = localStorage.getItem('epg_media');
    const allMedia: Media[] = stored ? JSON.parse(stored) : [];
    const filtered = allMedia.filter((m) => m.id !== id);
    localStorage.setItem('epg_media', JSON.stringify(filtered));

    await auditService.logAction({
      action: 'MEDIA_DELETED',
      entity_type: 'media',
      entity_id: id,
    });
  },
};
