import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { defensesService } from '../../services/defenses.service';
import { StatusBadge } from '../../components/shared/status-badge';
import { Button } from '../../components/ui/button';
import { formatDate, formatTime, getJurorRoleLabel, getModalityLabel, normalizeDateOnly } from '../../lib/utils';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  GraduationCap,
  Users,
  Video,
  ExternalLink,
  Share2,
  Building,
  Check,
  CalendarCheck2,
  Info
} from 'lucide-react';

const PersonAvatar: React.FC<{ person: any; className?: string }> = ({ person, className = 'h-9 w-9' }) => {
  const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase();
  return person.photo_url ? (
    <img src={person.photo_url} alt="" className={`${className} rounded-full border border-slate-200 object-cover shrink-0`} />
  ) : (
    <span className={`${className} inline-flex items-center justify-center rounded-full border border-slate-200 bg-[#091E3A] text-[11px] font-semibold text-white shrink-0`}>{initials || '—'}</span>
  );
};

export const PublicDefenseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: defense, isLoading, isError } = useQuery({
    queryKey: ['public-defense', id],
    queryFn: () => (id ? defensesService.getDefenseById(id) : null),
    enabled: !!id,
  });

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getCalendarUrl = () => {
    if (!defense) return '#';
    const title = encodeURIComponent(`Sustentación de Tesis: ${defense.title}`);
    const details = encodeURIComponent(
      `Código: ${defense.code}\nUnidad: ${defense.unit?.name || 'EPG UNAP'}\nModalidad: ${defense.modality}\nEnlace oficial: ${window.location.href}`
    );
    const location = encodeURIComponent(defense.space?.name || defense.facility?.name || 'Escuela de Postgrado UNAP');
    const dateOnly = normalizeDateOnly(defense.scheduled_date);
    const startIso = `${dateOnly.replace(/-/g, '')}T${defense.start_time.replace(/:/g, '')}00`;
    const endIso = `${dateOnly.replace(/-/g, '')}T${(defense.estimated_end_time || defense.start_time).replace(/:/g, '')}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#091E3A] border-t-transparent mb-4" />
        <p className="text-sm font-medium text-slate-600">Cargando información de la sustentación...</p>
      </div>
    );
  }

  if (isError || !defense) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="bg-white border border-slate-200 rounded-sm p-8 shadow-sm">
          <Info className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Sustentación no encontrada
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            El registro solicitado no existe, no está disponible en la programación pública o ha sido modificado.
          </p>
          <Button asChild variant="outline" size="sm" className="rounded-sm font-medium">
            <Link to="/agenda">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la Agenda Institucional
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
  const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');
  const advisors = (defense.participants || []).filter((p) => p.participant_type === 'ADVISOR');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Navigation bar & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link to="/agenda" className="hover:text-slate-900 transition-colors">
            Agenda
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-mono">{defense.code}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/agenda')}
            className="rounded-sm border-slate-300 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Volver a la Agenda
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="rounded-sm border-slate-300 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                <span className="text-emerald-700">Enlace copiado</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                <span>Compartir</span>
              </>
            )}
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-sm border-slate-300 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100"
          >
            <a href={getCalendarUrl()} target="_blank" rel="noreferrer">
              <CalendarCheck2 className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
              <span>Agendar</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Main Hero Header Card */}
      <div className="bg-[#091E3A] text-white border border-[#091E3A] rounded-sm overflow-hidden shadow-sm">
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-sm">
              {defense.code}
            </span>
            <StatusBadge status={defense.status} />
            <span className="text-xs font-medium text-slate-300">
              {defense.unit?.acronym || defense.unit?.name}
            </span>
            {defense.unit?.code && (
              <span className="text-[11px] font-medium text-amber-300/90 border border-slate-700 px-2 py-0.5 rounded-sm">
                {defense.unit.code}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight leading-snug">
            {defense.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300 pt-1 font-normal">
            <div className="flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{defense.unit?.name}</span>
            </div>
            <span>·</span>
            <span>Escuela de Postgrado UNAP</span>
          </div>
        </div>

        {/* Quick Info Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[#061528] border-t border-slate-800 text-xs divide-x divide-y md:divide-y-0 divide-slate-800">
          <div className="p-4 space-y-1">
            <div className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              <span>Fecha Programada</span>
            </div>
            <div className="text-sm font-semibold text-white">
              {formatDate(defense.scheduled_date)}
            </div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Horario Oficial</span>
            </div>
            <div className="text-sm font-semibold text-white">
              {formatTime(defense.start_time)} – {formatTime(defense.estimated_end_time)}
            </div>
            <div className="text-[10px] text-slate-400">
              Duración: {defense.estimated_duration_minutes || 120} minutos
            </div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
              <span>Modalidad</span>
            </div>
            <div className="text-sm font-semibold text-white">
              {getModalityLabel(defense.modality)}
            </div>
            <div className="text-[10px] text-slate-400">Defensa institucional</div>
          </div>

          <div className="p-4 space-y-1">
            <div className="text-slate-400 font-medium text-[11px] flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-amber-400" />
              <span>Sede / Espacio</span>
            </div>
            <div className="text-sm font-semibold text-white truncate" title={defense.space?.name || 'Por definir'}>
              {defense.space?.name || (defense.modality === 'VIRTUAL' ? 'Plataforma Virtual' : 'Por asignar')}
            </div>
            {defense.facility?.name && (
              <div className="text-[10px] text-slate-400 truncate">{defense.facility.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* Virtual Link Notice (if applicable) */}
      {defense.virtual_url && (
        <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 bg-blue-900 text-white rounded-sm flex items-center justify-center shrink-0">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-950">
                Audiencia Virtual en Tiempo Real
              </div>
              <p className="text-xs text-blue-900 mt-0.5">
                Plataforma: <span className="font-medium">{defense.virtual_platform || 'Transmisión Oficial'}</span>
              </p>
            </div>
          </div>

          <a
            href={defense.virtual_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-medium uppercase tracking-wider rounded-sm transition-colors self-start sm:self-auto shrink-0"
          >
            <span>Ingresar a la Sala</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Details Grid: Sustentantes, Jurado, Asesores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Sustentantes & Asesores (1 col) */}
        <div className="space-y-6 md:col-span-1">
          {/* Sustentante(s) */}
          <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <GraduationCap className="h-5 w-5 text-[#091E3A]" />
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Candidato(s) al Grado
              </h2>
            </div>

            {students.length === 0 ? (
              <p className="text-xs text-slate-500">No se encontraron tesistas registrados.</p>
            ) : (
              <div className="space-y-3">
                {students.map((s) => (
                  <div key={s.id} className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <PersonAvatar person={s.person} className="h-10 w-10" />
                      {s.person.first_name} {s.person.last_name}
                    </div>
                    {s.person.email && (
                      <div className="text-xs text-slate-500 font-mono">
                        {s.person.email}
                      </div>
                    )}
                    {s.person.document_number && <div className="text-xs text-slate-500">DNI: ****</div>}
                    <div className="pt-1">
                      <span className="inline-block text-[10px] font-medium text-slate-700 bg-white border border-slate-300 px-2 py-0.5 rounded-sm">
                        Tesista Titular
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asesor(es) */}
          {advisors.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Users className="h-5 w-5 text-[#091E3A]" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Dirección de Tesis
                </h2>
              </div>

              <div className="space-y-3">
                {advisors.map((a) => (
                  <div key={a.id} className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1">
                    <div className="flex items-center gap-3 text-base font-medium text-slate-900">
                      <PersonAvatar person={a.person} className="h-10 w-10" />
                      <span>{a.person.first_name} {a.person.last_name}</span>
                    </div>
                    {a.person.email && (
                      <div className="text-xs text-slate-500 font-mono">
                        {a.person.email}
                      </div>
                    )}
                    <div className="pt-1">
                      <span className="inline-block text-[10px] font-medium text-slate-700 bg-white border border-slate-300 px-2 py-0.5 rounded-sm">
                        Asesor Principal
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location details card */}
          {defense.space && (
            <div className="bg-white border border-slate-200 rounded-sm p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <MapPin className="h-5 w-5 text-[#091E3A]" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Ubicación del Acto
                </h2>
              </div>
              <div className="text-xs text-slate-700 space-y-1.5">
                <div>
                  <span className="text-slate-500">Espacio / Aula: </span>
                  <span className="font-medium text-slate-900">{defense.space.name}</span>
                </div>
                {defense.space.floor && (
                  <div>
                    <span className="text-slate-500">Piso / Nivel: </span>
                    <span>{defense.space.floor}</span>
                  </div>
                )}
                {defense.space.location_reference && (
                  <div>
                    <span className="text-slate-500">Referencia: </span>
                    <span>{defense.space.location_reference}</span>
                  </div>
                )}
                {defense.facility?.name && (
                  <div>
                    <span className="text-slate-500">Edificio: </span>
                    <span>{defense.facility.name}</span>
                  </div>
                )}
                {defense.facility?.address && (
                  <div>
                    <span className="text-slate-500">Dirección: </span>
                    <span>{defense.facility.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Jurado Calificador & Observaciones (2 cols) */}
        <div className="space-y-6 md:col-span-2">
          {/* Jurado Calificador */}
          <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#091E3A]" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Jurado Calificador Designado
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {jurors.length} miembros oficiales
              </span>
            </div>

            {jurors.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                El jurado calificador se encuentra en proceso de designación oficial.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {jurors.map((j) => (
                  <div key={j.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                      <PersonAvatar person={j.person} className="h-10 w-10" />
                        {j.person.first_name} {j.person.last_name}
                      </div>
                      {j.person.email && (
                        <div className="text-xs text-slate-500 font-mono">
                          {j.person.email}
                        </div>
                      )}
                    {j.person.document_number && <div className="text-xs text-slate-500">DNI: ****</div>}
                    </div>

                    <span className="text-xs font-medium text-[#091E3A] bg-slate-100 border border-slate-200 px-3 py-1 rounded-sm uppercase tracking-wide self-start sm:self-auto shrink-0">
                      {getJurorRoleLabel(j.role)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observaciones o notas de convocatoria */}
          {defense.observations && (
            <div className="bg-white border border-slate-200 rounded-sm p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Info className="h-5 w-5 text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Indicaciones y Protocolo del Acto
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                {defense.observations}
              </p>
            </div>
          )}

          {/* Historial de reprogramación si la hubiere */}
          {defense.reschedules && defense.reschedules.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-sm p-5 space-y-3">
              <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Historial de Reprogramación
              </h2>
              <div className="space-y-2 text-xs text-slate-600 font-normal">
                {defense.reschedules.map((r) => (
                  <div key={r.id} className="p-2.5 bg-white border border-slate-200 rounded-sm">
                    <div className="text-slate-900 font-medium">
                      Anteriormente: {formatDate(r.previous_date)} a las {formatTime(r.previous_start_time)}
                    </div>
                    {r.reason && (
                      <div className="text-slate-600 mt-1">
                        Motivo: {r.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
