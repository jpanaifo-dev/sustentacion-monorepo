import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DefenseWithRelations } from '../../types';
import { StatusBadge } from './status-badge';
import { formatDate, formatTime, getJurorRoleLabel, getModalityLabel, normalizeDateOnly } from '../../lib/utils';
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

const PersonAvatar: React.FC<{ person: any; className?: string }> = ({ person, className = 'h-10 w-10' }) => {
  const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase();
  return person.photo_url ? (
    <img src={person.photo_url} alt="" className={`${className} rounded-full border border-slate-200 object-cover shrink-0`} />
  ) : (
    <span className={`${className} inline-flex items-center justify-center rounded-full border border-slate-200 bg-[#091E3A] text-[10px] font-semibold text-white shrink-0`}>{initials || '—'}</span>
  );
};

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
    const dateOnly = normalizeDateOnly(defense.scheduled_date);
    const startIso = `${dateOnly.replace(/-/g, '')}T${defense.start_time.replace(/:/g, '')}00`;
    const endIso = `${dateOnly.replace(/-/g, '')}T${(defense.estimated_end_time || defense.start_time).replace(/:/g, '')}00`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  const handleGoToFullDetail = () => {
    onClose();
    navigate(`/agenda/${defense.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-4xl overflow-hidden border border-slate-200 bg-white p-0 shadow-2xl rounded-sm">
        {/* Modal Top Institutional Header */}
        <div className="shrink-0 bg-white text-slate-900 p-5 sm:p-6 lg:px-8 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <span className="font-mono text-xs font-semibold bg-amber-100 text-slate-900 border border-amber-300 px-2 py-0.5 rounded-sm">
              {defense.code}
            </span>
            <StatusBadge status={defense.status} />
            <span className="text-xs text-slate-500 font-medium">
              {defense.unit?.acronym || defense.unit?.name}
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-sm">{getModalityLabel(defense.modality)}</span>
          </div>

          <DialogTitle className="text-lg sm:text-2xl font-semibold text-slate-900 leading-snug tracking-tight">
            {defense.title}
          </DialogTitle>

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 font-normal">
            <span className="truncate">{defense.unit?.name || 'Escuela de Postgrado UNAP'}</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-white text-slate-900">
          {/* Multiple defenses on the same day switcher banner */}
          {sameDayDefenses.length > 1 && (
            <div className="bg-slate-50 border border-slate-200 rounded-sm p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
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
                    className="text-[11px] font-medium text-amber-300 hover:underline flex items-center gap-0.5"
                  >
                    <span>Ver jornada</span>
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
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
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

          <div className="overflow-hidden rounded-sm border border-slate-200 text-sm">
            {[
              ['Fecha', formatDate(defense.scheduled_date)],
              ['Horario', `${formatTime(defense.start_time)} a ${formatTime(defense.estimated_end_time)} (${defense.estimated_duration_minutes || 120} min)`],
              ['Modalidad', getModalityLabel(defense.modality)],
              ['Sede', defense.facility?.name || 'No asignada'],
              ['Espacio', defense.space?.name || (defense.modality === 'VIRTUAL' ? defense.virtual_platform || 'Plataforma virtual' : 'No asignado')],
              ...(defense.office_number ? [['Número de oficio / documento', defense.office_number]] : []),
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-[minmax(135px,0.38fr)_minmax(0,1fr)] border-b border-slate-100 last:border-b-0">
                <div className="bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-500">{label}</div>
                <div className="px-3 py-2.5 text-sm font-semibold text-slate-900">{value}</div>
              </div>
            ))}
          </div>

          {/* Enlace Virtual (si existe) */}
          {defense.virtual_url && (
            <div className="bg-blue-50 border border-blue-200 rounded-sm p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
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
              </a>
            </div>
          )}

          {/* Candidato al Grado */}
          <div className="border border-slate-200 bg-white rounded-sm p-3.5 space-y-2">
            <div className="text-xs font-semibold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Candidato(s) al Grado (Tesista)</div>

            {students.length === 0 ? (
              <p className="text-xs text-slate-500">Tesista por confirmar en el expediente.</p>
            ) : (
              <div className="space-y-1.5">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3 text-base font-semibold text-slate-900">
                      <PersonAvatar person={s.person} />
                      <span>{s.person.first_name} {s.person.last_name}</span>
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
          <div className="border border-slate-200 bg-white rounded-sm p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              <span>Jurado Calificador Oficial</span>
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
                    <span className="flex items-center gap-2 font-medium text-slate-900 truncate">
                      <PersonAvatar person={j.person} className="h-9 w-9" />
                      {j.person.first_name} {j.person.last_name}
                    </span>
                    <span className="text-[10px] font-mono uppercase bg-white border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded-sm shrink-0">
                      {getJurorRoleLabel(j.role)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Asesor */}
          {advisors.length > 0 && (
            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-sm border border-slate-200 flex items-center gap-2">
              <span className="font-medium text-slate-900">Asesor de Tesis:</span>
              <span className="flex items-center gap-1.5 text-base">
                {advisors.slice(0, 2).map((advisor) => <PersonAvatar key={advisor.id} person={advisor.person} className="h-8 w-8" />)}
                {advisors.map((a) => `${a.person.first_name} ${a.person.last_name}`).join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Footer with "Ver más" */}
        <div className="shrink-0 p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="text-xs font-medium rounded-sm border-slate-300 text-slate-700 hover:bg-white h-9 flex-1 sm:flex-none"
            >
              {copied ? (
                <span className="text-emerald-700">Copiado</span>
              ) : (
                <span>Compartir</span>
              )}
            </Button>

            <Button
              asChild
              type="button"
              variant="outline"
              size="sm"
              className="text-xs font-medium rounded-sm border-slate-300 text-slate-700 hover:bg-white h-9 flex-1 sm:flex-none"
            >
              <a href={getCalendarUrl()} target="_blank" rel="noreferrer">
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
              className="text-xs font-medium rounded-sm border-slate-300 text-slate-700 hover:bg-white h-9 px-4"
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
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
