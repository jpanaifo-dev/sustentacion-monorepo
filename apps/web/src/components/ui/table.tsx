import * as React from "react";
import { cn } from "../../lib/utils";

type PaginatedTableProps = React.HTMLAttributes<HTMLTableElement> & {
  paginate?: boolean;
  pageSize?: number;
  emptyMessage?: React.ReactNode;
  pagination?: {
    mode: 'client' | 'server';
    page: number;
    pageSize: number;
    total?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
  };
};

const Table = React.forwardRef<HTMLTableElement, PaginatedTableProps>(
  ({ className, paginate = true, pageSize = 10, emptyMessage = 'No hay datos para mostrar', pagination, children, ...props }, ref) => {
  const [page, setPage] = React.useState(1);
  const childNodes = React.Children.toArray(children);
  const bodyIndex = childNodes.findIndex((child) => React.isValidElement(child) && child.type === TableBody);
  const body = bodyIndex >= 0 ? childNodes[bodyIndex] as React.ReactElement<{ children?: React.ReactNode }> : null;
  const rows = body ? React.Children.toArray(body.props.children) : [];
  const activePage = pagination?.page ?? page;
  const activePageSize = pagination?.pageSize ?? pageSize;
  const total = pagination?.mode === 'server' ? (pagination.total ?? rows.length) : rows.length;
  const totalPages = Math.max(1, Math.ceil(total / activePageSize));
  const visibleRows = !paginate
    ? rows
    : pagination?.mode === 'server'
      ? rows
      : rows.slice((activePage - 1) * activePageSize, activePage * activePageSize);
  const nextChildren = body ? React.cloneElement(body, {}, visibleRows.length ? visibleRows : <TableRow><TableCell colSpan={99} className="h-28 text-center text-sm text-slate-500">{emptyMessage}</TableCell></TableRow>) : null;
  if (bodyIndex >= 0 && nextChildren) childNodes[bodyIndex] = nextChildren;
  return <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    >{childNodes}</table>
    {paginate && total > 0 && <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span>{(activePage - 1) * activePageSize + 1}–{Math.min(activePage * activePageSize, total)} de {total}</span>{pagination?.onPageSizeChange && <select value={activePageSize} onChange={(event) => pagination.onPageSizeChange?.(Number(event.target.value))} className="h-8 rounded border border-slate-200 bg-white px-2">{(pagination.pageSizeOptions ?? [10, 20, 50]).map((size) => <option key={size} value={size}>{size}</option>)}</select>}</div><div className="flex items-center gap-2"><button type="button" disabled={activePage === 1} onClick={() => pagination?.onPageChange ? pagination.onPageChange(Math.max(1, activePage - 1)) : setPage((value) => Math.max(1, value - 1))} className="rounded border px-2 py-1 disabled:opacity-40">Anterior</button><span>Página {activePage} de {totalPages}</span><button type="button" disabled={activePage === totalPages} onClick={() => pagination?.onPageChange ? pagination.onPageChange(Math.min(totalPages, activePage + 1)) : setPage((value) => Math.min(totalPages, value + 1))} className="rounded border px-2 py-1 disabled:opacity-40">Siguiente</button></div></div>}
  </div>;
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b bg-slate-50/75", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-slate-50/70 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-4 text-left align-middle font-semibold text-slate-700 [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
