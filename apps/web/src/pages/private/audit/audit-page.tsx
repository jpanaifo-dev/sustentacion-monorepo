import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditService } from '../../../services/audit.service';
import { PageHeader } from '../../../components/shared/page-header';
import { Input } from '../../../components/ui/input';
import { DataTable, TableColumn } from '../../../components/shared/data-table';
import { formatDate } from '../../../lib/utils';
import { AuditLog } from '../../../types';
import { Search, ShieldAlert, FileText, Clock, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

export const AuditPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => auditService.getLogs(),
  });

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(q))
    );
  });

  const columns: TableColumn<AuditLog>[] = [
    { key: 'created_at', header: 'Fecha y hora', cell: (log) => <span className="whitespace-nowrap font-mono text-xs text-slate-600">{new Date(log.created_at).toLocaleString('es-PE')}</span>, sortable: true },
    { key: 'action', header: 'Acción', cell: (log) => <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-unap-navy">{log.action}</span>, sortable: true },
    { key: 'entity_type', header: 'Entidad', cell: (log) => <span className="text-xs font-semibold uppercase text-slate-700">{log.entity_type}</span> },
    { key: 'entity_id', header: 'ID de recurso', cell: (log) => <span className="block max-w-[140px] truncate font-mono text-xs text-slate-500">{log.entity_id || '—'}</span> },
    { key: 'ip_address', header: 'IP / agente', cell: (log) => <span className="text-xs text-slate-500">{log.ip_address || '127.0.0.1'}</span> },
    { key: 'detail', header: 'Detalle', className: 'text-right', cell: () => <span className="text-xs font-semibold text-unap-navy hover:underline">Ver JSON</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registro de Auditoría y Trazabilidad"
        description="Historial inmutable de operaciones, cambios de estado, reprogramaciones y notificaciones"
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Filtrar por acción (ej. DEFENSE_CONFIRMED)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs sm:text-sm bg-white"
          />
        </div>
      </div>

      <DataTable data={filteredLogs} columns={columns} rowKey={(log) => log.id} loading={isLoading} onRowClick={setSelectedLog} pagination={{ mode: 'client', page, pageSize, total: filteredLogs.length, onPageChange: setPage, onPageSizeChange: (size) => { setPageSize(size); setPage(1); } }} />

      {/* Log detail dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm font-bold text-unap-navy">
                Auditoría: {selectedLog.action}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-100">
                <div><strong>Fecha:</strong> {new Date(selectedLog.created_at).toLocaleString('es-PE')}</div>
                <div><strong>Entidad:</strong> {selectedLog.entity_type} ({selectedLog.entity_id})</div>
                <div><strong>Usuario:</strong> {selectedLog.user_id || 'Sistema'}</div>
                <div><strong>IP:</strong> {selectedLog.ip_address || '127.0.0.1'}</div>
              </div>

              {selectedLog.old_values && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Valores Anteriores:</span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_values && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Nuevos Valores:</span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Metadatos Adicionales:</span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
