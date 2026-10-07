import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { defensesService } from '../../../services/defenses.service';
import { unitsService } from '../../../services/units.service';
import { facilitiesService } from '../../../services/facilities.service';
import { spacesService } from '../../../services/spaces.service';
import { holidaysService } from '../../../services/holidays.service';
import { DefenseFilters, DefenseWithRelations } from '../../../types';
import { PageHeader } from '../../../components/shared/page-header';
import { StatusBadge } from '../../../components/shared/status-badge';
import { Button } from '../../../components/ui/button';
import { formatDate, formatTime } from '../../../lib/utils';
import {
  Plus,
  Filter,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Building2,
  Users,
  Video,
  ExternalLink,
  Sun,
} from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';

export const AgendaCalendarPage: React.FC = () => {
  const [filters, setFilters] = useState<DefenseFilters>({
    status: 'ALL',
    unit_id: 'ALL',
    facility_id: 'ALL',
    space_id: 'ALL',
    modality: 'ALL',
  });

  const [selectedDefense, setSelectedDefense] = useState<DefenseWithRelations | null>(null);

  const { data: defenses = [], isLoading } = useQuery({
    queryKey: ['defenses', filters],
    queryFn: () => defensesService.getDefenses(filters),
  });

  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: () => unitsService.getUnits() });
  const { data: facilities = [] } = useQuery({ queryKey: ['facilities'], queryFn: () => facilitiesService.getFacilities() });
  const { data: spaces = [] } = useQuery({ queryKey: ['spaces'], queryFn: () => spacesService.getSpaces() });
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', 2026],
    queryFn: () => holidaysService.getHolidays(2026),
    staleTime: 1000 * 60 * 60,
  });

  const defenseEvents = defenses.map((d) => {
    let color = '#0B2545';
    if (d.status === 'CONFIRMED') color = '#047857';
    if (d.status === 'RESCHEDULED') color = '#1D4ED8';
    if (d.status === 'COMPLETED') color = '#6D28D9';
    if (d.status === 'DRAFT') color = '#D97706';
    if (d.status === 'CANCELLED') color = '#BE123C';

    const spaceLabel = d.space ? ` [${d.space.name}]` : '';

    return {
      id: d.id,
      title: `${d.code}: ${d.title}${spaceLabel}`,
      start: `${d.scheduled_date}T${d.start_time}`,
      end: `${d.scheduled_date}T${d.estimated_end_time}`,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: { defense: d },
    };
  });

  const holidayEvents = holidays.map((holiday) => ({
    id: `holiday-${holiday.date}`,
    title: `Feriado: ${holiday.name}`,
    start: holiday.date,
    allDay: true,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    textColor: '#92400E',
    extendedProps: { holiday },
  }));

  const calendarEvents = [...holidayEvents, ...defenseEvents];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda Institucional de Sustentaciones"
        description="Planificación de horarios, aulas, auditorios y cruces de jurado"
      >
        <Button asChild variant="default" className="gap-2">
          <NavLink to="/admin/defenses/new">
            <Plus className="h-4 w-4" />
            <span>Nueva Sustentación</span>
          </NavLink>
        </Button>
      </PageHeader>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Estado</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-slate-800"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="DRAFT">Borrador</option>
              <option value="CONFIRMED">Confirmada</option>
              <option value="RESCHEDULED">Reprogramada</option>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Unidad Académica</label>
            <select
              value={filters.unit_id}
              onChange={(e) => setFilters({ ...filters, unit_id: e.target.value })}
              className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-slate-800"
            >
              <option value="ALL">Todas las Unidades</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.acronym || u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Instalación</label>
            <select
              value={filters.facility_id}
              onChange={(e) => setFilters({ ...filters, facility_id: e.target.value })}
              className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-slate-800"
            >
              <option value="ALL">Todas las Instalaciones</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Espacio</label>
            <select
              value={filters.space_id}
              onChange={(e) => setFilters({ ...filters, space_id: e.target.value })}
              className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-slate-800"
            >
              <option value="ALL">Todos los Espacios</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 block mb-1">Modalidad</label>
            <select
              value={filters.modality}
              onChange={(e) => setFilters({ ...filters, modality: e.target.value as any })}
              className="w-full h-8 rounded border border-slate-200 bg-slate-50 px-2 text-slate-800"
            >
              <option value="ALL">Todas las Modalidades</option>
              <option value="PRESENTIAL">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="HYBRID">Híbrida</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-amber-900">
            <Sun className="h-4 w-4" />
            <span><strong>Feriados nacionales 2026</strong> resaltados en amarillo.</span>
          </div>
          <span className="text-xs text-amber-700">Fuente: Nager.Date · Perú</span>
        </div>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
          }}
          events={calendarEvents}
          eventClick={(info) => {
            if (info.event.extendedProps.holiday) return;
            setSelectedDefense(info.event.extendedProps.defense);
          }}
          height="auto"
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            list: 'Lista',
          }}
        />
      </div>

      {/* Quick Detail Dialog */}
      {selectedDefense && (
        <Dialog open={!!selectedDefense} onOpenChange={() => setSelectedDefense(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-unap-navy bg-slate-100 px-2 py-0.5 rounded">
                  {selectedDefense.code}
                </span>
                <StatusBadge status={selectedDefense.status} />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                {selectedDefense.title}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 text-xs text-slate-700 mt-2">
              <div className="bg-slate-50 p-3 rounded border border-slate-100 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block font-medium">Unidad:</span>
                  <strong>{selectedDefense.unit?.acronym || selectedDefense.unit?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Fecha:</span>
                  <strong>{formatDate(selectedDefense.scheduled_date)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Horario:</span>
                  <strong>{formatTime(selectedDefense.start_time)} - {formatTime(selectedDefense.estimated_end_time)}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Lugar:</span>
                  <strong>{selectedDefense.space?.name || selectedDefense.modality}</strong>
                </div>
              </div>

              {/* Sustentantes */}
              <div>
                <span className="font-semibold text-slate-500 block mb-1">Sustentante(s):</span>
                {(selectedDefense.participants || [])
                  .filter((p) => p.participant_type === 'STUDENT')
                  .map((s) => (
                    <div key={s.id} className="p-1.5 rounded bg-slate-50 font-medium">
                      {s.person.first_name} {s.person.last_name}
                    </div>
                  ))}
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setSelectedDefense(null)}>
                Cerrar
              </Button>
              <Button asChild variant="unap" size="sm" className="gap-1.5">
                <NavLink to={`/admin/defenses/${selectedDefense.id}`}>
                  <span>Abrir Ficha Completa</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </NavLink>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
