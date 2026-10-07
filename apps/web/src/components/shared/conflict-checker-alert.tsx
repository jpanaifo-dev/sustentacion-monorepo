import React from 'react';
import { ScheduleConflict } from '../../types';
import { AlertTriangle, Clock, MapPin, UserX } from 'lucide-react';

interface ConflictCheckerAlertProps {
  conflicts: ScheduleConflict[];
  className?: string;
}

export const ConflictCheckerAlert: React.FC<ConflictCheckerAlertProps> = ({ conflicts, className }) => {
  if (conflicts.length === 0) return null;

  return (
    <div
      className={`rounded-lg border border-amber-300 bg-amber-50/90 p-4 text-amber-900 shadow-sm ${
        className || ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-200/80 p-1.5 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-amber-950">
            {conflicts.length === 1 ? 'Conflicto de horario detectado' : `${conflicts.length} Conflictos de horario detectados`}
          </h4>
          <p className="mt-0.5 text-xs text-amber-800/90">
            Se detectaron cruces de disponibilidad en este horario. Revise los detalles a continuación:
          </p>

          <div className="mt-3 space-y-2">
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className="flex items-start gap-2.5 rounded-md border border-amber-200/60 bg-white/70 p-2.5 text-xs text-slate-800"
              >
                {conflict.type === 'SPACE' ? (
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                ) : (
                  <UserX className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{conflict.message}</div>
                  <div className="mt-1 flex items-center gap-2 text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {conflict.conflictingTimeRange}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[280px]" title={conflict.conflictingDefenseTitle}>
                      {conflict.conflictingDefenseCode}: {conflict.conflictingDefenseTitle}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
