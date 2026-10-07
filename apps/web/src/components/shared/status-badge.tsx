import React from 'react';
import { Badge } from '../ui/badge';
import { DefenseStatus } from '../../types';
import { CheckCircle2, Clock, CalendarClock, CheckCheck, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: DefenseStatus;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, showIcon = true }) => {
  switch (status) {
    case 'CONFIRMED':
      return (
        <Badge variant="confirmed" className={`gap-1 px-2.5 py-0.5 ${className || ''}`}>
          {showIcon && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          <span>Confirmada</span>
        </Badge>
      );
    case 'DRAFT':
      return (
        <Badge variant="draft" className={`gap-1 px-2.5 py-0.5 ${className || ''}`}>
          {showIcon && <Clock className="h-3.5 w-3.5 text-amber-600" />}
          <span>Borrador</span>
        </Badge>
      );
    case 'RESCHEDULED':
      return (
        <Badge variant="rescheduled" className={`gap-1 px-2.5 py-0.5 ${className || ''}`}>
          {showIcon && <CalendarClock className="h-3.5 w-3.5 text-blue-600" />}
          <span>Reprogramada</span>
        </Badge>
      );
    case 'COMPLETED':
      return (
        <Badge variant="completed" className={`gap-1 px-2.5 py-0.5 ${className || ''}`}>
          {showIcon && <CheckCheck className="h-3.5 w-3.5 text-purple-600" />}
          <span>Completada</span>
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge variant="cancelled" className={`gap-1 px-2.5 py-0.5 ${className || ''}`}>
          {showIcon && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
          <span>Cancelada</span>
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
