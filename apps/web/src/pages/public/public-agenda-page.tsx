import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { defensesService } from '../../services/defenses.service';
import { unitsService } from '../../services/units.service';
import { holidaysService } from '../../services/holidays.service';
import { DefenseWithRelations, DefenseParticipantWithPerson } from '../../types';
import { DefenseQuickPreviewModal } from '../../components/shared/defense-quick-preview-modal';
import { formatTime, getModalityLabel, normalizeDateOnly } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Search,
  Users,
  Video,
  List,
  CalendarDays,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  CalendarCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  subDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import heroImage from '../../assets/hero.png';

function parseDateParts(dateStr: string) {
  try {
    const [year, month, day] = normalizeDateOnly(dateStr).split('-').map(Number);
    if (!year || !month || !day) throw new Error('Fecha inválida');
    const date = new Date(year, month - 1, day);
    const dayStr = String(day).padStart(2, '0');
    const monthStr = date.toLocaleString('es-PE', { month: 'short' }).toUpperCase().replace('.', '');
    const monthFull = date.toLocaleString('es-PE', { month: 'long' });
    const weekdayStr = date.toLocaleString('es-PE', { weekday: 'short' }).toUpperCase().replace('.', '');
    const weekdayFull = date.toLocaleString('es-PE', { weekday: 'long' });
    return { dayStr, monthStr, monthFull, weekdayStr, weekdayFull, year, date };
  } catch {
    return { dayStr: '--', monthStr: '---', monthFull: '---', weekdayStr: '---', weekdayFull: '---', year: '', date: new Date() };
  }
}

function getStatusConfig(status?: string | null) {
  switch (status) {
    case 'CONFIRMED':
      return {
        label: 'Confirmada',
        colorText: 'text-emerald-700',
        dotColor: 'bg-emerald-500',
        borderColor: 'border-l-emerald-500',
        barColor: 'bg-emerald-500',
      };
    case 'RESCHEDULED':
      return {
        label: 'Reprogramada',
        colorText: 'text-blue-700',
        dotColor: 'bg-blue-500',
        borderColor: 'border-l-blue-500',
        barColor: 'bg-blue-500',
      };
    case 'COMPLETED':
      return {
        label: 'Completada',
        colorText: 'text-purple-700',
        dotColor: 'bg-purple-500',
        borderColor: 'border-l-purple-500',
        barColor: 'bg-purple-500',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelada',
        colorText: 'text-rose-700',
        dotColor: 'bg-rose-500',
        borderColor: 'border-l-rose-500',
        barColor: 'bg-rose-500',
      };
    case 'DRAFT':
    default:
      return {
        label: 'Borrador',
        colorText: 'text-amber-700',
        dotColor: 'bg-amber-500',
        borderColor: 'border-l-amber-500',
        barColor: 'bg-amber-500',
      };
  }
}

