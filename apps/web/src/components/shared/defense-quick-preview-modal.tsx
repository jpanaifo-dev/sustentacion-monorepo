import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DefenseWithRelations } from '../../types';
import { StatusBadge } from './status-badge';
import { formatDate, formatTime } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Calendar,
  Clock,
  MapPin,
  GraduationCap,
  Users,
  Video,
  Building,
  ArrowRight,
  ExternalLink,
  CalendarCheck2,
  Share2,
  Check,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface DefenseQuickPreviewModalProps {
  defense: DefenseWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  sameDayDefenses?: DefenseWithRelations[];
  onSelectDefense?: (defense: DefenseWithRelations) => void;
  onViewDayTimeline?: (date: string) => void;
}

export const DefenseQuickPreviewModal: React.FC<DefenseQuickPreviewModalProps> = ({
  defense,
  isOpen,
  onClose,
  sameDayDefenses = [],
  onSelectDefense,
  onViewDayTimeline,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);

  if (!defense) return null;

  const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
  const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');
  const advisors = (defense.participants || []).filter((p) => p.participant_type === 'ADVISOR');

  const otherDefensesThisDay = sameDayDefenses.filter((d) => d.id !== defense.id);

  const handleShare = () => {
    const url = `${window.location.origin}/agenda/${defense.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const getCalendarUrl = () => {
    const title = encodeURIComponent(`Sustentación de Tesis: ${defense.title}`);
    const details = encodeURIComponent(
      `Código: ${defense.code}\nUnidad: ${defense.unit?.name || 'EPG UNAP'}\nModalidad: ${defense.modality}\nEnlace oficial: ${window.location.origin}/agenda/${defense.id}`
    );
    const location = encodeURIComponent(defense.space?.name || defense.facility?.name || 'Escuela de Postgrado UNAP');
    const startIso = `${defense.scheduled_date.replace(/-/g, '')}T${defense.start_time.replace(/:/g, '')}00`;
    const endIso = `${defense.scheduled_date.replace(/-/g, '')}T${(defense.estimated_end_time || defense.start_time).replace(/:/g, '')}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  const handleGoToFullDetail = () => {
    onClose();
    navigate(`/agenda/${defense.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 border border-slate-300 shadow-xl rounded-sm">
        {/* Modal Top Institutional Header */}
        <div className="bg-[#091E3A] text-white p-5 sm:p-6 border-b border-amber-400/80">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="font-mono text-xs font-semibold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-sm">
              {defense.code}
            </span>
            <StatusBadge status={defense.status} />
            <span className="text-xs text-slate-300 font-medium">
              {defense.unit?.acronym || defense.unit?.name}
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-slate-800 text-amber-300 border border-slate-700 rounded-sm">
              {defense.modality === 'PRESENTIAL'
                ? 'Presencial'
                : defense.modality === 'VIRTUAL'
                ? 'Virtual'
                : 'Híbrida'}
            </span>
          </div>

          <DialogTitle className="text-base sm:text-lg font-semibold text-white leading-snug tracking-tight">
            {defense.title}
          </DialogTitle>

          <div className="flex items-center gap-2 text-xs text-slate-300 mt-2 font-normal">
            <Building className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{defense.unit?.name || 'Escuela de Postgrado UNAP'}</span>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 bg-white text-slate-900">
          {/* Multiple defenses on the same day switcher banner */}
          {sameDayDefenses.length > 1 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#091E3A]">
                  <Layers className="h-3.5 w-3.5 text-amber-600" />
                  <span>
                    Jornada con {sameDayDefenses.length} sustentaciones ({formatDate(defense.scheduled_date)})
                  </span>
                </div>
                {onViewDayTimeline && (
                  <button
                    onClick={() => {
                      onClose();
                      onViewDayTimeline(defense.scheduled_date);
                    }}
                    className="text-[11px] font-medium text-[#091E3A] hover:underline flex items-center gap-0.5"
                  >
                    <span>Ver jornada</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Quick pills to toggle other defenses in same day */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {sameDayDefenses.map((d, index) => {
                  const isCurrent = d.id === defense.id;
                  const firstStudent = d.participants?.find((p) => p.participant_type === 'STUDENT');
                  const studentName = firstStudent
                    ? `${firstStudent.person.first_name} ${firstStudent.person.last_name.split(' ')[0]}`
                    : d.code;

                  return (
                    <button
                      key={d.id}
                      onClick={() => onSelectDefense && onSelectDefense(d)}
                      disabled={isCurrent}
                      className={`text-xs px-2.5 py-1 rounded-sm border transition-all text-left flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-[#091E3A] text-white border-[#091E3A] font-medium shadow-xs ring-1 ring-[#091E3A]'
                          : 'bg-white text-slate-700 border-amber-200 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                      title={d.title}
                    >
                      <span className="font-mono text-[10px] font-semibold opacity-90">
                        {formatTime(d.start_time).replace(/:\d\d /, ' ')}
                      </span>
                      <span className="truncate max-w-[120px] sm:max-w-[160px]">
                        {studentName}
                      </span>
                      {isCurrent && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Horario */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1">
              <div className="text-slate-500 font-medium flex items-center gap-1.5 text-[11px]">
                <Calendar className="h-3.5 w-3.5 text-amber-600" />
                <span>Fecha y Horario</span>
              </div>
              <div className="font-semibold text-slate-900 text-sm">
                {formatDate(defense.scheduled_date)}
              </div>
              <div className="text-slate-700 flex items-center gap-1 font-mono text-[11px]">
                <Clock className="h-3 w-3 text-slate-400" />
                <span>{formatTime(defense.start_time)} a {formatTime(defense.estimated_end_time)}</span>
                <span className="text-slate-400">({defense.estimated_duration_minutes || 120} min)</span>
              </div>
            </div>

            {/* Ubicación / Enlace */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1">
              <div className="text-slate-500 font-medium flex items-center gap-1.5 text-[11px]">
                {defense.modality === 'VIRTUAL' ? (
                  <Video className="h-3.5 w-3.5 text-blue-600" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 text-amber-600" />
                )}
                <span>Sede y Ambiente</span>
              </div>
              <div className="font-semibold text-slate-900 text-sm truncate" title={defense.space?.name || 'Por asignar'}>
                {defense.space?.name || (defense.modality === 'VIRTUAL' ? 'Plataforma Virtual' : 'Por definir')}
              </div>
              <div className="text-slate-600 text-[11px] truncate">
                {defense.facility?.name || (defense.virtual_platform ? `Plataforma: ${defense.virtual_platform}` : 'Escuela de Postgrado UNAP')}
              </div>
            </div>
          </div>

          {/* Enlace Virtual (si existe) */}
          {defense.virtual_url && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-sm p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-700 shrink-0" />
                <div>
                  <span className="font-semibold text-blue-950">Transmisión Virtual en Vivo</span>
                  <p className="text-[11px] text-blue-800">
                    Plataforma: {defense.virtual_platform || 'Google Meet / Enlace Oficial'}
                  </p>
                </div>
              </div>
              <a
                href={defense.virtual_url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-medium rounded-sm inline-flex items-center gap-1.5 shrink-0 text-xs transition-colors"
              >
                <span>Acceder a Sala</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Candidato al Grado */}
          <div className="border border-slate-200 rounded-sm p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#091E3A] uppercase tracking-wide border-b border-slate-100 pb-2">
              <GraduationCap className="h-4 w-4 text-amber-600" />
              <span>Candidato(s) al Grado (Tesista)</span>
            </div>

            {students.length === 0 ? (
              <p className="text-xs text-slate-500">Tesista por confirmar en el expediente.</p>
            ) : (
              <div className="space-y-1.5">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <div className="font-semibold text-slate-900">
                      {s.person.first_name} {s.person.last_name}
                    </div>
                    {s.person.email && (
                      <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                        {s.person.email}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Jurado Calificador */}
          <div className="border border-slate-200 rounded-sm p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#091E3A] uppercase tracking-wide border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-amber-600" />
                <span>Jurado Calificador Oficial</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono font-normal">
                {jurors.length} integrantes
              </span>
            </div>

            {jurors.length === 0 ? (
              <p className="text-xs text-slate-500">Jurado en proceso de ratificación oficial.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {jurors.map((j) => (
                  <div key={j.id} className="p-2 bg-slate-50 border border-slate-200 rounded-sm flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900 truncate">
                      {j.person.first_name} {j.person.last_name}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-white border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded-sm shrink-0">
                      {j.role || 'Miembro'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asesor */}
          {advisors.length > 0 && (
            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-sm border border-slate-200 flex items-center gap-2">
              <span className="font-medium text-slate-800">Asesor de Tesis:</span>
              <span>{advisors.map((a) => `${a.person.first_name} ${a.person.last_name}`).join(', ')}</span>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Footer with "Ver más" */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="text-xs font-medium rounded-sm border-slate-300 h-9 flex-1 sm:flex-none"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  <span className="text-emerald-700">Copiado</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 mr-1 text-slate-600" />
                  <span>Compartir</span>
                </>
              )}
            </Button>

            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-medium rounded-sm border-slate-300 h-9 flex-1 sm:flex-none"
            >
              <a href={getCalendarUrl()} target="_blank" rel="noreferrer">
                <CalendarCheck2 className="h-3.5 w-3.5 mr-1 text-amber-600" />
                <span>Agendar</span>
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs font-medium rounded-sm border-slate-300 h-9 px-4"
            >
              Cerrar
            </Button>

            {/* Botón Principal Ver Más */}
            <Button
              type="button"
              size="sm"
              onClick={handleGoToFullDetail}
              className="bg-[#091E3A] hover:bg-[#061528] text-white font-medium text-xs uppercase tracking-wider rounded-sm h-9 px-5 gap-1.5 shadow-sm"
            >
              <span>Ver más</span>
              <ArrowRight className="h-3.5 w-3.5 text-amber-400" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
