import React, { useState } from 'react';
import { PageHeader } from '../../../components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Settings, Shield, Clock, Eye, AlertTriangle, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [duration, setDuration] = useState(120);
  const [showJurors, setShowJurors] = useState(true);
  const [showCompleted, setShowCompleted] = useState(true);
  const [spaceConflictRule, setSpaceConflictRule] = useState<'WARNING' | 'BLOCKING'>('WARNING');
  const [jurorConflictRule, setJurorConflictRule] = useState<'WARNING' | 'BLOCKING'>('WARNING');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(
      'epg_system_settings',
      JSON.stringify({
        duration,
        showJurors,
        showCompleted,
        spaceConflictRule,
        jurorConflictRule,
      })
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        title="Configuración Institucional del Sistema"
        description="Parámetros generales de programación, visibilidad del portal público y reglas de conflicto"
      >
        <Button variant="unap" className="gap-2" onClick={handleSave}>
          <Save className="h-4 w-4" />
          <span>{saved ? '¡Configuración Guardada!' : 'Guardar Cambios'}</span>
        </Button>
      </PageHeader>

      <div className="space-y-6">
        {/* Parámetros de Sustentación */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-unap-navy" />
              <span>Parámetros de Sustentación</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Valores predeterminados aplicables al registrar una nueva sustentación
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="max-w-xs space-y-1.5">
              <Label className="text-xs font-semibold">Duración Estimada Predeterminada (Minutos)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
              <p className="text-[11px] text-slate-500">
                Calcula automáticamente la hora de fin a partir de la hora de inicio (actualmente 2 horas).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reglas de Detección de Cruces y Conflictos */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span>Reglas de Conflictos de Horario</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Comportamiento del sistema ante cruces simultáneos de espacio o jurado
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cruce en Espacio Físico</Label>
                <select
                  value={spaceConflictRule}
                  onChange={(e) => setSpaceConflictRule(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                >
                  <option value="WARNING">Advertencia (WARNING) - Permite confirmar con aviso</option>
                  <option value="BLOCKING">Bloqueo (BLOCKING) - Impide guardar hasta resolver cruce</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cruce de Jurado Simultáneo</Label>
                <select
                  value={jurorConflictRule}
                  onChange={(e) => setJurorConflictRule(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-unap-navy"
                >
                  <option value="WARNING">Advertencia (WARNING) - Permite confirmar con aviso</option>
                  <option value="BLOCKING">Bloqueo (BLOCKING) - Impide guardar hasta resolver cruce</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portal Público */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="h-4 w-4 text-unap-navy" />
              <span>Visibilidad en el Portal Público</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Control de información visible para la comunidad sin autenticación
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={showJurors}
                onChange={(e) => setShowJurors(e.target.checked)}
                className="rounded text-unap-navy"
              />
              <div>
                <div className="text-xs font-semibold text-slate-900">Mostrar Jurados en Detalle Público</div>
                <div className="text-[11px] text-slate-500">
                  Permite a los asistentes ver quiénes componen el jurado evaluador.
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
                className="rounded text-unap-navy"
              />
              <div>
                <div className="text-xs font-semibold text-slate-900">Mostrar Sustentaciones Culminadas (Historial)</div>
                <div className="text-[11px] text-slate-500">
                  Muestra las defensas marcadas como COMPLETED en el archivo histórico público.
                </div>
              </div>
            </label>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
