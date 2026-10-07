import React, { useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defensesService } from '../../../services/defenses.service';
import { spacesService } from '../../../services/spaces.service';
import { notificationsService } from '../../../services/notifications.service';
import { mediaService } from '../../../services/media.service';
import { useAuth } from '../../../app/providers/auth-provider';
import { PageHeader } from '../../../components/shared/page-header';
import { StatusBadge } from '../../../components/shared/status-badge';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { formatDate, formatTime } from '../../../lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  Users,
  Video,
  FileEdit,
  CheckCircle2,
  CalendarClock,
  CheckCheck,
  XCircle,
  RotateCcw,
  Mail,
  Upload,
  ArrowLeft,
  ExternalLink,
  ShieldAlert,
  FileText,
  Trash2,
  Info,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { toast } from 'sonner';

export const DefenseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = useAuth();

  // Dialog states
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [reopenModalOpen, setReopenModalOpen] = useState(false);

  // Form values in dialogs
  const [rescheduleForm, setRescheduleForm] = useState({
    new_date: '',
    new_start_time: '10:00',
    new_space_id: '',
    reason: '',
  });
  const [cancelReason, setCancelReason] = useState('');
  const [completeForm, setCompleteForm] = useState({ actual_end_time: '', final_observations: '' });
  const [reopenReason, setReopenReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  // Queries
  const { data: defense, isLoading } = useQuery({
    queryKey: ['defense', id],
    queryFn: () => (id ? defensesService.getDefenseById(id) : null),
    enabled: !!id,
  });

  const { data: spaces = [] } = useQuery({
    queryKey: ['spaces'],
    queryFn: () => spacesService.getSpaces(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', id],
    queryFn: () => (id ? notificationsService.getNotifications(id) : []),
    enabled: !!id,
  });

  const { data: mediaList = [] } = useQuery({
    queryKey: ['media', 'defense_evidence', id],
    queryFn: () => (id ? mediaService.getMediaByEntity('defense_evidence', id) : []),
    enabled: !!id,
  });

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: () => defensesService.confirmDefense(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defense', id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', id] });
      setActionError(null);
      toast.success('Sustentación confirmada', { description: 'El estado se actualizó correctamente.' });
    },
    onError: (err: any) => { setActionError(err.message); toast.error('No se pudo confirmar', { description: err.message }); },
  });

  const rescheduleMutation = useMutation({
    mutationFn: () =>
      defensesService.rescheduleDefense({
        defenseId: id!,
        new_date: rescheduleForm.new_date,
        new_start_time: rescheduleForm.new_start_time.includes(':') && rescheduleForm.new_start_time.split(':').length === 2 ? `${rescheduleForm.new_start_time}:00` : rescheduleForm.new_start_time,
        new_space_id: rescheduleForm.new_space_id || defense?.space_id,
        reason: rescheduleForm.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defense', id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', id] });
      setRescheduleModalOpen(false);
      setActionError(null);
      toast.success('Sustentación reprogramada', { description: 'La nueva fecha y horario fueron guardados.' });
    },
    onError: (err: any) => { setActionError(err.message); toast.error('No se pudo reprogramar', { description: err.message }); },
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      defensesService.completeDefense({
        defenseId: id!,
        actual_end_time: completeForm.actual_end_time || null,
        final_observations: completeForm.final_observations || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defense', id] });
      setCompleteModalOpen(false);
      setActionError(null);
      toast.success('Sustentación completada', { description: 'El estado se actualizó correctamente.' });
    },
    onError: (err: any) => { setActionError(err.message); toast.error('No se pudo completar', { description: err.message }); },
  });

  const reopenMutation = useMutation({
    mutationFn: () => defensesService.reopenDefense({ defenseId: id!, reason: reopenReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defense', id] });
      setReopenModalOpen(false);
      setActionError(null);
      toast.success('Sustentación reabierta', { description: 'Ahora puede volver a editarse.' });
    },
    onError: (err: any) => { setActionError(err.message); toast.error('No se pudo reabrir', { description: err.message }); },
  });

  const cancelMutation = useMutation({
    mutationFn: () => defensesService.cancelDefense({ defenseId: id!, cancellation_reason: cancelReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['defense', id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', id] });
      setCancelModalOpen(false);
      setActionError(null);
      toast.success('Sustentación cancelada', { description: 'El cambio se guardó correctamente.' });
    },
    onError: (err: any) => { setActionError(err.message); toast.error('No se pudo cancelar', { description: err.message }); },
  });

  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      return mediaService.uploadMedia({ entity_type: 'defense_evidence', entity_id: id!, file });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'defense_evidence', id] });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (mediaId: string) => mediaService.deleteMedia(mediaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', 'defense_evidence', id] });
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500">Cargando información de la sustentación...</div>;
  }

  if (!defense) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <p>No se encontró la sustentación solicitada.</p>
        <Button onClick={() => navigate('/admin/defenses')}>Volver al listado</Button>
      </div>
    );
  }

  const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
  const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');
  const advisors = (defense.participants || []).filter((p) => p.participant_type === 'ADVISOR');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-slate-600 self-start"
          onClick={() => navigate('/admin/defenses')}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver al Listado</span>
        </Button>

        {/* State Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {defense.status !== 'COMPLETED' && defense.status !== 'CANCELLED' && (
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
              <NavLink to={`/admin/defenses/${defense.id}/edit`}>
                <FileEdit className="h-3.5 w-3.5" />
                <span>Editar</span>
              </NavLink>
            </Button>
          )}

          {defense.status === 'DRAFT' && (
            <Button
              variant="unap"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                setActionError(null);
                confirmMutation.mutate();
              }}
              disabled={confirmMutation.isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>{confirmMutation.isPending ? 'Confirmando...' : 'Confirmar Sustentación'}</span>
            </Button>
          )}

          {['CONFIRMED', 'RESCHEDULED'].includes(defense.status) && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                onClick={() => {
                  setActionError(null);
                  setRescheduleForm({
                    new_date: defense.scheduled_date,
                    new_start_time: defense.start_time.substring(0, 5),
                    new_space_id: defense.space_id || '',
                    reason: '',
                  });
                  setRescheduleModalOpen(true);
                }}
              >
                <CalendarClock className="h-3.5 w-3.5" />
                <span>Reprogramar</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                onClick={() => {
                  setActionError(null);
                  setCompleteModalOpen(true);
                }}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Finalizar (Completada)</span>
              </Button>
            </>
          )}

          {defense.status === 'COMPLETED' && (isSuperAdmin || hasPermission('defenses.reopen')) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
              onClick={() => {
                setActionError(null);
                setReopenModalOpen(true);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reabrir Sustentación</span>
            </Button>
          )}

          {defense.status !== 'COMPLETED' && defense.status !== 'CANCELLED' && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-rose-600 hover:bg-rose-50"
              onClick={() => {
                setActionError(null);
                setCancelModalOpen(true);
              }}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancelar</span>
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 text-xs font-medium">
          {actionError}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm font-bold text-unap-navy bg-slate-100 px-3 py-1 rounded-md">
            {defense.code}
          </span>
          <StatusBadge status={defense.status} />
          <span className="text-xs font-semibold text-slate-500 uppercase">
            {defense.unit?.acronym || defense.unit?.name}
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
          {defense.title}
        </h1>

        <p className="text-xs text-slate-500">
          Unidad: <strong>{defense.unit?.name}</strong> • Registro creado el {formatDate(defense.created_at)}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <span title="Referencia del oficio institucional"><Info className="h-3.5 w-3.5 cursor-help text-slate-400" /></span>
          <span className="font-medium">Número de oficio:</span>
          <span>{defense.office_number || 'No asignado'}</span>
        </div>
      </div>

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Programación & Ubicación */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-unap-navy" />
                <span>Horario y Ubicación</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-medium">Fecha Programada</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{formatDate(defense.scheduled_date)}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-medium">Horario</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {formatTime(defense.start_time)} - {formatTime(defense.estimated_end_time)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Duración estimada: {defense.estimated_duration_minutes} min</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-medium">Modalidad</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{defense.modality}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-slate-400 font-medium">Espacio e Instalación</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{defense.space?.name || 'Por asignar'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{defense.facility?.name}</div>
                </div>
              </div>

              {/* Virtual Link if virtual or hybrid */}
              {defense.virtual_url && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-700" />
                    <span>Plataforma virtual: <strong>{defense.virtual_platform || 'Enlace de transmisión'}</strong></span>
                  </div>
                  <a
                    href={defense.virtual_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                  >
                    <span>Ingresar a sala</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participantes */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-unap-navy" />
                <span>Participantes de la Sustentación</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {/* Sustentantes */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                  Sustentante(s) ({students.length})
                </h4>
                <div className="space-y-2">
                  {students.length === 0 ? <p className="rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3 text-xs italic text-slate-500">No asignado</p> : students.map((s) => (
                    <div key={s.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          {s.person.photo_url ? <img src={s.person.photo_url} alt="" className="h-8 w-8 rounded-full border border-slate-200 object-cover" /> : <span className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100" />}
                          <span>{s.person.first_name} {s.person.last_name}</span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {s.person.email || 'Correo no asignado'} • DNI: {s.person.document_number || 'No asignado'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold text-[10px]">
                        Sustentante
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Jurados */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                  Jurado Calificador ({jurors.length})
                </h4>
                <div className="space-y-2">
                  {jurors.length === 0 ? <p className="rounded-sm border border-dashed border-slate-200 bg-slate-50 p-3 text-xs italic text-slate-500">No asignado</p> : jurors.map((j) => (
                    <div key={j.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          {j.person.photo_url ? <img src={j.person.photo_url} alt="" className="h-8 w-8 rounded-full border border-slate-200 object-cover" /> : <span className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100" />}
                          <span>{j.person.first_name} {j.person.last_name}</span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          {j.person.email || 'Correo no asignado'} • DNI: {j.person.document_number || 'No asignado'} • Tel: {j.person.phone || 'No asignado'}
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded bg-slate-200 text-slate-800 font-semibold text-[11px]">
                        {j.role || 'Miembro'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asesores */}
              {advisors.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                    Asesor(a) de Tesis
                  </h4>
                  <div className="space-y-2">
                    {advisors.map((a) => (
                      <div key={a.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          {a.person.photo_url ? <img src={a.person.photo_url} alt="" className="h-8 w-8 rounded-full border border-slate-200 object-cover" /> : <span className="h-8 w-8 rounded-full border border-slate-200 bg-slate-100" />}
                          <span>{a.person.first_name} {a.person.last_name}</span>
                        </div>
                        <div className="mt-0.5 text-slate-500">{a.person.email || 'Correo no asignado'} • DNI: {a.person.document_number || 'No asignado'} • Tel: {a.person.phone || 'No asignado'}</div>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px]">
                          Asesor
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de Reprogramaciones */}
          {(defense.reschedules || []).length > 0 && (
            <Card className="shadow-xs border-blue-200">
              <CardHeader className="pb-3 border-b border-blue-100 bg-blue-50/50">
                <CardTitle className="text-base font-bold text-blue-950 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-blue-700" />
                  <span>Historial de Reprogramaciones ({defense.reschedules?.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {defense.reschedules?.map((r) => (
                  <div key={r.id} className="p-3.5 rounded-lg border border-blue-200 bg-blue-50/30 text-xs space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                      <div>
                        <span className="text-slate-500 font-semibold">Programación Anterior:</span>
                        <div className="font-mono text-slate-800">{formatDate(r.previous_date)} • {formatTime(r.previous_start_time)}</div>
                      </div>
                      <div>
                        <span className="text-blue-700 font-semibold">Nueva Programación:</span>
                        <div className="font-mono font-bold text-blue-900">{formatDate(r.new_date)} • {formatTime(r.new_start_time)}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-blue-100 text-slate-800">
                      <strong className="text-slate-600">Motivo de reprogramación:</strong> {r.reason}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Evidencias / Archivos Multimedia (Cloudflare) */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Upload className="h-4 w-4 text-unap-navy" />
                  <span>Evidencias y Actas (Cloudflare)</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Fotografías de sustentación, acta firmada o documentos probatorios
                </CardDescription>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMediaMutation.mutate(file);
                  }}
                  accept="image/*,application/pdf"
                />
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-unap-navy text-white hover:bg-unap-blue transition-all">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Subir Evidencia</span>
                </span>
              </label>
            </CardHeader>
            <CardContent className="pt-5">
              {mediaList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  No hay evidencias o actas adjuntas aún.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mediaList.map((m) => (
                    <div key={m.id} className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                      {m.mime_type?.startsWith('image/') ? (
                        <img src={m.url} alt="Evidencia" className="h-28 w-full object-cover" />
                      ) : (
                        <div className="h-28 flex flex-col items-center justify-center p-2 text-slate-600">
                          <FileText className="h-8 w-8 text-slate-400 mb-1" />
                          <span className="text-[11px] font-medium truncate max-w-full">Documento PDF</span>
                        </div>
                      )}
                      <div className="p-2 bg-white flex items-center justify-between text-[11px]">
                        <a href={m.url} target="_blank" rel="noreferrer" className="text-unap-navy font-semibold hover:underline">
                          Ver archivo
                        </a>
                        <button
                          onClick={() => deleteMediaMutation.mutate(m.id)}
                          className="text-rose-500 hover:text-rose-700"
                          title="Eliminar evidencia"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Notas, Notificaciones y Auditoría (1 col) */}
        <div className="space-y-6">
          {/* Observaciones y Notas Internas */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">
                Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs text-slate-700">
              <div>
                <span className="font-semibold text-slate-500 block mb-0.5">Observaciones Generales:</span>
                <p className="bg-slate-50 p-2.5 rounded border border-slate-100">
                  {defense.observations || 'Sin observaciones registradas.'}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-0.5">Notas Internas de Grados (Privado):</span>
                <p className="bg-amber-50/70 p-2.5 rounded border border-amber-100 text-amber-900">
                  {defense.internal_notes || 'Sin notas internas.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notificaciones Resend */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-unap-navy" />
                <span>Notificaciones (Resend)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No se registran correos enviados para esta sustentación.
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{n.type}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          {n.status}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] truncate">Para: {n.recipient_email}</div>
                      <div className="text-slate-400 text-[10px]">{formatDate(n.sent_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reschedule Modal */}
      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-blue-900">Reprogramar Sustentación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-xs text-slate-600">
              Los cambios de fecha, hora o espacio quedarán registrados en el historial oficial de reprogramaciones y se notificará por correo.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nueva Fecha *</Label>
                <Input
                  type="date"
                  value={rescheduleForm.new_date}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, new_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nueva Hora *</Label>
                <Input
                  type="time"
                  value={rescheduleForm.new_start_time}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, new_start_time: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nuevo Espacio Físico</Label>
              <select
                value={rescheduleForm.new_space_id}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, new_space_id: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
              >
                <option value="">Mantener espacio actual ({defense.space?.name})</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo Institucional de Reprogramación *</Label>
              <Textarea
                rows={3}
                placeholder="Indique con detalle el motivo de la reprogramación (ej. solicitud de jurado por comisión oficial)..."
                value={rescheduleForm.reason}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
              />
            </div>

            {actionError && (
              <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {actionError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleModalOpen(false)}>Cancelar</Button>
            <Button
              className="bg-blue-700 hover:bg-blue-800 text-white"
              disabled={!rescheduleForm.new_date || !rescheduleForm.reason || rescheduleMutation.isPending}
              onClick={() => rescheduleMutation.mutate()}
            >
              {rescheduleMutation.isPending ? 'Reprogramando...' : 'Confirmar Reprogramación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Modal */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-purple-900">Finalizar Sustentación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-xs text-slate-600">
              Registrar el término formal de la sustentación y las observaciones de dictamen del jurado.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Hora Real de Culminación</Label>
              <Input
                type="time"
                value={completeForm.actual_end_time}
                onChange={(e) => setCompleteForm({ ...completeForm, actual_end_time: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observaciones Finales / Calificación</Label>
              <Textarea
                rows={3}
                placeholder="Ej. Aprobado por unanimidad con felicitación pública. Acta N° 045-2026 firmada."
                value={completeForm.final_observations}
                onChange={(e) => setCompleteForm({ ...completeForm, final_observations: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>Cancelar</Button>
            <Button
              className="bg-purple-700 hover:bg-purple-800 text-white"
              disabled={completeMutation.isPending}
              onClick={() => completeMutation.mutate()}
            >
              {completeMutation.isPending ? 'Finalizando...' : 'Marcar como Completada'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Modal */}
      <Dialog open={reopenModalOpen} onOpenChange={setReopenModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-900">Reabrir Sustentación Finalizada</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-xs text-slate-600">
              Esta acción requiere permisos especiales y quedará registrada en auditoría. La sustentación volverá a estado CONFIRMADA para permitir modificaciones.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo de Reapertura *</Label>
              <Textarea
                rows={3}
                placeholder="Fundamente la razón por la que se reabre una sustentación completada..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenModalOpen(false)}>Cancelar</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={reopenReason.trim().length < 5 || reopenMutation.isPending}
              onClick={() => reopenMutation.mutate()}
            >
              {reopenMutation.isPending ? 'Reabriendo...' : 'Confirmar Reapertura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-rose-800">Cancelar Sustentación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-xs text-slate-600">
              La sustentación cambiará a estado CANCELLED. No se eliminará de los registros de auditoría.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo de Cancelación *</Label>
              <Textarea
                rows={3}
                placeholder="Indique el motivo justificado de la cancelación..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>Volver</Button>
            <Button
              variant="destructive"
              disabled={cancelReason.trim().length < 5 || cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
