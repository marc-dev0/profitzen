'use client';

import { useState, useEffect, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    render?: (item: T) => ReactNode;
    className?: string;
    sortable?: boolean;
    sortKey?: string; // Key to use for sorting (if different from display key)
}

interface DataTableProps<T> {
    data: T[];
    columns: Column<T>[];
    keyExtractor: (item: T) => string;
    loading?: boolean;
    emptyMessage?: string;
    defaultRowsPerPage?: number;
    rowsPerPageOptions?: number[];
    onRowClick?: (item: T) => void;
    className?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    searchKeys?: string[]; // Keys to search in
    initialSearchTerm?: string;
    onSelectionChange?: (selectedItems: T[]) => void;
    selectedItems?: T[];
}

export function DataTable<T>({
    data,
    columns,
    keyExtractor,
    loading = false,
    emptyMessage = 'No hay datos disponibles',
    defaultRowsPerPage = 10,
    rowsPerPageOptions = [10, 25, 50, 100],
    onRowClick,
    className = '',
    searchable = false,
    searchPlaceholder = 'Buscar...',
    searchKeys = [],
    initialSearchTerm = '',
    onSelectionChange,
    selectedItems = []
}: DataTableProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
    const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Filter data based on search
    const filteredData = searchable && searchTerm
        ? data.filter((item) => {
            const searchLower = searchTerm.toLowerCase();
            return searchKeys.some((key) => {
                const value = (item as any)[key];
                return value?.toString().toLowerCase().includes(searchLower);
            });
        })
        : data;

    // Sort data
    const sortedData = sortConfig
        ? [...filteredData].sort((a, b) => {
            const aValue = (a as any)[sortConfig.key];
            const bValue = (b as any)[sortConfig.key];

            if (aValue === bValue) return 0;

            const comparison = aValue < bValue ? -1 : 1;
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        })
        : filteredData;

    // Reset to first page when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [sortedData.length, searchTerm]);

    // Pagination calculations
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentData = sortedData.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const handleRowsPerPageChange = (newRowsPerPage: number) => {
        setRowsPerPage(newRowsPerPage);
        setCurrentPage(1);
    };

    const handleSort = (columnKey: string) => {
        setSortConfig((current) => {
            if (!current || current.key !== columnKey) {
                return { key: columnKey, direction: 'asc' };
            }
            if (current.direction === 'asc') {
                return { key: columnKey, direction: 'desc' };
            }
            return null; // Remove sort
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // select all filtered data (that matches search)
            onSelectionChange?.(filteredData);
        } else {
            onSelectionChange?.([]);
        }
    };

    const handleSelectItem = (item: T, checked: boolean) => {
        if (checked) {
            onSelectionChange?.([...selectedItems, item]);
        } else {
            onSelectionChange?.(selectedItems.filter(i => keyExtractor(i) !== keyExtractor(item)));
        }
    };

    const isAllVisibleSelected = filteredData.length > 0 &&
        filteredData.every(item => selectedItems.some(selected => keyExtractor(selected) === keyExtractor(item)));

    const renderPaginationButtons = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            // Show all pages if 5 or less
            for (let i = 1; i <= totalPages; i++) {
                pages.push(
                    <button
                        key={i}
                        onClick={() => goToPage(i)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === i
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                            }`}
                    >
                        {i}
                    </button>
                );
            }
        } else {
            // Always show first page
            pages.push(
                <button
                    key={1}
                    onClick={() => goToPage(1)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === 1
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                        }`}
                >
                    1
                </button>
            );

            // Show ellipsis if current page is far from start
            if (currentPage > 3) {
                pages.push(
                    <span key="ellipsis1" className="px-2 text-muted-foreground">
                        ...
                    </span>
                );
            }

            // Show pages around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                pages.push(
                    <button
                        key={i}
                        onClick={() => goToPage(i)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === i
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                            }`}
                    >
                        {i}
                    </button>
                );
            }

            // Show ellipsis if current page is far from end
            if (currentPage < totalPages - 2) {
                pages.push(
                    <span key="ellipsis2" className="px-2 text-muted-foreground">
                        ...
                    </span>
                );
            }

            // Always show last page
            pages.push(
                <button
                    key={totalPages}
                    onClick={() => goToPage(totalPages)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPages
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground'
                        }`}
                >
                    {totalPages}
                </button>
            );
        }

        return pages;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className={`bg-card rounded-xl shadow-sm border border-border overflow-hidden ${className}`}>
            {/* Search Bar */}
            {searchable && (
                <div className="p-4 border-b border-slate-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                </div>
            )}

            {sortedData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <p className="text-lg font-medium">{searchTerm ? 'No se encontraron resultados' : emptyMessage}</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    {onSelectionChange && (
                                        <th className="px-6 py-4 w-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={isAllVisibleSelected}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                    )}
                                    {columns.map((column) => {
                                        const sortKey = column.sortKey || column.key;
                                        const isSorted = sortConfig?.key === sortKey;
                                        const sortDirection = isSorted ? sortConfig.direction : null;

                                        return (
                                            <th
                                                key={column.key}
                                                className={`px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider ${column.sortable ? 'cursor-pointer select-none hover:bg-muted' : ''} ${column.className || ''}`}
                                                onClick={() => column.sortable && handleSort(sortKey)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {column.header}
                                                    {column.sortable && (
                                                        <span className="text-slate-400">
                                                            {!isSorted && <ArrowUpDown className="w-4 h-4" />}
                                                            {isSorted && sortDirection === 'asc' && <ArrowUp className="w-4 h-4 text-primary" />}
                                                            {isSorted && sortDirection === 'desc' && <ArrowDown className="w-4 h-4 text-primary" />}
                                                        </span>
                                                    )}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {currentData.map((item) => (
                                    <tr
                                        key={keyExtractor(item)}
                                        onClick={() => onRowClick?.(item)}
                                        className={`hover:bg-muted/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                                    >
                                        {onSelectionChange && (
                                            <td className="px-6 py-4 whitespace-nowrap w-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                    checked={selectedItems.some(selected => keyExtractor(selected) === keyExtractor(item))}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleSelectItem(item, e.target.checked);
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                        )}
                                        {columns.map((column) => (
                                            <td
                                                key={column.key}
                                                className={`px-6 py-4 whitespace-nowrap ${column.className || ''}`}
                                            >
                                                {column.render
                                                    ? column.render(item)
                                                    : (item as any)[column.key]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {data.length > 0 && (
                        <div className="bg-card border-t border-border px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Filas por página:</span>
                                    <select
                                        value={rowsPerPage}
                                        onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                                        className="px-3 py-1 border border-input bg-background rounded-lg text-sm focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
                                    >
                                        {rowsPerPageOptions.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    Mostrando {startIndex + 1} - {Math.min(endIndex, sortedData.length)} de {sortedData.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-foreground"
                                    title="Primera página"
                                >
                                    <ChevronsLeft className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-foreground"
                                    title="Página anterior"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="flex items-center gap-1">{renderPaginationButtons()}</div>

                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-foreground"
                                    title="Página siguiente"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => goToPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-muted-foreground"
                                    title="Última página"
                                >
                                    <ChevronsRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
