import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { defensesService } from '../../services/defenses.service';
import { unitsService } from '../../services/units.service';
import { holidaysService } from '../../services/holidays.service';
import { DefenseWithRelations } from '../../types';
import { StatusBadge } from '../../components/shared/status-badge';
import { DefenseQuickPreviewModal } from '../../components/shared/defense-quick-preview-modal';
import { formatDate, formatTime, getModalityLabel, normalizeDateOnly } from '../../lib/utils';
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
  Building,
  ArrowRight,
  ExternalLink
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
    const weekdayStr = date.toLocaleString('es-PE', { weekday: 'short' }).toUpperCase().replace('.', '');
    return { dayStr, monthStr, weekdayStr, year };
  } catch {
    return { dayStr: '--', monthStr: '---', weekdayStr: '---', year: '' };
  }
}

type ViewMode = 'month' | 'day' | 'list';

export const PublicAgendaPage: React.FC = () => {
  const navigate = useNavigate();
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

  // Defenses of the same day as the currently previewed defense
  const sameDayDefensesForPreview = useMemo(() => {
    if (!previewDefense) return [];
    return (defensesByDate.get(normalizeDateOnly(previewDefense.scheduled_date)) || [])
      .slice()
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }, [previewDefense, defensesByDate]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = defenses.length;
    const confirmed = defenses.filter((d) => d.status === 'CONFIRMED').length;
    const virtual = defenses.filter((d) => d.modality === 'VIRTUAL' || d.modality === 'HYBRID').length;
    const presencial = defenses.filter((d) => d.modality === 'PRESENTIAL').length;
    return { total, confirmed, virtual, presencial };
  }, [defenses]);

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
    <div className="space-y-6 w-full pb-12 font-sans">
      {/* Minimal institutional banner: only on the public agenda */}
      <section
        className="w-full min-h-[300px] sm:min-h-[380px] lg:min-h-[420px] bg-[#091E3A] border-y border-white/10 text-white px-5 py-10 sm:px-8 relative overflow-hidden shadow-sm flex items-center"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(9,30,58,0.98) 0%, rgba(9,30,58,0.94) 48%, rgba(9,30,58,0.72) 100%), url(${heroImage})`, backgroundPosition: 'center, right 12% center', backgroundRepeat: 'no-repeat', backgroundSize: 'cover, 360px' }}
      >
        <div className="container mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">Agenda de sustentaciones</h1>
            <p className="text-sm sm:text-base text-slate-200 mt-5 max-w-2xl leading-relaxed">Consulta las fechas, horarios, modalidades y espacios de las sustentaciones de tesis y defensas de grado programadas por la Escuela de Postgrado de la Universidad Nacional de la Amazonía Peruana.</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Control & Filter Strip */}
      <section className="bg-white border border-slate-200 p-4 sm:p-4.5 rounded-sm shadow-sm">
        <div className="flex flex-col lg:flex-row gap-3.5 items-stretch lg:items-center justify-between">
          {/* Search, Unit, and Modality filters */}
          <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Buscar por tesis, código, tesista..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-sm border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-normal focus:border-[#091E3A] focus:bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-900 font-mono"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Unit Selector */}
            <div className="sm:w-72">
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full h-10 rounded-sm border border-slate-200 bg-slate-50 px-3 text-xs sm:text-sm font-normal text-slate-900 focus:outline-none focus:border-[#091E3A] focus:bg-white cursor-pointer"
              >
                <option value="ALL">Todas las unidades de posgrado</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.acronym ? `[${u.acronym}] ${u.name}` : u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Modality Selector */}
            <div className="sm:w-44">
              <select
                value={selectedModality}
                onChange={(e) => setSelectedModality(e.target.value)}
                className="w-full h-10 rounded-sm border border-slate-200 bg-slate-50 px-3 text-xs sm:text-sm font-normal text-slate-900 focus:outline-none focus:border-[#091E3A] focus:bg-white cursor-pointer"
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
                className="h-10 px-3 rounded-sm border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-mono uppercase font-normal"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {/* View Mode Switcher (Mes / Diario / Agenda) */}
          <div className="flex items-center gap-1 border border-slate-200 p-0.5 bg-slate-100 self-start sm:self-auto shrink-0 rounded-sm">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors rounded-sm ${
                viewMode === 'month'
                  ? 'bg-[#091E3A] text-amber-400'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
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
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors rounded-sm ${
                viewMode === 'day'
                  ? 'bg-[#091E3A] text-amber-400'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Diario</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider flex items-center gap-1.5 transition-colors rounded-sm ${
                viewMode === 'list'
                  ? 'bg-[#091E3A] text-amber-400'
                  : 'bg-transparent text-slate-700 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Agenda ({filteredDefenses.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Date Navigation & Calendar Legend (for Month & Day views) */}
      {viewMode !== 'list' && (
        <section className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-sm shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              className="h-8 w-8 p-0 rounded-sm border border-slate-300 hover:bg-[#091E3A] hover:text-white"
              title="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8 px-3 rounded-sm border border-slate-300 font-mono text-xs font-medium uppercase hover:bg-[#091E3A] hover:text-white"
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              className="h-8 w-8 p-0 rounded-sm border border-slate-300 hover:bg-[#091E3A] hover:text-white"
              title="Siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Current Period Display in Poppins font */}
          <div className="text-center sm:text-left">
            <div className="text-lg sm:text-xl font-semibold text-[#091E3A] uppercase tracking-tight leading-snug">
              {viewMode === 'month'
                ? format(currentDate, 'MMMM yyyy', { locale: es })
                : format(selectedDay, 'EEEE, d MMMM yyyy', { locale: es })}
            </div>
            <div className="text-[11px] text-slate-500 font-normal mt-0.5">
              {viewMode === 'month'
                ? `Vista mensual institucional · ${filteredDefenses.length} sustentaciones programadas`
                : `Programación diaria · ${defensesForSelectedDay.length} sustentaciones para esta jornada`}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-[10px] font-mono">
            <span className="flex items-center gap-1.5 px-2 py-0.5 border border-emerald-600 bg-emerald-50 text-emerald-950 font-medium rounded-sm">
              <span className="h-1.5 w-1.5 bg-emerald-600 rounded-sm" /> Confirmada
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 border border-blue-600 bg-blue-50 text-blue-950 font-medium rounded-sm">
              <span className="h-1.5 w-1.5 bg-blue-600 rounded-sm" /> Reprogramada
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 border border-purple-600 bg-purple-50 text-purple-950 font-medium rounded-sm">
              <span className="h-1.5 w-1.5 bg-purple-600 rounded-sm" /> Completada
            </span>
            <span className="flex items-center gap-1.5 px-2 py-0.5 border border-amber-500 bg-amber-50 text-amber-900 font-medium rounded-sm">
              <span className="h-1.5 w-1.5 bg-amber-500 rounded-sm" /> Feriado
            </span>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      {isLoadingDefenses ? (
        <div className="p-16 text-center bg-white border border-slate-200 rounded-sm shadow-sm">
          <div className="text-lg font-semibold text-slate-800 uppercase tracking-tight">
            Cargando programación institucional...
          </div>
          <p className="text-xs text-slate-500 mt-2 font-normal">
            Sincronizando con base de datos de la Escuela de Postgrado UNAP
          </p>
        </div>
      ) : viewMode === 'month' ? (
        /* 1. MONTH VIEW */
        <div className="overflow-hidden rounded-xl border border-[#eadfc8] bg-[#fbf6e8] shadow-sm">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-[#eadfc8] bg-[#f7efdc] text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 py-5 min-h-[76px] items-center">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mié</div>
            <div>Jue</div>
            <div>Vie</div>
            <div className="text-[#a66d35]">Sáb</div>
            <div className="text-[#a66d35]">Dom</div>
          </div>

          {/* Month Days 7x5 or 7x6 Grid */}
          <div className="grid grid-cols-7 auto-rows-[minmax(205px,1fr)] divide-x divide-y divide-[#eadfc8] border-b border-[#eadfc8]">
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
                    className={`min-h-[205px] sm:min-h-[225px] p-3 sm:p-4 transition-colors flex flex-col justify-between cursor-pointer ${
                    !isCurrMonth ? 'bg-[#f5eddd]/70 text-slate-400' : holiday ? 'bg-[#fff4d6] text-slate-900' : 'bg-[#fffdf7] text-slate-900'
                  } ${isCurrentDay ? 'bg-[#fff2c7] ring-2 ring-inset ring-[#c59b27]' : ''} ${
                    isSelected ? 'ring-2 ring-inset ring-[#091E3A]' : ''
                  } hover:bg-[#f8f0df]`}
                >
                  {/* Day cell top bar */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-2xl sm:text-3xl font-semibold leading-none tracking-tight ${
                        isCurrentDay ? 'text-[#091E3A] font-semibold' : isCurrMonth ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>

                    {isCurrentDay && (
                      <span className="font-mono text-[9px] font-medium bg-[#C59B27] text-slate-950 px-1 py-0.2 rounded-sm uppercase">
                        Hoy
                      </span>
                    )}

                    {!isCurrentDay && dayDefenses.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(dayDefenses[0]);
                        }}
                        className="font-mono text-[9px] font-semibold bg-[#091E3A] text-amber-300 px-2 py-1 rounded-full hover:bg-[#061528] transition-colors"
                        title={`${dayDefenses.length} sustentación(es) - Clic para ver vista previa`}
                      >
                        {dayDefenses.length}
                      </button>
                    )}
                  </div>

                  {/* Day Events list (limited to 3) */}
                  <div className="space-y-2 my-2">
                    {holiday && (
                      <div
                        className="px-1.5 py-1 text-[10px] sm:text-[11px] font-medium truncate rounded-sm border border-amber-300 bg-amber-100 text-amber-950"
                        title={holiday.name}
                      >
                        Feriado: {holiday.name}
                      </div>
                    )}
                    {dayDefenses.slice(0, 3).map((d) => {
                      const student = d.participants?.find((p) => p.participant_type === 'STUDENT');
                      const statusCard =
                        d.status === 'CONFIRMED'
                          ? 'border-l-emerald-500 bg-emerald-50/80 text-emerald-950'
                          : d.status === 'RESCHEDULED'
                          ? 'border-l-blue-500 bg-blue-50/80 text-blue-950'
                          : 'border-l-purple-500 bg-purple-50/80 text-purple-950';

                      return (
                        <div
                          key={d.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(d);
                          }}
                          className={`px-2 py-2 text-[10px] sm:text-[11px] font-normal rounded-md border border-slate-200 border-l-4 cursor-pointer hover:-translate-y-0.5 hover:shadow-sm transition-all ${statusCard}`}
                          title={`${d.code}: ${d.title} (Clic para vista previa)`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[9px] font-semibold opacity-80 shrink-0">{formatTime(d.start_time).replace(/:\d\d /, ' ')}</span>
                            <span className="text-[8px] uppercase tracking-wide opacity-70">{getModalityLabel(d.modality)}</span>
                          </div>
                          <div className="mt-1 line-clamp-2 font-semibold leading-tight">{d.title}</div>
                          {student && <div className="mt-1 truncate text-[9px] opacity-75">{student.person.first_name} {student.person.last_name}</div>}
                        </div>
                      );
                    })}

                    {dayDefenses.length > 3 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(dayDefenses[0]);
                        }}
                        className="text-[10px] font-semibold text-[#091E3A] hover:underline block text-left pt-0.5"
                        title={`Ver las ${dayDefenses.length} sustentaciones del día`}
                      >
                        +{dayDefenses.length - 3} sustentaciones más...
                      </button>
                    )}
                  </div>

                  {/* Cell Footer metadata */}
                  <div className="text-[9px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="uppercase text-[8px]">
                      {dayDefenses.length > 0 ? `${dayDefenses.length} acto(s)` : holiday ? 'Día no laborable' : ''}
                    </span>
                    {dayDefenses.some((d) => d.modality === 'VIRTUAL' || d.modality === 'HYBRID') && (
                      <Video className="h-3 w-3 text-blue-600 inline" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'day' ? (
        /* 2. DAILY SCHEDULE VIEW */
        <div className="space-y-4">
          {/* Week Day Selector Strip */}
          <div className="bg-[#fbf6e8] border border-[#eadfc8] p-3 rounded-xl shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
            <div className="text-xs font-mono font-medium text-slate-500 uppercase tracking-wider px-2 shrink-0 hidden md:block">
              Semana:
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[500px]">
              {weekDaysForDailyView.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const isSelected = isSameDay(day, selectedDay);
                const isCurrent = isToday(day);
                const count = (defensesByDate.get(dayKey) || []).length;

                return (
                  <button
                    key={dayKey}
                    onClick={() => setSelectedDay(day)}
                    className={`flex-1 py-1.5 px-2 text-center rounded-sm border transition-all min-w-[50px] ${
                      isSelected
                        ? 'border-[#091E3A] bg-[#091E3A] text-white'
                        : isCurrent
                        ? 'border-amber-400 bg-amber-50 text-slate-900'
                        : 'border-[#eadfc8] bg-[#fffdf7] hover:bg-[#f8f0df] text-slate-800'
                    }`}
                  >
                    <div
                      className={`text-[10px] font-mono font-medium uppercase ${
                        isSelected ? 'text-amber-400' : 'text-slate-500'
                      }`}
                    >
                      {format(day, 'EEE', { locale: es })}
                    </div>
                    <div className="text-sm font-semibold leading-none mt-1">
                      {format(day, 'd')}
                    </div>
                    {count > 0 && (
                      <div className="mt-1 flex justify-center">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isSelected ? 'bg-amber-400' : 'bg-emerald-600'
                          }`}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daily Schedule Board */}
          <div className="bg-[#fffdf7] border border-[#eadfc8] rounded-xl shadow-sm overflow-hidden">
            {/* Day Header Banner */}
            <div className="bg-[#f7efdc] text-[#091E3A] p-5 sm:p-6 border-b border-[#eadfc8] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                  <div className="text-[11px] font-mono text-[#a66d35] uppercase tracking-wider">
                  Cronograma de la Jornada
                </div>
                  <h2 className="text-xl sm:text-2xl font-semibold capitalize text-[#091E3A] mt-0.5 leading-snug">
                  {format(selectedDay, 'EEEE, d MMMM yyyy', { locale: es })}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {holidaysByDate.get(selectedDayKey) && (
                  <span className="font-mono text-xs font-medium px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-950 rounded-sm">
                    Feriado: {holidaysByDate.get(selectedDayKey)?.name}
                  </span>
                )}
                  <span className="font-mono text-xs font-medium px-2.5 py-1 bg-white border border-[#eadfc8] text-slate-700 rounded-full">
                  {defensesForSelectedDay.length} Sustentaciones
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="rounded-sm border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 text-xs font-mono uppercase"
                >
                  Volver al Mes
                </Button>
              </div>
            </div>

            {/* Daily Schedule List */}
            {defensesForSelectedDay.length === 0 ? (
              <div className="p-16 text-center">
                <CalendarCheck className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <div className="text-lg font-semibold text-slate-800 uppercase">
                  No hay sustentaciones programadas para este día
                </div>
                <p className="text-xs text-slate-500 mt-1 font-normal">
                  Puede consultar los demás días de la semana con la barra superior o volver al calendario mensual.
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToday}
                    className="rounded-sm border border-slate-300 font-mono text-xs uppercase"
                  >
                    Ir al día de Hoy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-sm font-mono text-xs uppercase"
                  >
                    Ver todas en Agenda
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {defensesForSelectedDay.map((defense) => {
                  const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
                  const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');
                  const advisors = (defense.participants || []).filter((p) => p.participant_type === 'ADVISOR');

                  return (
                    <div
                      key={defense.id}
                      onClick={() => handleOpenPreview(defense)}
                      className="mx-3 my-3 rounded-md border border-[#eadfc8] bg-white p-4 sm:p-5 shadow-sm hover:border-[#091E3A]/40 hover:bg-[#fffaf0] hover:shadow-md transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      {/* Left Time Box */}
                      <div className="flex items-center gap-4 lg:w-60 shrink-0 border-b lg:border-b-0 pb-3 lg:pb-0">
                        <div className="bg-[#F7F1E3] text-[#091E3A] p-3 text-center min-w-[88px] rounded-md border border-[#E7D9B9]">
                          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hora</div>
                          <div className="text-lg font-semibold leading-none text-[#091E3A] mt-2">
                            {formatTime(defense.start_time).replace(/:\d\d /, ' ')}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">
                            {defense.estimated_duration_minutes || 120} min
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-mono font-medium text-slate-900">
                            {formatTime(defense.start_time)} a {formatTime(defense.estimated_end_time)}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 font-normal">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {defense.space?.name || defense.modality}
                            </span>
                          </div>
                          <span className="inline-block border border-slate-200 bg-slate-100 text-slate-700 text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-sm">
                            {getModalityLabel(defense.modality)}
                          </span>
                        </div>
                      </div>

                      {/* Middle Thesis Details */}
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-medium text-white bg-[#091E3A] px-2 py-0.5 rounded-sm">
                            {defense.code}
                          </span>
                          <StatusBadge status={defense.status} />
                          <span className="text-xs font-medium text-slate-600 uppercase">
                            {defense.unit?.acronym || defense.unit?.name}
                          </span>
                        </div>

                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug hover:text-[#091E3A] transition-colors">
                          {defense.title}
                        </h3>

                        {/* Students and Jurors preview */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-normal">
                          {students.length > 0 && (
                            <div className="flex items-center gap-1">
                              <GraduationCap className="h-3.5 w-3.5 text-[#091E3A] shrink-0" />
                              <span>Tesista: </span>
                              <span className="font-medium text-slate-800">
                                {students.map((s) => `${s.person.first_name} ${s.person.last_name}`).join(', ')}
                              </span>
                            </div>
                          )}

                          {jurors.length > 0 && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{jurors.length} jurados asignados</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Actions */}
                      <div className="flex items-center justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(defense);
                          }}
                          className="rounded-sm border-slate-300 hover:border-[#091E3A] hover:bg-[#091E3A] hover:text-white text-xs font-medium uppercase tracking-wider h-8"
                        >
                          <span>Vista Rápida</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 3. AGENDA LIST VIEW */
        <div className="space-y-3">
          {filteredDefenses.length === 0 ? (
            <div className="p-16 text-center bg-white border border-slate-200 rounded-sm shadow-sm">
              <div className="text-lg font-semibold text-slate-800 uppercase">
                No hay sustentaciones registradas con estos filtros
              </div>
              <p className="text-xs text-slate-500 mt-1 font-normal">
                Pruebe seleccionando otra unidad académica o quitando los términos de búsqueda.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="mt-4 rounded-sm border border-slate-300 font-mono text-xs uppercase font-normal"
              >
                Restablecer Filtros
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredDefenses.map((defense) => {
                const students = (defense.participants || []).filter((p) => p.participant_type === 'STUDENT');
                const jurors = (defense.participants || []).filter((p) => p.participant_type === 'JUROR');
                const advisors = (defense.participants || []).filter((p) => p.participant_type === 'ADVISOR');
                const { dayStr, monthStr, weekdayStr, year } = parseDateParts(defense.scheduled_date);

                return (
                  <article
                    key={defense.id}
                    onClick={() => handleOpenPreview(defense)}
                    className="bg-[#fffdf7] border border-[#eadfc8] hover:border-[#091E3A]/50 hover:bg-white transition-all cursor-pointer p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 rounded-xl shadow-sm"
                  >
                    {/* Left Date Block */}
                    <div className="flex items-center gap-4 sm:gap-5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-3 lg:pb-0 lg:pr-5 shrink-0">
                      <div className="bg-[#f7efdc] text-[#091E3A] p-3 text-center min-w-[84px] sm:min-w-[92px] border border-[#eadfc8] rounded-md">
                        <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider leading-none">
                          {weekdayStr}
                        </div>
                        <div className="text-3xl sm:text-4xl font-semibold text-[#091E3A] leading-none my-1">
                          {dayStr}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 font-medium leading-none">
                          {monthStr} {year}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-900">
                          <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>
                            {formatTime(defense.start_time)} – {formatTime(defense.estimated_end_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 font-normal">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[170px]">
                            {defense.space?.name || (defense.modality === 'VIRTUAL' ? 'Plataforma Virtual' : 'Por definir')}
                          </span>
                        </div>
                        <span className="inline-block border border-slate-200 bg-slate-100 text-slate-700 text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-sm">
                            {getModalityLabel(defense.modality)}
                        </span>
                      </div>
                    </div>

                    {/* Middle Thesis Info */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium text-white bg-[#091E3A] px-2 py-0.5 border border-[#091E3A] rounded-sm">
                          {defense.code}
                        </span>
                        <StatusBadge status={defense.status} />
                        <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                          {defense.unit?.acronym || defense.unit?.name}
                        </span>
                      </div>

                        <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-snug tracking-tight hover:text-[#091E3A] transition-colors">
                        {defense.title}
                      </h3>

                      {/* Tesistas, Asesores y Jurados */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-1 text-xs text-slate-600 font-normal">
                        {students.length > 0 && (
                          <div className="flex items-center gap-1">
                            <GraduationCap className="h-3.5 w-3.5 text-[#091E3A] shrink-0" />
                            <span>Tesista: </span>
                            <span className="font-medium text-slate-900">
                              {students.map((s) => `${s.person.first_name} ${s.person.last_name}`).join(', ')}
                            </span>
                          </div>
                        )}

                        {advisors.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-600">
                            <span>Asesor: </span>
                            <span className="font-medium text-slate-800">
                              {advisors.map((a) => `${a.person.first_name} ${a.person.last_name}`).join(', ')}
                            </span>
                          </div>
                        )}

                        {jurors.length > 0 && (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{jurors.length} jurados asignados</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Button */}
                    <div className="flex items-center justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(defense);
                        }}
                        className="rounded-sm border-slate-300 hover:bg-[#091E3A] hover:border-[#091E3A] hover:text-white text-xs font-medium uppercase tracking-wider h-8"
                      >
                        <span>Vista Rápida</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </article>
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
