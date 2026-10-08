import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isValid, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Ban, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, MapPin, Search, X } from 'lucide-react';
import { defensesService } from '../../../services/defenses.service';
import { facilitiesService } from '../../../services/facilities.service';
import { spacesService } from '../../../services/spaces.service';
import { spaceAvailabilityService } from '../../../services/space-availability.service';
import { getAgendaHours, hourRange, readAgendaHours, timeToMinutes } from '../../../services/agenda-hours.service';
import { DefenseWithRelations } from '../../../types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useAuth } from '../../../app/providers/auth-provider';
import { toast } from 'sonner';

type ViewMode = 'day' | 'week' | 'month';
const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');
const defenseDayKey = (value: string | null | undefined) => value?.slice(0, 10) || '';
const safeFormatDate = (value: string | null | undefined, pattern: string) => {
  if (!value) return 'Fecha no definida';
  const dateOnly = value.slice(0, 10);
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? `${dateOnly}T12:00:00` : value;
  const parsed = new Date(normalized);
  return isValid(parsed) ? format(parsed, pattern, { locale: es }) : 'Fecha no definida';
};
const minutes = (value: string) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
const overlaps = (aStart: number, aEnd: number, bStart: number, bEnd: number) => aStart < bEnd && aEnd > bStart;
const studentNames = (defense: DefenseWithRelations) => (defense.participants || []).filter((participant) => participant.participant_type === 'STUDENT').map((participant) => `${participant.person?.first_name || ''} ${participant.person?.last_name || ''}`.trim()).filter(Boolean);