// Stacked avatars for participants without badges
const ParticipantAvatarStack: React.FC<{ participants?: DefenseParticipantWithPerson[]; max?: number }> = ({
  participants = [],
  max = 3,
}) => {
  if (!participants.length) return null;
  const visible = participants.slice(0, max);
  const remaining = participants.length - max;

  return (
    <div className="flex items-center -space-x-2 shrink-0">
      {visible.map((p, idx) => {
        const initials = `${p.person?.first_name?.[0] || ''}${p.person?.last_name?.[0] || ''}`.toUpperCase();
        return (
          <div
            key={p.id || idx}
            className="relative h-7 w-7 rounded-full border-2 border-white bg-[#091E3A] text-[10px] font-semibold text-white flex items-center justify-center overflow-hidden shadow-sm"
            title={`${p.person?.first_name} ${p.person?.last_name} (${p.participant_type})`}
          >
            {p.person?.photo_url ? (
              <img src={p.person.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{initials || '—'}</span>
            )}
          </div>
        );
      })}
      {remaining > 0 && (
        <div className="relative h-7 w-7 rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-slate-600 flex items-center justify-center shadow-sm">
          +{remaining}
        </div>
      )}
    </div>
  );
};

// Minimalist Card Component (No badges, purely normal text, vertical accent line)
interface DefenseMinimalCardProps {
  defense: DefenseWithRelations;
  onClick: () => void;
  showDateInline?: boolean;
}

const DefenseMinimalCard: React.FC<DefenseMinimalCardProps> = ({
  defense,
  onClick,
  showDateInline = false,
}) => {
  const statusConfig = getStatusConfig(defense.status);
  const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
  const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');
  const advisor = defense.participants?.find((p) => p.participant_type === 'ADVISOR');

  return (
    <article
      onClick={onClick}
      className="group relative rounded-2xl bg-white p-4 sm:p-5 lg:p-6 transition-all duration-200 hover:bg-slate-100/70 cursor-pointer"
    >
      {/* Top Header Row: Time, Category/Unit, Status, Code, Avatars */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {/* Time */}
          <div className="flex items-baseline gap-1 text-slate-900">
            <span className="text-sm sm:text-base lg:text-lg font-bold font-mono">
              {formatTime(defense.start_time).replace(/:\d\d /, ' ')}
            </span>
            <span className="text-xs sm:text-sm text-slate-400 font-normal font-mono">
              - {formatTime(defense.estimated_end_time).replace(/:\d\d /, ' ')}
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              ({defense.estimated_duration_minutes || 120} min)
            </span>
          </div>

          {/* Unit Category (normal text, styled) */}
          <span className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-[#091E3A]">
            {defense.unit?.acronym || defense.unit?.name}
          </span>

          {/* Status (normal text with colored dot, NO BADGE, NO COLORED BORDER) */}
          <span className={`inline-flex items-center gap-1.5 text-xs lg:text-sm font-medium ${statusConfig.colorText}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor}`} />
            {statusConfig.label}
          </span>

          {/* Monospace Code (normal text, NO BADGE) */}
          <span className="text-xs font-mono text-slate-400 font-medium">
            #{defense.code}
          </span>
        </div>

        {/* Avatars on top right */}
        <ParticipantAvatarStack participants={defense.participants} max={4} />
      </div>

      {/* Thesis Title: Regular font weight by default, bold only on hover */}
      <h3 className="text-base sm:text-lg lg:text-xl font-normal text-slate-800 leading-snug group-hover:font-semibold group-hover:text-[#091E3A] transition-all mb-3">
        {defense.title}
      </h3>

      {/* Bottom Info Row: Sustentantes, Advisor, Jurors, Modality / Venue */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-4 pt-3 border-t border-slate-100 text-xs sm:text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          {/* Sustentantes claramente visibles */}
          {students.length > 0 && (
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-[#091E3A] shrink-0" />
              <span className="text-slate-500 font-medium">
                {students.length > 1 ? 'Sustentantes:' : 'Sustentante:'}
              </span>
              <span className="font-semibold text-slate-900">
                {students.map((s) => `${s.person.first_name} ${s.person.last_name}`).join(', ')}
              </span>
            </div>
          )}

          {/* Advisor */}
          {advisor && (
            <div className="hidden md:flex items-center gap-1 text-slate-500">
              <span>Asesor:</span>
              <span className="font-medium text-slate-800">
                {advisor.person.first_name} {advisor.person.last_name}
              </span>
            </div>
          )}

          {/* Jurors count */}
          {jurors.length > 0 && (
            <div className="flex items-center gap-1 text-slate-500">
              <Users className="h-4 w-4 text-slate-400 shrink-0" />
              <span>{jurors.length} jurados</span>
            </div>
          )}

          {/* Venue / Modality */}
          <div className="flex items-center gap-1.5 text-slate-500">
            {defense.modality === 'VIRTUAL' ? (
              <>
                <Video className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="font-medium">Virtual</span>
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate max-w-[220px] font-medium">{defense.space?.name || getModalityLabel(defense.modality)}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Link */}
        <div className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#091E3A] group-hover:translate-x-0.5 transition-transform shrink-0">
          <span>Ver detalle</span>
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
};

type ViewMode = 'month' | 'day' | 'list';

export const PublicAgendaPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [previewDefense, setPreviewDefense] = useState<DefenseWithRelations | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handleOpenPreview = (def: DefenseWithRelations) => {
    setPreviewDefense(def);
    setIsPreviewModalOpen(true);
  };

  const { data: defenses = [], isLoading: isLoadingDefenses } = useQuery({
    queryKey: ['public-defenses'],
    queryFn: () => defensesService.getPublicDefenses(),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: () => unitsService.getUnits(),
  });

  const holidayYear = currentDate.getFullYear();
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', holidayYear],
    queryFn: () => holidaysService.getHolidays(holidayYear),
    staleTime: 1000 * 60 * 60,
  });

  const holidaysByDate = useMemo(
    () => new Map(holidays.map((holiday) => [holiday.date, holiday])),
    [holidays]
  );

  // Filtered public defenses
  const filteredDefenses = useMemo(() => {
    return defenses.filter((d) => {
      if (selectedUnit !== 'ALL' && d.unit_id !== selectedUnit) return false;
      if (selectedModality !== 'ALL' && d.modality !== selectedModality) return false;
      if (search) {
        const q = search.toLowerCase().trim();
        const codeMatch = d.code?.toLowerCase().includes(q);
        const titleMatch = d.title.toLowerCase().includes(q);
        const studentMatch = d.participants?.some(
          (p) =>
            p.participant_type === 'STUDENT' &&
            `${p.person.first_name} ${p.person.last_name}`.toLowerCase().includes(q)
        );
        if (!codeMatch && !titleMatch && !studentMatch) return false;
      }
      return true;
    });
  }, [defenses, selectedUnit, selectedModality, search]);

  // Map defenses by scheduled_date (YYYY-MM-DD)
  const defensesByDate = useMemo(() => {
    const map = new Map<string, DefenseWithRelations[]>();
    filteredDefenses.forEach((d) => {
      const dateKey = normalizeDateOnly(d.scheduled_date);
      const existing = map.get(dateKey) || [];
      existing.push(d);
      map.set(dateKey, existing);
    });
    return map;
  }, [filteredDefenses]);

  // Group defenses chronologically by date for the Agenda (list) view
  const groupedDefensesByDate = useMemo(() => {
    const groups: { dateKey: string; date: Date; defenses: DefenseWithRelations[] }[] = [];
    const map = new Map<string, DefenseWithRelations[]>();

    filteredDefenses.forEach((d) => {
      const key = normalizeDateOnly(d.scheduled_date);
      if (!key) return;
      const list = map.get(key) || [];
      list.push(d);
      map.set(key, list);
    });

    const sortedKeys = Array.from(map.keys()).sort();

    sortedKeys.forEach((key) => {
      const [year, month, day] = key.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const dayDefenses = (map.get(key) || []).sort((a, b) => a.start_time.localeCompare(b.start_time));
      groups.push({
        dateKey: key,
        date,
        defenses: dayDefenses,
      });
    });

    return groups;
  }, [filteredDefenses]);

  // Defenses of the same day as the currently previewed defense
  const sameDayDefensesForPreview = useMemo(() => {
    if (!previewDefense) return [];
    return (defensesByDate.get(normalizeDateOnly(previewDefense.scheduled_date)) || [])
      .slice()
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [previewDefense, defensesByDate]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else if (viewMode === 'day') {
      setSelectedDay((prev) => {
        const next = subDays(prev, 1);
        setCurrentDate(next);
        return next;
      });
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else if (viewMode === 'day') {
      setSelectedDay((prev) => {
        const next = addDays(prev, 1);
        setCurrentDate(next);
        return next;
      });
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now);
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedUnit('ALL');
    setSelectedModality('ALL');
  };

  // Month grid days
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Defenses on selected day for "Diario" view
  const selectedDayKey = format(selectedDay, 'yyyy-MM-dd');
  const defensesForSelectedDay = useMemo(() => {
    const list = defensesByDate.get(selectedDayKey) || [];
    return [...list].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [defensesByDate, selectedDayKey]);

  // Selected week days for daily toolbar
  const weekDaysForDailyView = useMemo(() => {
    const start = startOfWeek(selectedDay, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDay, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDay]);

  return (
    <div className="space-y-6 w-full pb-16 font-sans">
      {/* Institutional Responsive Hero Banner */}
      <section
        className="w-full bg-[#091E3A] border-b border-white/10 text-white px-4 py-8 sm:py-12 lg:py-14 relative overflow-hidden shadow-sm"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(9,30,58,0.98) 0%, rgba(9,30,58,0.94) 55%, rgba(9,30,58,0.75) 100%), url(${heroImage})`,
          backgroundPosition: 'center, right 10% center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover, 340px',
        }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-amber-400 mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Escuela de Postgrado UNAP
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white">
              Agenda de sustentaciones
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-300 mt-3 max-w-2xl leading-relaxed">
              Consulta las fechas, horarios, modalidades y espacios de las sustentaciones de tesis y defensas de grado programadas por la Escuela de Postgrado.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filter Strip & Responsive View Switcher */}
        <section className="bg-white border border-slate-200/90 p-3 sm:p-4 rounded-2xl shadow-sm">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search & Select Filters */}
            <div className="flex flex-1 flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Buscar por sustentación, código, sustentante..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm focus:border-[#091E3A] focus:bg-white"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-900"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Unit Selector */}
              <div className="w-full sm:w-64">
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs sm:text-sm font-normal text-slate-900 focus:outline-none focus:border-[#091E3A] focus:bg-white cursor-pointer"
                >
                  <option value="ALL">Todas las unidades</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.acronym ? `[${u.acronym}] ${u.name}` : u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modality Selector */}
              <div className="w-full sm:w-44">
                <select
                  value={selectedModality}
                  onChange={(e) => setSelectedModality(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs sm:text-sm font-normal text-slate-900 focus:outline-none focus:border-[#091E3A] focus:bg-white cursor-pointer"
                >
                  <option value="ALL">Modalidad: Todas</option>
                  <option value="PRESENTIAL">Presencial</option>
                  <option value="VIRTUAL">Virtual</option>
                  <option value="HYBRID">Híbrida</option>
                </select>
              </div>

              {(search || selectedUnit !== 'ALL' || selectedModality !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Limpiar
                </Button>
              )}
            </div>

            {/* View Mode Switcher (Full width on mobile, sleek segmented control) */}
            <div className="grid grid-cols-3 sm:flex items-center gap-1 border border-slate-200 p-1 bg-slate-100 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all rounded-lg ${
                  viewMode === 'month'
                    ? 'bg-[#091E3A] text-amber-400 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Mes</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('day');
                  setSelectedDay(currentDate);
                }}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all rounded-lg ${
                  viewMode === 'day'
                    ? 'bg-[#091E3A] text-amber-400 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Diario</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all rounded-lg ${
                  viewMode === 'list'
                    ? 'bg-[#091E3A] text-amber-400 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Agenda ({filteredDefenses.length})</span>
              </button>
            </div>
          </div>
        </section>

        {/* Date Navigation & Minimalist Legend (for Month & Day views) */}
        {viewMode !== 'list' && (
          <section className="bg-white border border-slate-200/90 p-3 sm:p-4 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="h-9 w-9 p-0 rounded-lg border border-slate-200 hover:bg-[#091E3A] hover:text-white"
                title="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold uppercase hover:bg-[#091E3A] hover:text-white"
              >
                Hoy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                className="h-9 w-9 p-0 rounded-lg border border-slate-200 hover:bg-[#091E3A] hover:text-white"
                title="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Current Period Display */}
            <div className="text-center md:text-left">
              <div className="text-lg sm:text-xl font-bold text-[#091E3A] uppercase tracking-tight">
                {viewMode === 'month'
                  ? format(currentDate, 'MMMM yyyy', { locale: es })
                  : format(selectedDay, 'EEEE, d MMMM yyyy', { locale: es })}
              </div>
              <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                {viewMode === 'month'
                  ? `${filteredDefenses.length} sustentaciones programadas este periodo`
                  : `${defensesForSelectedDay.length} sustentaciones para esta jornada`}
              </div>
            </div>

            {/* Minimalist Legend: Clean text with dots, NO heavy boxed badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-4 gap-y-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Confirmada
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Reprogramada
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" /> Completada
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Feriado
              </span>
            </div>
          </section>
        )}

        {/* Main Content Area */}
        {isLoadingDefenses ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="text-lg font-semibold text-slate-800">
              Cargando programación institucional...
            </div>
            <p className="text-xs text-slate-500 mt-2 font-normal">
              Sincronizando con base de datos de la Escuela de Postgrado UNAP
            </p>
          </div>
        ) : viewMode === 'month' ? (
          /* ========================================================= */
          /* 1. MONTH VIEW (Responsive with Compact Mode on Mobile)    */
          /* ========================================================= */
          <div className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                <div>Lun</div>
                <div>Mar</div>
                <div>Mié</div>
                <div>Jue</div>
                <div>Vie</div>
                <div className="text-rose-600">Sáb</div>
                <div className="text-rose-600">Dom</div>
              </div>

              {/* Month Days 7x5 or 7x6 Grid */}
              <div className="grid grid-cols-7 auto-rows-[minmax(70px,1fr)] sm:auto-rows-[minmax(160px,1fr)] lg:auto-rows-[minmax(220px,1fr)] divide-x divide-y divide-slate-100">
                {monthDays.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const dayDefenses = defensesByDate.get(dateKey) || [];
                  const holiday = holidaysByDate.get(dateKey);
                  const isCurrMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);
                  const isSelected = isSameDay(day, selectedDay);

                  return (
                    <div
                      key={dateKey}
                      onClick={() => {
                        setSelectedDay(day);
                      }}
                      className={`min-h-[70px] sm:min-h-[160px] lg:min-h-[225px] p-2 sm:p-2.5 lg:p-3 transition-colors flex flex-col justify-between cursor-pointer ${
                        !isCurrMonth
                          ? 'bg-slate-50/60 text-slate-400'
                          : holiday
                          ? 'bg-amber-50/50 text-slate-900'
                          : 'bg-white text-slate-900'
                      } ${isCurrentDay ? 'bg-amber-50/80 ring-2 ring-inset ring-amber-400' : ''} ${
                        isSelected ? 'ring-2 ring-inset ring-[#091E3A]' : ''
                      } hover:bg-slate-50`}
                    >
                      {/* Cell Header: Day number + dot indicator */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm sm:text-lg lg:text-2xl font-bold leading-none ${
                            isCurrentDay
                              ? 'text-[#091E3A] font-extrabold'
                              : isCurrMonth
                              ? 'text-slate-900'
                              : 'text-slate-300'
                          }`}
                        >
                          {format(day, 'd')}
                        </span>

                        {isCurrentDay && (
                          <span className="hidden sm:inline font-mono text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase">
                            Hoy
                          </span>
                        )}

                        {dayDefenses.length > 0 && (
                          <span className="text-[10px] font-bold text-white bg-[#091E3A] h-5 w-5 rounded-full flex items-center justify-center shrink-0">
                            {dayDefenses.length}
                          </span>
                        )}
                      </div>

                      {/* On Mobile: simple dot indicators */}
                      <div className="flex sm:hidden items-center justify-center gap-1 mt-1">
                        {holiday && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        {dayDefenses.slice(0, 3).map((d) => {
                          const conf = getStatusConfig(d.status);
                          return (
                            <span key={d.id} className={`h-1.5 w-1.5 rounded-full ${conf.dotColor}`} />
                          );
                        })}
                      </div>

                      {/* On Desktop/Tablet: Rich Cards inside Cell showing Thesis Title & Sustentantes */}
                      <div className="hidden sm:block space-y-1.5 lg:space-y-2 my-1">
                        {holiday && (
                          <div
                            className="px-2 py-1 text-[10px] sm:text-[11px] font-medium truncate rounded text-amber-800 bg-amber-100/70 border border-amber-200"
                            title={holiday.name}
                          >
                            Feriado: {holiday.name}
                          </div>
                        )}
                        {dayDefenses.slice(0, 3).map((d) => {
                          const conf = getStatusConfig(d.status);
                          const students = (d.participants || []).filter((p) => p.participant_type === 'STUDENT');

                          return (
                            <div
                              key={d.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPreview(d);
                              }}
                              className={`px-2 py-1.5 lg:px-2.5 lg:py-2 text-[10px] sm:text-[11px] rounded-md border border-slate-200 border-l-4 ${conf.borderColor} bg-slate-50/90 hover:bg-white hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer`}
                              title={`${d.code}: ${d.title} (Clic para vista previa)`}
                            >
                              <div className="flex items-center justify-between gap-1 text-[9px]">
                                <span className="font-mono font-bold text-slate-700">
                                  {formatTime(d.start_time).replace(/:\d\d /, ' ')}
                                </span>
                                <span className="text-[8px] uppercase tracking-wide opacity-75 font-medium">
                                  {getModalityLabel(d.modality)}
                                </span>
                              </div>
                              {/* Nombre de la sustentación */}
                              <div className="mt-1 line-clamp-2 font-semibold text-slate-900 leading-tight">
                                {d.title}
                              </div>
                              {/* Sustentantes */}
                              {students.length > 0 && (
                                <div className="mt-1 truncate text-[9px] text-slate-600 font-medium">
                                  <span className="text-slate-400">Sustentante: </span>
                                  <span className="text-slate-800 font-semibold">
                                    {students.map((s) => `${s.person.first_name} ${s.person.last_name}`).join(', ')}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {dayDefenses.length > 3 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDay(day);
                              setViewMode('day');
                            }}
                            className="text-[10px] font-semibold text-[#091E3A] hover:underline block text-left pt-0.5"
                          >
                            +{dayDefenses.length - 3} sustentaciones más...
                          </button>
                        )}
                      </div>

                      {/* Cell Footer */}
                      <div className="hidden sm:flex text-[9px] text-slate-400 items-center justify-between pt-1 border-t border-slate-100">
                        <span className="uppercase text-[8px]">
                          {dayDefenses.length > 0 ? `${dayDefenses.length} acto(s)` : holiday ? 'No laborable' : ''}
                        </span>
                        {dayDefenses.some((d) => d.modality === 'VIRTUAL' || d.modality === 'HYBRID') && (
                          <Video className="h-3 w-3 text-blue-500 inline" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Helper: When day is tapped on mobile, show that day's cards right below! */}
            <div className="block sm:hidden">
              <div className="flex items-baseline justify-between mb-3 px-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-950">
                    {format(selectedDay, 'dd')}
                  </span>
                  <span className="text-sm font-bold uppercase text-rose-600">
                    {format(selectedDay, 'EEEE', { locale: es })}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {format(selectedDay, 'MMMM yyyy', { locale: es })}
                  </span>
                </div>
                <button
                  onClick={() => setViewMode('day')}
                  className="text-xs font-semibold text-[#091E3A] hover:underline"
                >
                  Ver en diario →
                </button>
              </div>

              {defensesForSelectedDay.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                  No hay sustentaciones programadas para el {format(selectedDay, 'd MMMM', { locale: es })}.
                </div>
              ) : (
                <div className="space-y-3">
                  {defensesForSelectedDay.map((d) => (
                    <DefenseMinimalCard
                      key={d.id}
                      defense={d}
                      onClick={() => handleOpenPreview(d)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'day' ? (
          /* ========================================================= */
          /* 2. DAILY SCHEDULE VIEW (Maximalist Date + Minimal Cards)  */
          /* ========================================================= */
          <div className="space-y-6">
            {/* Week Day Selector Strip */}
            <div className="bg-white border border-slate-200/90 p-2 sm:p-2.5 rounded-2xl shadow-sm flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {weekDaysForDailyView.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const isSelected = isSameDay(day, selectedDay);
                const isCurrent = isToday(day);
                const count = (defensesByDate.get(dayKey) || []).length;

                return (
                  <button
                    key={dayKey}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-1 min-w-[56px] py-2 px-2 text-center rounded-xl transition-all ${
                      isSelected
                        ? 'bg-[#091E3A] text-white shadow-sm'
                        : isCurrent
                        ? 'bg-amber-50 text-slate-900 border border-amber-300'
                        : 'bg-transparent text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div className="text-base sm:text-lg font-black leading-none mt-1">
                      {format(day, 'd')}
                    </div>
                    <div className="mt-1 flex justify-center h-1.5">
                      {count > 0 && (
                        <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Maximalist Hero Header */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Maximalist Date Elements */}
                <div className="flex items-baseline sm:items-center gap-4">
                  <span className="text-6xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-slate-950 leading-none select-none">
                    {format(selectedDay, 'dd')}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-bold uppercase tracking-wider text-rose-600">
                        {format(selectedDay, 'EEEE', { locale: es })}
                      </span>
                      {holidaysByDate.get(selectedDayKey) && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Feriado: {holidaysByDate.get(selectedDayKey)?.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-slate-500 font-medium capitalize mt-0.5">
                      {format(selectedDay, 'd MMMM yyyy', { locale: es })}
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {defensesForSelectedDay.length} {defensesForSelectedDay.length === 1 ? 'sustentación programada' : 'sustentaciones programadas para esta jornada'}
                    </div>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('month')}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium h-9"
                  >
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                    Ver Mes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-medium h-9"
                  >
                    <List className="h-3.5 w-3.5 mr-1.5" />
                    Ver Agenda
                  </Button>
                </div>
              </div>
            </div>

            {/* Daily Schedule List of Minimalist Cards */}
            {defensesForSelectedDay.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <CalendarCheck className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  No hay sustentaciones programadas para este día
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Puede consultar los demás días de la semana con la barra superior o explorar la agenda completa.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToday}
                    className="text-xs rounded-xl border-slate-300"
                  >
                    Ir a Hoy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="text-xs rounded-xl border-slate-300"
                  >
                    Ver todas en Agenda
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {defensesForSelectedDay.map((defense) => (
                  <DefenseMinimalCard
                    key={defense.id}
                    defense={defense}
                    onClick={() => handleOpenPreview(defense)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================= */
          /* 3. AGENDA VIEW (Maximalist Date + Minimalist Cards)       */
          /* ========================================================= */
          <div className="space-y-6">
            {groupedDefensesByDate.length === 0 ? (
              <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="text-lg font-semibold text-slate-800">
                  No hay sustentaciones registradas con estos filtros
                </div>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Pruebe seleccionando otra unidad académica o quitando los términos de búsqueda.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="mt-4 rounded-xl border border-slate-300 text-xs font-medium"
                >
                  Restablecer Filtros
                </Button>
              </div>
            ) : (
              <div className="space-y-10">
                {groupedDefensesByDate.map((group) => {
                  const { dayStr, monthStr, weekdayStr, year } = parseDateParts(group.dateKey);

                  return (
                    <section
                      key={group.dateKey}
                      className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 lg:gap-10 pt-8 first:pt-0 border-t first:border-t-0 border-slate-200"
                    >
                      {/* Maximalist Date Block (Sticky on Desktop, top on Mobile) */}
                      <div className="sm:w-28 md:w-36 lg:w-44 shrink-0 sm:sticky sm:top-24">
                        <div className="flex items-baseline sm:flex-col gap-3 sm:gap-0 pb-2 sm:pb-0 border-b sm:border-b-0 border-slate-200">
                          {/* Huge bold numeral */}
                          <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-slate-950 leading-none select-none">
                            {dayStr}
                          </span>
                          <div className="flex flex-col sm:mt-1">
                            {/* Day of week in accent color */}
                            <span className="text-sm sm:text-base font-bold uppercase tracking-wider text-rose-600">
                              {weekdayStr}
                            </span>
                            {/* Month and year in clean typography */}
                            <span className="text-[11px] sm:text-xs text-slate-400 font-medium uppercase tracking-wide">
                              {monthStr} {year}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-1 hidden sm:block">
                              {group.defenses.length} {group.defenses.length === 1 ? 'sustentación' : 'sustentaciones'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stack of Minimalist Defense Cards for this Date */}
                      <div className="flex-1 space-y-3 min-w-0">
                        {group.defenses.map((defense) => (
                          <DefenseMinimalCard
                            key={defense.id}
                            defense={defense}
                            onClick={() => handleOpenPreview(defense)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Defense Quick Preview Modal */}
      <DefenseQuickPreviewModal
        defense={previewDefense}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        sameDayDefenses={sameDayDefensesForPreview}
        onSelectDefense={(d) => setPreviewDefense(d)}
        onViewDayTimeline={(dateStr) => {
          const [year, month, day] = dateStr.split('-').map(Number);
          setSelectedDay(new Date(year, month - 1, day));
          setViewMode('day');
        }}
      />
    </div>
  );
};
