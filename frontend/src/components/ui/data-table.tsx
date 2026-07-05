import { useState } from 'react';
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from './empty-state';
import { Spinner } from './spinner';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  emptyStateIcon?: React.ReactNode;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
  onPaginationChange?: (updater: { pageIndex: number; pageSize: number }) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  isLoading = false,
  emptyStateIcon,
  emptyStateTitle = 'No data found',
  emptyStateDescription,
  pagination,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: !!pagination,
    pageCount: pagination?.pageCount ?? -1,
    state: {
      sorting,
      columnFilters,
      ...(pagination ? { pagination: { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize } } : {}),
    },
    onPaginationChange: (updater) => {
      if (onPaginationChange && typeof updater === 'function') {
        const nextState = updater(pagination || { pageIndex: 0, pageSize: 10 });
        onPaginationChange(nextState);
      }
    },
  });

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Toolbar */}
      {searchKey && (
        <div className="flex items-center">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-muted" />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="pl-9 text-sm"
            />
          </div>
        </div>
      )}

      {/* Table — horizontal scroll handled by the Table component's wrapper */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <Table>
          <TableHeader className="bg-surface-offset/50 hidden md:table-header-group">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-semibold text-text">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 sm:h-64 text-center">
                  <Spinner size="lg" className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              <>
                {/* Desktop View */}
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="hover:bg-surface-offset/50 transition-colors hidden md:table-row"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                
                {/* Mobile View */}
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id + '-mobile'}
                    className="md:hidden block border-b border-border hover:bg-surface-offset/30 transition-colors"
                  >
                    <TableCell colSpan={columns.length} className="block w-full p-4">
                      <div className="flex flex-col gap-1">
                        {row.getVisibleCells().map((cell, index) => {
                          const isActions = cell.column.id === 'actions';
                          
                          if (index === 0 && !isActions) {
                            return (
                              <div key={cell.id} className="mb-3 flex items-center justify-between border-b border-border/40 pb-3">
                                <div className="flex-1">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </div>
                              </div>
                            );
                          }
                          
                          if (isActions) {
                            return (
                              <div key={cell.id} className="mt-3 pt-3 border-t border-border/40 flex justify-end">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            );
                          }
                          
                          let label = typeof cell.column.columnDef.header === 'string' 
                            ? cell.column.columnDef.header 
                            : cell.column.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                          
                          if (cell.column.id === 'firstName') label = 'Employee';
                          if (cell.column.id === 'dateOfJoining') label = 'Joined';

                          return (
                            <div key={cell.id} className="flex justify-between items-center py-2 group">
                              <span className="text-xs font-medium text-text-muted">{label}</span>
                              <div className="text-sm font-medium text-text text-right max-w-[65%] flex justify-end">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48 sm:h-64">
                  <EmptyState
                    icon={emptyStateIcon || <Search className="h-8 w-8" />}
                    title={emptyStateTitle}
                    description={emptyStateDescription}
                    className="border-none bg-transparent min-h-0"
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination — mobile-friendly */}
      {!isLoading && table.getPageCount() > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <div className="text-xs sm:text-sm text-text-muted order-2 sm:order-1">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{' '}
            of {table.getFilteredRowModel().rows.length}
          </div>
          <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex-1 sm:flex-initial text-xs sm:text-sm"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>
            <span className="text-xs text-text-muted px-2">
              {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex-1 sm:flex-initial text-xs sm:text-sm"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