export const AgendaCalendarPage: React.FC = () => {
  const { hasRole } = useAuth(); const navigate = useNavigate(); const isAgendaManager = hasRole('AGENDA_MANAGER'); const isAdmin = hasRole('SUPER_ADMIN') || hasRole('ADMIN'); const queryClient = useQueryClient();
  const [date, setDate] = useState(new Date()); const [view, setView] = useState<ViewMode>('week'); const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all'); const [search, setSearch] = useState(''); const [facilityId, setFacilityId] = useState(''); const [selectedDefense, setSelectedDefense] = useState<DefenseWithRelations | null>(null); const [spaceId, setSpaceId] = useState(''); const [assignmentFacilityId, setAssignmentFacilityId] = useState(''); const [asideTab, setAsideTab] = useState<'defenses' | 'spaces'>('defenses');
  const [agendaHours, setAgendaHours] = useState(readAgendaHours); const [focusTime, setFocusTime] = useState<string | null>(null); const [focusDefenseId, setFocusDefenseId] = useState<string | null>(null);
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const defaultFacilityApplied = useRef(false);
  const { data: all = [], isLoading } = useQuery({ queryKey: ['defenses', { agenda: true }], queryFn: () => defensesService.getDefenses() });
  const { data: facilities = [] } = useQuery({ queryKey: ['facilities'], queryFn: () => facilitiesService.getFacilities() });
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => spacesService.getSpaces() });
  const { data: blocks = [] } = useQuery({ queryKey: ['space-unavailability'], queryFn: () => spaceAvailabilityService.getAll() });
  const centralFacility = facilities.find((facility) => /central/i.test(facility.name));
  useEffect(() => {
    let active = true;
    getAgendaHours().then((hours) => active && setAgendaHours(hours)).catch((error) => console.error('No se pudo cargar el horario global de agenda:', error));
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (defaultFacilityApplied.current || !facilities.length) return;
    defaultFacilityApplied.current = true;
    if (!isAdmin) return;
    const central = facilities.find((facility) => /central/i.test(facility.name));
    if (central) setFacilityId(central.id);
  }, [facilities, isAdmin]);
  const eligible = useMemo(() => all.filter((d) => ['CONFIRMED', 'RESCHEDULED'].includes(d.status)), [all]);
  const pending = eligible.filter((d) => !d.space_id && (!search || `${d.code} ${d.title} ${d.unit?.name || ''} ${studentNames(d).join(' ')}`.toLowerCase().includes(search.toLowerCase())));
  const scheduled = eligible.filter((d) => d.space_id && (!search || `${d.code} ${d.title} ${d.space?.name || ''} ${studentNames(d).join(' ')}`.toLowerCase().includes(search.toLowerCase())));
  const defenseList = filter === 'assigned' ? scheduled : filter === 'unassigned' ? pending : eligible.filter((d) => !search || `${d.code} ${d.title} ${d.space?.name || ''} ${d.unit?.name || ''} ${studentNames(d).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const visibleScheduled = scheduled.filter((d) => !facilityId || facilityId === 'ALL' || d.facility_id === facilityId);
  const visibleSpaces = spaces.filter((space) => !facilityId || facilityId === 'ALL' || space.facility_id === facilityId).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }));
  const assignmentSpaces = spaces.filter((space) => space.facility_id === assignmentFacilityId).sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }));
  const openDefense = (defense: DefenseWithRelations) => { setSelectedDefense(defense); setAssignmentFacilityId(defense.facility_id || centralFacility?.id || ''); setSpaceId(defense.space_id || ''); };
  const updateSpace = useMutation({ mutationFn: ({ defense, targetSpace }: { defense: DefenseWithRelations; targetSpace: string }) => { const space = spaces.find((item) => item.id === targetSpace); if (!space) throw new Error('Selecciona una aula válida.'); const start = minutes(defense.start_time); const end = minutes(defense.estimated_end_time); const conflict = eligible.find((other) => other.id !== defense.id && other.space_id === targetSpace && defenseDayKey(other.scheduled_date) === defenseDayKey(defense.scheduled_date) && overlaps(start, end, minutes(other.start_time), minutes(other.estimated_end_time))); if (conflict) throw new Error(`Cruce con ${conflict.code} (${conflict.start_time.slice(0,5)}–${conflict.estimated_end_time.slice(0,5)}).`); const blocked = blocks.find((item) => item.space_id === targetSpace && spaceAvailabilityService.overlaps(item, new Date(`${defense.scheduled_date}T${defense.start_time}`).toISOString(), new Date(`${defense.scheduled_date}T${defense.estimated_end_time}`).toISOString())); if (blocked) throw new Error(`El aula tiene un bloqueo: ${blocked.reason}.`); return defensesService.updateDefense(defense.id, { facility_id: space.facility_id, space_id: space.id }).then((saved) => { if (saved.space_id !== space.id) throw new Error("El aula no quedó guardada."); return saved; }); }, onSuccess: async (_data, { defense }) => { await queryClient.invalidateQueries({ queryKey: ['defenses'] }); const scheduledDay = defense.scheduled_date?.slice(0, 10); if (scheduledDay) { const [year, month, day] = scheduledDay.split('-').map(Number); setDate(new Date(year, month - 1, day)); } setFacilityId(defense.facility_id || ''); setView('day'); setFocusTime(defense.start_time); setFocusDefenseId(defense.id); setAsideTab('defenses'); setFilter('assigned'); toast.success('Espacio asignado', { description: 'La agenda abrió el día y la hora de la sustentación.' }); setSelectedDefense(null); setSpaceId(''); }, onError: (error) => toast.error('No se pudo asignar el aula', { description: error.message }) });
  const dates = useMemo(() => { if (view === 'day') return [date]; if (view === 'week') { const start = startOfWeek(date, { weekStartsOn: 1 }); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); } const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 }); const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 }); const days = []; for (let d = start; d <= end; d = addDays(d, 1)) days.push(d); return days; }, [date, view]);
  const go = (direction: number) => { setFocusTime(null); setDate((d) => view === 'month' ? (direction > 0 ? addMonths(d, 1) : subMonths(d, 1)) : addDays(d, direction * (view === 'week' ? 7 : 1))); };
  const datesForView = view === 'day' ? [date] : dates;
  const dayDefenses = (d: Date) => visibleScheduled.filter((item) => defenseDayKey(item.scheduled_date) === dayKey(d));
  const calendarHours = useMemo(() => {
    const defenseHours = visibleScheduled.filter((item) => datesForView.some((day) => defenseDayKey(item.scheduled_date) === dayKey(day))).map((item) => Math.floor(minutes(item.start_time) / 60));
    const focusHour = focusTime ? [Math.floor(timeToMinutes(focusTime) / 60)] : [];
    return [...new Set([...hourRange(agendaHours), ...defenseHours, ...focusHour])].sort((a, b) => a - b);
  }, [agendaHours, datesForView, focusTime, visibleScheduled]);
  useEffect(() => {
    if (!focusTime || view !== 'day') return;
    const frame = requestAnimationFrame(() => {
      const targetHour = Math.floor(timeToMinutes(focusTime) / 60);
      const container = calendarScrollRef.current;
      const targetRow = container?.querySelector<HTMLElement>(`[data-agenda-hour="${targetHour}"]`);
      if (container && targetRow) {
        const top = container.scrollTop + targetRow.getBoundingClientRect().top - container.getBoundingClientRect().top - 80;
        container.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        setFocusTime(null);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [calendarHours, focusTime, view]);
  useEffect(() => {
    if (!focusDefenseId) return;
    const timeout = window.setTimeout(() => setFocusDefenseId(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [focusDefenseId]);
  const focusDefense = (defense: DefenseWithRelations) => {
    const scheduledDay = defense.scheduled_date?.slice(0, 10);
    if (scheduledDay) {
      const [year, month, day] = scheduledDay.split('-').map(Number);
      setDate(new Date(year, month - 1, day));
    }
    setFacilityId(defense.facility_id || '');
    setView('day');
    setFocusTime(defense.start_time);
    setFocusDefenseId(defense.id);
    setSelectedDefense(null);
  };
  const statusForSpace = (spaceId: string) => {
    const dayStart = new Date(`${dayKey(date)}T00:00:00`).toISOString(); const dayEnd = new Date(`${dayKey(date)}T23:59:59`).toISOString();
    const historical = blocks.filter((item) => item.space_id === spaceId && spaceAvailabilityService.overlaps(item, dayStart, dayEnd));
    const reservations = eligible.filter((item) => item.space_id === spaceId && defenseDayKey(item.scheduled_date) === dayKey(date));
    return { historical, reservations };
  };
  const getSpaceIssue = (defense: DefenseWithRelations, targetId: string) => {
    const target = spaces.find((item) => item.id === targetId);
    if (!target?.is_active) return 'Aula inactiva';
    const start = minutes(defense.start_time); const end = minutes(defense.estimated_end_time);
    const conflict = eligible.find((other) => other.id !== defense.id && other.space_id === targetId && defenseDayKey(other.scheduled_date) === defenseDayKey(defense.scheduled_date) && overlaps(start, end, minutes(other.start_time), minutes(other.estimated_end_time)));
    if (conflict) return `Cruce con ${conflict.code}`;
    const blocked = blocks.find((item) => item.space_id === targetId && spaceAvailabilityService.overlaps(item, new Date(`${defense.scheduled_date}T${defense.start_time}`).toISOString(), new Date(`${defense.scheduled_date}T${defense.estimated_end_time}`).toISOString()));
    return blocked ? `Bloqueada: ${blocked.reason}` : '';
  };
  const getSpaceName = (defense: DefenseWithRelations) => defense.space?.name || spaces.find((space) => space.id === defense.space_id)?.name || 'Aula asignada';

  return <main className="h-screen overflow-hidden bg-slate-100 px-4 py-4 sm:px-7 lg:px-9"><div className="mx-auto flex h-full max-w-[1600px] flex-col gap-4">
    <header className="flex shrink-0 flex-wrap items-end justify-between gap-4"><div className="flex items-start gap-3"><Button variant="outline" size="icon" aria-label="Volver" title="Volver" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/admin')}><ArrowLeft className="h-4 w-4"/></Button><div><div className="flex items-center gap-2 text-sm font-medium text-teal-700"><CalendarDays className="h-4 w-4"/>Agenda de sustentaciones</div><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Planificación de espacios</h1><p className="mt-1 text-sm text-slate-500">Organiza las sustentaciones verificadas y revisa la ocupación de aulas.</p></div></div><div className="flex items-center gap-2"><Button variant="outline" onClick={() => { setFocusTime(null); setDate(new Date()); }}>Hoy</Button><Button variant="outline" size="icon" onClick={() => go(-1)}><ChevronLeft className="h-4 w-4"/></Button><Button variant="outline" size="icon" onClick={() => go(1)}><ChevronRight className="h-4 w-4"/></Button><div className="min-w-52 text-center text-sm font-semibold capitalize text-slate-800">{view === 'day' ? format(date, "EEEE d 'de' MMMM yyyy", {locale:es}) : view === 'week' ? `${format(startOfWeek(date,{weekStartsOn:1}),'d MMM',{locale:es})} – ${format(endOfWeek(date,{weekStartsOn:1}),'d MMM yyyy',{locale:es})}` : format(date, 'MMMM yyyy', {locale:es})}</div></div></header>
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(180px,0.42fr)_minmax(0,1fr)] gap-5 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)] xl:grid-rows-1">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1"><button onClick={()=>setAsideTab('defenses')} className={`rounded-md px-2 py-2 text-xs font-semibold ${asideTab==='defenses'?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}>Sustentaciones <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5">{pending.length}</span></button><button onClick={()=>setAsideTab('spaces')} className={`rounded-md px-3 py-2 text-xs font-semibold ${asideTab==='spaces'?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}>Aulas <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.5">{visibleSpaces.length}</span></button></div>{asideTab==='defenses'?<><p className="mt-3 text-xs text-slate-500">{defenseList.length} sustentaciones verificadas para este filtro</p><div className="relative mt-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar código, tesis o sustentante" className="pl-9"/></div><div className="mt-3 flex gap-2"><button onClick={()=>setFilter('all')} className={`rounded-full px-3 py-1 text-xs ${filter==='all'?'bg-teal-700 text-white':'bg-slate-100 text-slate-600'}`}>Todas</button><button onClick={()=>setFilter('unassigned')} className={`rounded-full px-3 py-1 text-xs ${filter==='unassigned'?'bg-teal-700 text-white':'bg-slate-100 text-slate-600'}`}>Sin aula</button><button onClick={()=>setFilter('assigned')} className={`rounded-full px-3 py-1 text-xs ${filter==='assigned'?'bg-teal-700 text-white':'bg-slate-100 text-slate-600'}`}>Con aula</button></div></>:<><p className="mt-3 text-xs text-slate-500">Disponibilidad para el {format(date,"d 'de' MMMM",{locale:es})}</p><p className="mt-1 text-[11px] text-slate-400">Estado activo, bloqueos históricos y reservas registradas.</p></>}</div><div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">{asideTab==='defenses'?(isLoading?<p className="p-4 text-sm text-slate-500">Cargando…</p>:defenseList.map((d)=>{const students=studentNames(d);return <button key={d.id} onClick={()=>d.space_id?focusDefense(d):openDefense(d)} className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40"><div className="flex items-center justify-between"><span className="font-mono text-xs font-semibold text-teal-800">{d.code}</span><span className="text-[11px] text-slate-500">{safeFormatDate(d.scheduled_date,'d MMM')}</span></div><p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{d.title}</p><p className="mt-1 text-xs text-slate-600">{students.length?students.join(', '):'Sustentante no registrado'}</p><p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3 w-3"/>{d.start_time.slice(0,5)}–{d.estimated_end_time.slice(0,5)}</p><p className="mt-1 text-xs text-slate-500">{d.unit?.acronym||d.unit?.name||'Unidad no definida'}</p></button>})):visibleSpaces.map((space)=>{const {historical,reservations}=statusForSpace(space.id);const blocked=historical.some((item)=>item.status!=='CANCELLED'&&item.status!=='COMPLETED');const status=!space.is_active?'Inactiva':blocked?'Bloqueada por historial':reservations.length?'Ocupada':'Disponible';const available=space.is_active&&!blocked&&!reservations.length;return <div key={space.id} className={`rounded-lg border p-3 ${available?'border-emerald-200 bg-emerald-50/50':space.is_active?'border-rose-200 bg-rose-50/50':'border-slate-200 bg-slate-50'}`}><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{space.name}</p><p className="truncate text-[11px] text-slate-500">{space.facility?.name||'Sede sin nombre'}</p><p className={`mt-1 text-xs font-medium ${available?'text-emerald-700':'text-rose-700'}`}>{status}</p>{blocked&&<p className="mt-1 line-clamp-2 text-[11px] text-rose-700">{historical.find((item)=>item.status!=='CANCELLED'&&item.status!=='COMPLETED')?.reason}</p>}{reservations.length>0&&<p className="mt-1 text-[11px] text-slate-600">{reservations.length} reserva(s) · {reservations.map((item)=>`${item.start_time.slice(0,5)} ${item.code}`).join(', ')}</p>}</div></div></div>})}{asideTab==='defenses'&&!defenseList.length&&<div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No hay sustentaciones para este filtro.</div>}{asideTab==='spaces'&&!visibleSpaces.length&&<div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No hay aulas para la sede seleccionada.</div>}</div></aside>
      <section className="min-h-0 min-w-0 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div className="flex rounded-lg bg-slate-100 p-1">{(['day','week','month'] as ViewMode[]).map((mode)=><button key={mode} onClick={()=>setView(mode)} className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${view===mode?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}>{mode==='day'?'Día':mode==='week'?'Semana':'Mes'}</button>)}</div><select value={facilityId} onChange={(e)=>setFacilityId(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Seleccionar sede…</option><option value="ALL">Todas las sedes</option>{facilities.map((f)=><option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
      {view==='month' ? <div className="min-h-0 flex-1 overflow-auto grid grid-cols-7">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((x)=><div key={x} className="border-b bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500">{x}</div>)}{dates.map((d)=><button key={dayKey(d)} onClick={()=>{setDate(d);setFocusTime(null);setView('day');}} className={`min-h-28 border-b border-r p-2 text-left ${isSameMonth(d,date)?'bg-white':'bg-slate-50/70'} ${isSameDay(d,new Date())?'ring-1 ring-inset ring-teal-600':''}`}><span className="text-xs font-medium text-slate-600">{format(d,'d')}</span><div className="mt-1 space-y-1">{dayDefenses(d).slice(0,3).map((item)=><div key={item.id} className="truncate rounded bg-teal-50 px-1.5 py-1 text-[10px] text-teal-900"><span className="block font-semibold">{item.start_time.slice(0,5)} {getSpaceName(item)}</span><span className="block truncate">{studentNames(item).join(", ")||item.title}</span></div>)}</div></button>)}</div> : <div className="min-h-0 flex-1 overflow-auto" ref={calendarScrollRef}><div className="min-w-[760px]"><div className="grid border-b bg-slate-50" style={{gridTemplateColumns:`76px repeat(${datesForView.length}, minmax(120px,1fr))`}}><div className="p-3 text-xs text-slate-400">Hora</div>{datesForView.map((d)=><div key={dayKey(d)} className={`border-l p-3 text-center ${isSameDay(d,new Date())?'bg-teal-50':''}`}><div className="text-xs uppercase text-slate-500">{format(d,'EEEE',{locale:es})}</div><div className="mt-1 text-lg font-semibold text-slate-900">{format(d,'d')}</div></div>)}</div><div className="divide-y">{calendarHours.map((hour)=><div key={hour} data-agenda-hour={hour} className="grid min-h-[88px]" style={{gridTemplateColumns:`76px repeat(${datesForView.length}, minmax(120px,1fr))`}}><div className="py-2 pr-3 text-right text-[11px] text-slate-400">{String(hour).padStart(2,'0')}:00</div>{datesForView.map((d)=><div key={dayKey(d)} className="relative border-l p-1">{dayDefenses(d).filter((item)=>Math.floor(minutes(item.start_time)/60)===hour).map((item)=><button onClick={()=>openDefense(item)} key={item.id} className={`mb-1 w-full rounded-xl border p-3 text-left text-xs transition ${focusDefenseId===item.id?'border-amber-400 bg-amber-50 text-amber-950 ring-2 ring-amber-200 shadow-md':'border-teal-100 bg-white text-teal-950 hover:bg-teal-50'}`}><span className="font-semibold">{item.start_time.slice(0,5)} · {getSpaceName(item)}</span><span className="mt-1 block line-clamp-2">{item.title}</span><span className="mt-1 block truncate text-[10px] text-teal-800">{studentNames(item).join(", ")||"Sustentante no registrado"}</span></button>)}</div>)}</div>)}</div></div></div>}
      <div className="shrink-0 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Mostrando sustentaciones verificadas con espacio asignado · selecciona una tarjeta para revisar sus datos.</div></section>
    </div>
    
    {selectedDefense&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={()=>setSelectedDefense(null)}><div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-2xl" onClick={(e)=>e.stopPropagation()}><div className="flex items-start justify-between"><div><span className="font-mono text-xs font-bold text-teal-800">{selectedDefense.code}</span><h2 className="mt-2 text-lg font-bold text-slate-900">{selectedDefense.title}</h2><p className="mt-1 text-sm font-medium text-slate-700">{studentNames(selectedDefense).join(", ")||"Sustentante no registrado"}</p><p className="mt-2 text-sm text-slate-500">{safeFormatDate(selectedDefense.scheduled_date,"EEEE d 'de' MMMM")} · {selectedDefense.start_time.slice(0,5)}–{selectedDefense.estimated_end_time.slice(0,5)}</p></div><button onClick={()=>setSelectedDefense(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4"/></button></div><div className="mt-5 rounded-lg bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-700">{selectedDefense.space_id?'Cambiar espacio asignado':'Asignar espacio'}</p><label className="mt-4 block text-sm font-medium text-slate-700">Sede<select value={assignmentFacilityId} onChange={(e)=>{setAssignmentFacilityId(e.target.value);setSpaceId('');}} className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3"><option value="">Selecciona una sede</option>{facilities.map((facility)=><option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label><div className="mt-4"><p className="mb-2 text-sm font-medium text-slate-700">Aula <span className="font-normal text-slate-500">· disponibles para este horario</span></p>{assignmentSpaces.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{assignmentSpaces.map((space)=>{const issue=getSpaceIssue(selectedDefense,space.id);const selected=spaceId===space.id;const unavailable=!!issue;return <button type="button" key={space.id} disabled={unavailable} onClick={()=>setSpaceId(space.id)} className={`rounded-xl border p-4 text-left transition ${unavailable?'border-rose-200 bg-rose-50/70 text-rose-800 opacity-80 cursor-not-allowed':selected?'border-teal-500 bg-teal-50 ring-2 ring-teal-100':'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'}`}><div className="flex items-start justify-between">{unavailable?<Ban className="h-4 w-4 text-rose-600"/>:selected?<Check className="h-4 w-4 text-teal-700"/>:<span className="h-4 w-4 rounded-full border border-slate-300"/>}</div><p className="mt-3 font-semibold">{space.name}</p><p className={`mt-1 text-xs ${unavailable?'text-rose-700':'text-emerald-700'}`}>{unavailable?issue:'Disponible'}</p></button>})}</div>:<p className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">{assignmentFacilityId?'No hay aulas registradas para esta sede.':'Selecciona una sede para consultar sus aulas.'}</p>}</div><p className="mt-3 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3"/>Las aulas bloqueadas o con cruces no se pueden seleccionar.</p></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={()=>setSelectedDefense(null)}>Cancelar</Button><Button disabled={!spaceId||updateSpace.isPending||!!getSpaceIssue(selectedDefense,spaceId)} onClick={()=>updateSpace.mutate({defense:selectedDefense,targetSpace:spaceId})}>Asignar espacio</Button></div></div></div>}
  </div></main>;
};

















