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
  Info,
  Printer,
  Award,
  BookOpen,
  FileText,
  ShieldCheck,
  ChevronRight,
  Sparkles
} from 'lucide-react';

function parseFullDate(dateStr: string | null | undefined) {
  if (!dateStr) return { dayStr: '--', monthStr: '---', monthLong: '---', weekdayFull: '---', year: '' };
  try {
    const [year, month, day] = normalizeDateOnly(dateStr).split('-').map(Number);
    if (!year || !month || !day) return { dayStr: '--', monthStr: '---', monthLong: '---', weekdayFull: '---', year: '' };
    const date = new Date(year, month - 1, day);
    const dayStr = String(day).padStart(2, '0');
    const monthStr = date.toLocaleDateString('es-PE', { month: 'short' }).toUpperCase().replace('.', '');
    const monthLong = date.toLocaleDateString('es-PE', { month: 'long' });
    const weekdayFull = date.toLocaleDateString('es-PE', { weekday: 'long' });
    return { dayStr, monthStr, monthLong, weekdayFull, year };
  } catch {
    return { dayStr: '--', monthStr: '---', monthLong: '---', weekdayFull: '---', year: '' };
  }
}

const PersonAvatar: React.FC<{ person: any; className?: string }> = ({ person, className = 'h-11 w-11' }) => {
  const initials = `${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`.toUpperCase();
  return person?.photo_url ? (
    <img
      src={person.photo_url}
      alt={`${person.first_name || ''} ${person.last_name || ''}`}
      className={`${className} rounded-full border border-stone-300 object-cover shrink-0 shadow-xs`}
    />
  ) : (
    <span
      className={`${className} inline-flex items-center justify-center rounded-full border border-stone-300 bg-[#091E3A] text-xs font-bold text-white shrink-0 tracking-wider shadow-xs`}
    >
      {initials || '—'}
    </span>
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

  const handlePrint = () => {
    window.print();
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 bg-[#FAF8F5]">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-3 border-[#091E3A] border-t-transparent mb-4" />
        <p className="text-xs uppercase tracking-widest font-bold text-slate-700">Cargando información oficial de la sustentación...</p>
        <p className="text-xs text-slate-500 mt-1">Escuela de Postgrado UNAP</p>
      </div>
    );
  }

  if (isError || !defense) {
    return (
      <div className="min-h-[60vh] bg-[#FAF8F5] py-20 px-4 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white border border-stone-300 rounded-sm p-8 sm:p-10 text-center shadow-sm space-y-5">
          <div className="h-14 w-14 rounded-full bg-stone-100 border border-stone-200 text-stone-600 flex items-center justify-center mx-auto">
            <Info className="h-7 w-7 text-slate-700" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-[#091E3A]">
              Sustentación no encontrada
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              El registro solicitado no existe, ha sido modificado o no está disponible en la programación pública institucional.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-sm font-semibold uppercase text-xs tracking-wider border-stone-400">
            <Link to="/agenda">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la Agenda Institucional
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const dateParts = parseFullDate(defense.scheduled_date);
  const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
  const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');
  const advisors = (defense.participants || []).filter((p) => p.participant_type === 'ADVISOR');

  // Sort jurors by role hierarchy: PRESIDENT -> SECRETARY -> MEMBER -> OTHER
  const rolePriority: Record<string, number> = {
    PRESIDENT: 1,
    SECRETARY: 2,
    MEMBER: 3,
    OTHER: 4,
  };
  const sortedJurors = [...jurors].sort((a, b) => {
    const pA = rolePriority[a.role || 'OTHER'] ?? 5;
    const pB = rolePriority[b.role || 'OTHER'] ?? 5;
    return pA - pB;
  });

  return (
    <div className="public-detail min-h-screen bg-[#FAF8F5] text-slate-900 pb-20 font-sans selection:bg-amber-300 selection:text-slate-950">
      {/* 1. Breadcrumbs and Quick Navigation Bar */}
      <div className="w-full border-b border-stone-200/90 bg-[#FFFDF8]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-2 text-xs font-medium text-slate-600">
            <Link to="/agenda" className="hover:text-[#091E3A] transition-colors flex items-center gap-1">
              <span>Agenda de Sustentaciones</span>
            </Link>
            <ChevronRight className="h-3 w-3 text-stone-400" />
            <span className="text-slate-700 font-semibold uppercase tracking-wider">
              {defense.unit?.acronym || 'EPG'}
            </span>
            <ChevronRight className="h-3 w-3 text-stone-400" />
            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-stone-100 text-stone-800 border border-stone-300 rounded-sm">
              {defense.code}
            </span>
          </nav>

          <div className="flex items-center flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/agenda')}
              className="rounded-sm border-stone-300 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-stone-100 h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              <span>Volver a la Agenda</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="rounded-sm border-stone-300 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-stone-100 h-8"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Enlace copiado</span>
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
              className="rounded-sm border-stone-300 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-stone-100 h-8"
            >
              <a href={getCalendarUrl()} target="_blank" rel="noreferrer">
                <CalendarCheck2 className="h-3.5 w-3.5 mr-1.5 text-amber-700" />
                <span>Agendar</span>
              </a>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="hidden sm:inline-flex rounded-sm border-stone-300 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-stone-100 h-8"
              title="Imprimir ficha de sustentación"
            >
              <Printer className="h-3.5 w-3.5 mr-1.5 text-stone-600" />
              <span>Imprimir</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Full-Width Hero Banner (container mx-auto, sin max-w limitante) */}
      <section className="w-full bg-[#FFFDF8] border-b border-stone-300/80 shadow-xs relative overflow-hidden">
        {/* Subtle Top Gold Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#091E3A] via-[#C59B27] to-[#091E3A]" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 space-y-6">
          {/* Eyebrow / Badges row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold tracking-wider px-2.5 py-1 bg-[#091E3A] text-white rounded-xs shadow-xs">
              {defense.code}
            </span>
            <StatusBadge status={defense.status} />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 bg-stone-100 text-stone-800 border border-stone-300 rounded-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              {getModalityLabel(defense.modality)}
            </span>
            {defense.office_number && (
              <span className="text-[11px] font-mono font-medium text-slate-700 bg-amber-50/80 border border-amber-300/80 px-2.5 py-1 rounded-xs">
                Oficio / Res: {defense.office_number}
              </span>
            )}
          </div>

          {/* Unit & Academic Program Subheading (Editorial uppercase tracked style like reference) */}
          <div className="space-y-1">
            <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#0D6E6E] flex items-center flex-wrap gap-2">
              <span>{defense.unit?.name || 'Escuela de Postgrado UNAP'}</span>
              {defense.program_name && (
                <>
                  <span className="text-stone-400">·</span>
                  <span className="text-[#091E3A]">{defense.program_name}</span>
                </>
              )}
            </div>

            {/* Editorial Thesis Title (Playfair Display / Serif Inspiration from Reference 2 & 4) */}
            <h1 className="font-serif font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-[#091E3A] tracking-tight leading-[1.18] pt-1">
              {defense.title}
            </h1>
          </div>

          {/* Institutional subline */}
          <div className="flex items-center gap-2 text-xs text-slate-600 pt-1 font-medium">
            <Building className="h-4 w-4 text-[#C59B27] shrink-0" />
            <span>Escuela de Postgrado · Universidad Nacional de la Amazonía Peruana</span>
          </div>

          {/* 3. Hero Data Callout Strip (Inspired by Reference Image 1 with big numbers and tracked labels) */}
          <div className="pt-6 sm:pt-8 border-t border-stone-200/90 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Stat 1: FECHA OFICIAL */}
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-sans text-[#091E3A] tracking-tight flex items-baseline gap-1.5">
                <span>{dateParts.dayStr}</span>
                <span className="text-base sm:text-xl font-bold text-slate-600 uppercase">{dateParts.monthStr}</span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D6E6E]">
                FECHA PROGRAMADA
              </div>
              <div className="text-xs text-slate-600 capitalize">
                {dateParts.weekdayFull}, {dateParts.year}
              </div>
            </div>

            {/* Stat 2: HORARIO Y TIEMPO */}
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-sans text-[#091E3A] tracking-tight">
                {formatTime(defense.start_time)}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D6E6E]">
                HORA DE INICIO
              </div>
              <div className="text-xs text-slate-600">
                Hasta {formatTime(defense.estimated_end_time)} · {defense.estimated_duration_minutes || 120} min
              </div>
            </div>

            {/* Stat 3: MODALIDAD */}
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-sans text-[#091E3A] tracking-tight uppercase">
                {getModalityLabel(defense.modality)}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D6E6E]">
                MODALIDAD DE DEFENSA
              </div>
              <div className="text-xs text-slate-600">
                Acto académico público oficial
              </div>
            </div>

            {/* Stat 4: SEDE / ESPACIO */}
            <div className="space-y-1">
              <div className="text-lg sm:text-xl lg:text-2xl font-extrabold font-sans text-[#091E3A] tracking-tight truncate" title={defense.space?.name || 'Por definir'}>
                {defense.space?.name || (defense.modality === 'VIRTUAL' ? 'Plataforma Virtual' : 'Por asignar')}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#0D6E6E]">
                UBICACIÓN ACADÉMICA
              </div>
              <div className="text-xs text-slate-600 truncate" title={defense.facility?.name || 'Sede Central EPG'}>
                {defense.facility?.name || 'Escuela de Postgrado UNAP'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Virtual Access Notice Banner (if applicable) */}
      {defense.virtual_url && (
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-[#091E3A] text-white border border-blue-900/60 rounded-sm p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="h-12 w-12 rounded-sm bg-[#C59B27] text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                <Video className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold tracking-widest uppercase bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-xs">
                    ENLACE PÚBLICO EN VIVO
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    Plataforma: {defense.virtual_platform || 'Videoconferencia Oficial'}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Transmisión del Acto de Sustentación en Tiempo Real
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  La sesión pública se encuentra habilitada para la comunidad universitaria y público interesado según el reglamento general de grados y títulos de la Escuela de Postgrado.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
              <a
                href={defense.virtual_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#C59B27] hover:bg-[#d6aa2e] text-[#091E3A] text-xs font-bold uppercase tracking-wider rounded-sm transition-colors shadow-sm"
              >
                <span>Ingresar a la Sala Virtual</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>
      )}

      {/* 5. Main Content Grid (container mx-auto, sin max-w-5xl) */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Tesista(s), Asesoría y Sede física (lg:col-span-4) */}
          <div className="space-y-6 lg:col-span-4">
            {/* Card: Tesista(s) / Candidato(s) al Grado */}
            <section className="bg-[#FFFDF8] border border-stone-300/80 rounded-sm p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-sm bg-stone-100 border border-stone-200 text-[#091E3A] flex items-center justify-center">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-[#091E3A] uppercase tracking-wider">
                      Candidato(s) al Grado
                    </h2>
                    <p className="text-[11px] text-slate-500">Tesista(s) postulante(s)</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-xs">
                  {students.length}
                </span>
              </div>

              {students.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No se encontraron tesistas registrados.</p>
              ) : (
                <div className="space-y-4">
                  {students.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 bg-[#FAF8F5] border border-stone-200/90 rounded-sm space-y-2.5 transition-all hover:border-stone-400"
                    >
                      <div className="flex items-center gap-3">
                        <PersonAvatar person={s.person} className="h-11 w-11" />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-[#091E3A] leading-snug">
                            {s.person.first_name} {s.person.last_name}
                          </h3>
                          <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0D6E6E] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-xs">
                            Tesista Titular
                          </span>
                        </div>
                      </div>

                      {s.person.email && (
                        <div className="text-xs text-slate-600 font-mono break-all pt-1 border-t border-stone-200/70">
                          {s.person.email}
                        </div>
                      )}
                      {s.person.document_number && (
                        <div className="text-[11px] text-slate-500">
                          Documento de Identidad: <span className="font-mono">****</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Card: Asesor(es) / Dirección de Tesis */}
            {advisors.length > 0 && (
              <section className="bg-[#FFFDF8] border border-stone-300/80 rounded-sm p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-sm bg-stone-100 border border-stone-200 text-[#091E3A] flex items-center justify-center">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-[#091E3A] uppercase tracking-wider">
                        Dirección de Tesis
                      </h2>
                      <p className="text-[11px] text-slate-500">Asesoría metodológica y científica</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {advisors.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 bg-[#FAF8F5] border border-stone-200/90 rounded-sm space-y-2.5 transition-all hover:border-stone-400"
                    >
                      <div className="flex items-center gap-3">
                        <PersonAvatar person={a.person} className="h-11 w-11" />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-[#091E3A] leading-snug">
                            {a.person.first_name} {a.person.last_name}
                          </h3>
                          <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-xs">
                            Asesor de Tesis
                          </span>
                        </div>
                      </div>

                      {a.person.email && (
                        <div className="text-xs text-slate-600 font-mono break-all pt-1 border-t border-stone-200/70">
                          {a.person.email}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Card: Ubicación del Acto Académico */}
            {defense.space && (
              <section className="bg-[#FFFDF8] border border-stone-300/80 rounded-sm p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-stone-200 pb-3.5">
                  <div className="h-8 w-8 rounded-sm bg-stone-100 border border-stone-200 text-[#091E3A] flex items-center justify-center">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-[#091E3A] uppercase tracking-wider">
                      Sede y Espacio Académico
                    </h2>
                    <p className="text-[11px] text-slate-500">Referencia de asistencia presencial</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div className="p-3 bg-[#FAF8F5] border border-stone-200 rounded-sm space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Espacio / Aula
                    </div>
                    <div className="text-sm font-bold text-[#091E3A]">
                      {defense.space.name}
                    </div>
                    {defense.space.floor && (
                      <div className="text-slate-600">
                        Nivel: <span className="font-medium text-slate-900">{defense.space.floor}</span>
                      </div>
                    )}
                    {defense.space.location_reference && (
                      <div className="text-slate-600 pt-1 border-t border-stone-200 text-[11px]">
                        Referencia: {defense.space.location_reference}
                      </div>
                    )}
                  </div>

                  {defense.facility?.name && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Edificio / Pabellón
                      </div>
                      <div className="font-semibold text-slate-900">
                        {defense.facility.name}
                      </div>
                      {defense.facility.address && (
                        <div className="text-slate-500 text-[11px]">
                          {defense.facility.address}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Jurado Calificador Oficial y Protocolo (lg:col-span-8) */}
          <div className="space-y-6 lg:col-span-8">
            {/* Card: Jurado Calificador Designado */}
            <section className="bg-[#FFFDF8] border border-stone-300/80 rounded-sm p-6 sm:p-7 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-sm bg-[#091E3A] text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-[#C59B27]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#091E3A] uppercase tracking-wider">
                      Jurado Calificador Oficial
                    </h2>
                    <p className="text-xs text-slate-600">
                      Docentes designados para la evaluación y dictamen de la sustentación
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-auto text-xs font-mono font-bold text-slate-700 bg-stone-100 border border-stone-300 px-3 py-1 rounded-xs">
                  {jurors.length} Miembros Acreditados
                </span>
              </div>

              {sortedJurors.length === 0 ? (
                <div className="py-8 text-center bg-[#FAF8F5] border border-stone-200 rounded-sm">
                  <p className="text-xs text-slate-500">
                    El jurado calificador se encuentra en proceso de designación oficial por la Escuela de Postgrado.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-stone-200/90">
                  {sortedJurors.map((j) => {
                    const isPresident = j.role === 'PRESIDENT';
                    const isSecretary = j.role === 'SECRETARY';
                    return (
                      <div
                        key={j.id}
                        className={`py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          isPresident ? 'bg-amber-50/40 -mx-3 px-3 rounded-xs' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <PersonAvatar person={j.person} className="h-12 w-12" />
                          <div className="min-w-0 space-y-1">
                            <h3 className="text-sm sm:text-base font-bold text-[#091E3A] leading-tight">
                              {j.person.first_name} {j.person.last_name}
                            </h3>
                            {j.person.email && (
                              <div className="text-xs text-slate-600 font-mono truncate">
                                {j.person.email}
                              </div>
                            )}
                            {j.person.document_number && (
                              <div className="text-[11px] text-slate-500">
                                Doc: <span className="font-mono">****</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="self-start sm:self-auto shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-xs border ${
                              isPresident
                                ? 'bg-[#091E3A] text-white border-[#091E3A]'
                                : isSecretary
                                ? 'bg-stone-800 text-white border-stone-800'
                                : 'bg-stone-100 text-stone-800 border-stone-300'
                            }`}
                          >
                            {isPresident && <Sparkles className="h-3 w-3 text-amber-300" />}
                            <span>{getJurorRoleLabel(j.role)}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Card: Protocolo Institucional y Fases del Acto */}
            <section className="bg-[#FFFDF8] border border-stone-300/80 rounded-sm p-6 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 border-b border-stone-200 pb-3.5">
                <div className="h-8 w-8 rounded-sm bg-stone-100 border border-stone-200 text-[#091E3A] flex items-center justify-center">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#091E3A] uppercase tracking-wider">
                    Protocolo y Fases del Acto de Sustentación
                  </h2>
                  <p className="text-[11px] text-slate-500">Secuencia reglamentaria del acto académico</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
                <div className="p-3.5 bg-[#FAF8F5] border border-stone-200/80 rounded-sm space-y-1.5">
                  <div className="font-bold text-[#091E3A] flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#091E3A] text-white text-[10px] inline-flex items-center justify-center font-mono">1</span>
                    <span>Instalación y Apertura</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    El Presidente del Jurado verifica el quórum reglamentario y declara formalmente abierto el acto público.
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF8F5] border border-stone-200/80 rounded-sm space-y-1.5">
                  <div className="font-bold text-[#091E3A] flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#091E3A] text-white text-[10px] inline-flex items-center justify-center font-mono">2</span>
                    <span>Exposición del Tesista</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Presentación de objetivos, hipótesis, marco metodológico, resultados y conclusiones (30 a 45 min).
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF8F5] border border-stone-200/80 rounded-sm space-y-1.5">
                  <div className="font-bold text-[#091E3A] flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#091E3A] text-white text-[10px] inline-flex items-center justify-center font-mono">3</span>
                    <span>Ronda de Preguntas</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Interrogantes y objeciones técnicas a cargo de los miembros del jurado calificador.
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF8F5] border border-stone-200/80 rounded-sm space-y-1.5">
                  <div className="font-bold text-[#091E3A] flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-[#091E3A] text-white text-[10px] inline-flex items-center justify-center font-mono">4</span>
                    <span>Deliberación y Acta</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Deliberación secreta del tribunal calificador, calificación final y lectura pública del acta oficial.
                  </p>
                </div>
              </div>
            </section>

            {/* Observaciones Específicas / Indicaciones del Comité */}
            {defense.observations && (
              <section className="bg-[#FFFDF8] border border-amber-300/80 rounded-sm p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2.5 border-b border-amber-200/70 pb-3">
                  <Info className="h-4 w-4 text-amber-700" />
                  <h2 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Indicaciones Específicas del Acto
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
                  {defense.observations}
                </p>
              </section>
            )}

            {/* Historial de Reprogramación (si aplica) */}
            {defense.reschedules && defense.reschedules.length > 0 && (
              <section className="bg-[#FFFDF8] border border-stone-300/80 rounded-sm p-6 shadow-xs space-y-4">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-stone-200 pb-2">
                  Historial de Reprogramación Oficial
                </h2>
                <div className="space-y-2.5 text-xs text-slate-700">
                  {defense.reschedules.map((r) => (
                    <div key={r.id} className="p-3 bg-[#FAF8F5] border border-stone-200 rounded-sm space-y-1">
                      <div className="text-slate-900 font-semibold">
                        Fecha previa: {formatDate(r.previous_date)} a las {formatTime(r.previous_start_time)}
                      </div>
                      {r.reason && (
                        <div className="text-slate-600 text-[11px]">
                          Motivo justificado: {r.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
