'use client';

import { useState, useMemo } from 'react';

type SortDirection = 'asc' | 'desc' | null;

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render: (item: T, originalIndex: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface SortableTableProps<T> {
  columns: Column<T>[];
  data: T[];
  defaultSortKey?: string;
  defaultSortDirection?: 'asc' | 'desc';
  getSortValue?: (item: T, key: string) => any;
  className?: string;
  expandedContent?: (item: T, originalIndex: number) => React.ReactNode;
  expandedRows?: Set<any>;
  getRowId?: (item: T) => any;
}

export function SortableTable<T>({
  columns,
  data,
  defaultSortKey,
  defaultSortDirection = 'asc',
  getSortValue,
  className = '',
  expandedContent,
  expandedRows,
  getRowId
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(
    defaultSortKey ? defaultSortDirection : null
  );

  const sortedDataWithIndices = useMemo(() => {
    const dataWithIndices = data.map((item, index) => ({ item, originalIndex: index }));

    if (!sortKey || !sortDirection) {
      return dataWithIndices;
    }

    return [...dataWithIndices].sort((a, b) => {
      const aValue = getSortValue ? getSortValue(a.item, sortKey) : (a.item as any)[sortKey];
      const bValue = getSortValue ? getSortValue(b.item, sortKey) : (b.item as any)[sortKey];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection, getSortValue]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    if (sortDirection === 'asc') {
      return (
        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className={`border border-border rounded-lg overflow-hidden ${className}`}>
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr className="text-left text-sm font-semibold text-muted-foreground border-b border-border">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 ${column.headerClassName || ''} ${column.sortable !== false ? 'cursor-pointer select-none hover:bg-accent hover:text-accent-foreground' : ''
                  }`}
                onClick={() => column.sortable !== false && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.label}</span>
                  {column.sortable !== false && <SortIcon columnKey={column.key} />}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border text-card-foreground">
          {sortedDataWithIndices.map(({ item, originalIndex }) => {
            const rowId = getRowId ? getRowId(item) : originalIndex;
            const isExpanded = expandedRows?.has(rowId) || false;

            return (
              <>
                <tr key={originalIndex} className="hover:bg-muted/50 transition-colors">
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-3 ${column.className || ''}`}>
                      {column.render(item, originalIndex)}
                    </td>
                  ))}
                </tr>
                {isExpanded && expandedContent && (
                  <tr key={`${originalIndex}-expanded`} className="bg-muted/30 border-l-4 border-primary">
                    <td colSpan={columns.length} className="px-0 py-0">
                      {expandedContent(item, originalIndex)}
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
