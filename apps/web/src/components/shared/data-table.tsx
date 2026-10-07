import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export type TableColumn<T> = {
  key: string;
  header: React.ReactNode;
  cell?: (row: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
};

export type TablePagination = {
  mode: 'client' | 'server';
  page: number;
  pageSize: number;
  total?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
};

type DataTableProps<T> = {
  data: T[];
  columns: TableColumn<T>[];
  rowKey?: (row: T, index: number) => string;
  pagination?: TablePagination;
  emptyMessage?: React.ReactNode;
  loading?: boolean;
  loadingMessage?: React.ReactNode;
  className?: string;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({ data, columns, rowKey, pagination, emptyMessage = 'No hay datos para mostrar', loading, loadingMessage = 'Cargando…', className, onRowClick }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const sortedData = useMemo(() => {
    if (!sort) return data;
    const column = columns.find((item) => item.key === sort.key);
    if (!column) return data;
    return [...data].sort((a, b) => String((a as Record<string, unknown>)[sort.key] ?? '').localeCompare(String((b as Record<string, unknown>)[sort.key] ?? '')) * (sort.direction === 'asc' ? 1 : -1));
  }, [columns, data, sort]);
  const pageSize = pagination?.pageSize ?? (sortedData.length || 1);
  const total = pagination?.mode === 'server' ? (pagination.total ?? data.length) : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rows = pagination?.mode === 'client' ? sortedData.slice((pagination.page - 1) * pageSize, pagination.page * pageSize) : sortedData;
  const pageStart = total === 0 ? 0 : (pagination ? (pagination.page - 1) * pageSize + 1 : 1);
  const pageEnd = Math.min(pagination ? pagination.page * pageSize : total, total);

  return <div className={cn('w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-[#fff9f4] border-b border-slate-200"><tr>{columns.map((column) => <th key={column.key} className={cn('h-14 px-4 text-left text-xs font-semibold text-slate-500', column.className)}>{column.sortable ? <button type="button" className="inline-flex items-center gap-1 hover:text-[#091E3A]" onClick={() => setSort((current) => ({ key: column.key, direction: current?.key === column.key && current.direction === 'asc' ? 'desc' : 'asc' }))}>{column.header}<ChevronsUpDown className="h-3.5 w-3.5" /></button> : column.header}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? <tr><td colSpan={columns.length} className="h-32 text-center text-sm text-slate-500">{loadingMessage}</td></tr> : rows.length === 0 ? <tr><td colSpan={columns.length} className="h-36 text-center text-sm text-slate-500">{emptyMessage}</td></tr> : rows.map((row, index) => <tr key={rowKey?.(row, index) ?? index} onClick={() => onRowClick?.(row)} className={cn('transition-colors hover:bg-slate-50', onRowClick && 'cursor-pointer')}>{columns.map((column) => <td key={column.key} className={cn('px-4 py-4 align-middle text-slate-700', column.className)}>{column.cell ? column.cell(row, index) : String((row as Record<string, unknown>)[column.key] ?? '—')}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
    {pagination && <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="font-medium">Filas</span><select value={pagination.pageSize} onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2">{(pagination.pageSizeOptions ?? [10, 20, 50]).map((size) => <option key={size} value={size}>{size}</option>)}</select><span>{pageStart}–{pageEnd} de {total}</span></div><div className="flex items-center gap-1"><button type="button" aria-label="Página anterior" disabled={pagination.page <= 1} onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))} className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span className="min-w-16 text-center">{pagination.page} / {totalPages}</span><button type="button" aria-label="Página siguiente" disabled={pagination.page >= totalPages} onClick={() => pagination.onPageChange(Math.min(totalPages, pagination.page + 1))} className="grid h-8 w-8 place-items-center rounded-md hover:bg-slate-100 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>}
  </div>;
}
