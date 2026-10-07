import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { defensesService } from '../../services/defenses.service';
import { PageHeader } from '../../components/shared/page-header';
import { StatusBadge } from '../../components/shared/status-badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { formatDate, formatTime } from '../../lib/utils';
import {
  Calendar,
  Clock,
  GraduationCap,
  Plus,
  CheckCircle2,
  FileEdit,
  ArrowRight,
  MapPin,
  CalendarCheck,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { data: defenses = [] } = useQuery({
    queryKey: ['defenses'],
    queryFn: () => defensesService.getDefenses(),
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const todayDefenses = defenses.filter((d) => d.scheduled_date === todayStr && d.status !== 'CANCELLED');
  const confirmedDefenses = defenses.filter((d) => d.status === 'CONFIRMED');
  const draftDefenses = defenses.filter((d) => d.status === 'DRAFT');
  const upcomingDefenses = defenses.filter(
    (d) => d.scheduled_date > todayStr && ['CONFIRMED', 'RESCHEDULED'].includes(d.status)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel General de Sustentaciones"
        description="Escuela de Postgrado UNAP — Resumen ejecutivo y agenda del día"
      >
        <Button asChild variant="default" className="gap-2">
          <NavLink to="/admin/defenses/new">
            <Plus className="h-4 w-4" />
            <span>Nueva Sustentación</span>
          </NavLink>
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Sustentaciones Hoy
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{todayDefenses.length}</div>
            <p className="text-xs text-slate-500 mt-1">Defensas programadas para el día de hoy</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Confirmadas
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{confirmedDefenses.length}</div>
            <p className="text-xs text-slate-500 mt-1">Con jurado y espacio validado</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-600 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              En Borrador
            </CardTitle>
            <FileEdit className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{draftDefenses.length}</div>
            <p className="text-xs text-slate-500 mt-1">Pendientes de completar información</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-600 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Próximas Semanas
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{upcomingDefenses.length}</div>
            <p className="text-xs text-slate-500 mt-1">En agenda futura confirmada</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Agenda de hoy & Próximas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agenda de Hoy */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Agenda de Hoy</CardTitle>
              <p className="text-xs text-slate-500">Programación académica para hoy</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <NavLink to="/admin/agenda">
                <span>Ver Agenda</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </NavLink>
            </Button>
          </CardHeader>
          <CardContent>
            {todayDefenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No hay sustentaciones programadas para la fecha de hoy.
              </div>
            ) : (
              <div className="space-y-3">
                {todayDefenses.map((d) => (
                  <NavLink
                    key={d.id}
                    to={`/admin/defenses/${d.id}`}
                    className="block p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-unap-navy">{d.code}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="font-semibold text-xs text-slate-900 line-clamp-1">{d.title}</div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatTime(d.start_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {d.space?.name || d.modality}
                      </span>
                    </div>
                  </NavLink>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Sustentaciones */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Próximas Sustentaciones</CardTitle>
              <p className="text-xs text-slate-500">Siguientes defensas programadas</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <NavLink to="/admin/defenses">
                <span>Ver Todas</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </NavLink>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingDefenses.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No hay sustentaciones futuras registradas.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingDefenses.slice(0, 4).map((d) => (
                  <NavLink
                    key={d.id}
                    to={`/admin/defenses/${d.id}`}
                    className="block p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-xs font-bold text-unap-navy">{d.code}</span>
                      <span className="text-xs text-slate-600 font-medium">
                        {formatDate(d.scheduled_date)}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-slate-900 line-clamp-1">{d.title}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{d.unit?.acronym || d.unit?.name}</span>
                      <span className="font-medium text-slate-700">{formatTime(d.start_time)}</span>
                    </div>
                  </NavLink>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
