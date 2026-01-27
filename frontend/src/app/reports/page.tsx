'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useSalesReport, useProductPerformance, useRecalculateAnalytics } from '@/hooks/useAnalytics'; // Import hook
import { FormattedDateInput } from '@/components/ui/formatted-date-input';
import AppLayout from '@/components/layout/AppLayout';
import { SortableTable } from '@/components/SortableTable';
import { Download, Filter, Calendar as CalendarIcon, TrendingUp, DollarSign, Package, Users, RefreshCw } from 'lucide-react'; // Import Icon
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

export default function ReportsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });
    const [activeTab, setActiveTab] = useState<'sales' | 'products'>('sales');

    const { mutate: recalculate, isPending: isRecalculating } = useRecalculateAnalytics();

    const handleGenerateData = () => {
        recalculate(undefined, {
            onSuccess: () => {
                toast.success("Datos actualizados correctamente");
                window.location.reload();
            },
            onError: () => toast.error("Error al generar datos")
        });
    };

    const { data: salesReport, isLoading: isLoadingSales } = useSalesReport(
        new Date(dateRange.from),
        new Date(dateRange.to),
        user?.currentStoreId
    );

    const { data: productPerf, isLoading: isLoadingProducts } = useProductPerformance(user?.currentStoreId);

    useEffect(() => {
        if (_hasHydrated && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, _hasHydrated, router]);

    if (!_hasHydrated) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(value);
    };

    const handleExportExcel = () => {
        if (!salesReport) return;

        const wb = XLSX.utils.book_new();

        // 1. Sheet: Resumen General
        const summaryData = [{
            "Periodo": `${dateRange.from} al ${dateRange.to}`,
            "Total Ventas": salesReport.totalSales,
            "Ingresos Totales": formatCurrency(salesReport.totalRevenue),
            "Costo Total": formatCurrency(salesReport.totalCost),
            "Utilidad Total": formatCurrency(salesReport.totalProfit),
            "Margen Global": `${salesReport.profitMargin.toFixed(1)}%`,
            "Ticket Promedio": formatCurrency(salesReport.averageTicket)
        }];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

        // 2. Sheet: Ventas Diarias
        const dailyData = salesReport.dailySummaries.map(s => {
            const d = new Date(s.date);
            // Use UTC methods for consistency
            const day = d.getUTCDate().toString().padStart(2, '0');
            const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
            const year = d.getUTCFullYear();

            return {
                Fecha: `${day}/${month}/${year}`,
                Transacciones: s.totalSales,
                Ingresos: s.totalRevenue,
                Costo: s.totalCost,
                Utilidad: s.totalProfit,
                TicketProm: s.averageTicket
            };
        });
        const wsDaily = XLSX.utils.json_to_sheet(dailyData);
        XLSX.utils.book_append_sheet(wb, wsDaily, "Ventas Diarias");

        // 3. Sheet: Rendimiento Productos (if available)
        if (productPerf && productPerf.length > 0) {
            const productsData = productPerf.map(p => ({
                Codigo: p.productCode,
                Producto: p.productName,
                Vendido: p.totalSold,
                Ingresos: p.totalRevenue,
                Utilidad: p.totalProfit,
                Margen: `${p.profitMargin.toFixed(1)}%`
            }));
            const wsProducts = XLSX.utils.json_to_sheet(productsData);
            XLSX.utils.book_append_sheet(wb, wsProducts, "Productos");
        }

        XLSX.writeFile(wb, `Reporte_General_${dateRange.from}_${dateRange.to}.xlsx`);
        toast.success("Reporte completo exportado");
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Reportes y Analytics</h1>
                        <p className="text-muted-foreground">Análisis detallado del rendimiento de tu negocio.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleGenerateData}
                            disabled={isRecalculating}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
                            {isRecalculating ? 'Generando...' : 'Actualizar Datos'}
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium"
                        >
                            <Download className="w-4 h-4" />
                            Exportar Excel
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-card p-4 rounded-lg border shadow-sm flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Desde</label>
                        <FormattedDateInput
                            value={dateRange.from}
                            onChange={(val) => setDateRange(prev => ({ ...prev, from: val }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Hasta</label>
                        <FormattedDateInput
                            value={dateRange.to}
                            onChange={(val) => setDateRange(prev => ({ ...prev, to: val }))}
                        />
                    </div>
                    <div className="flex-1" />
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'sales' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Ventas
                        </button>
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'products' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Productos
                        </button>
                    </div>
                </div>

                {activeTab === 'sales' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-card p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                                        <h3 className="text-2xl font-bold">{formatCurrency(salesReport?.totalRevenue || 0)}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Utilidad Neta</p>
                                        <h3 className="text-2xl font-bold">{formatCurrency(salesReport?.totalProfit || 0)}</h3>
                                        <span className="text-xs text-green-600 font-medium">{salesReport?.profitMargin.toFixed(1)}% Margen</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Ventas Totales</p>
                                        <h3 className="text-2xl font-bold">{salesReport?.totalSales || 0}</h3>
                                        <span className="text-xs text-muted-foreground">{salesReport?.totalItems || 0} items</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-card p-6 rounded-xl border shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Ticket Promedio</p>
                                        <h3 className="text-2xl font-bold">{formatCurrency(salesReport?.averageTicket || 0)}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="bg-card p-6 rounded-xl border shadow-sm">
                            <h3 className="text-lg font-semibold mb-6">Tendencia de Ingresos</h3>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={salesReport?.dailySummaries || []}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis
                                            dataKey="date"
                                            tickFormatter={(val) => {
                                                const d = new Date(val);
                                                // Manual dd/MM format
                                                return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
                                            }}
                                            stroke="#9CA3AF"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#9CA3AF"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `S/${val}`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(val: number | undefined) => [`S/${(val || 0).toFixed(2)}`, 'Ingresos']}
                                            labelFormatter={(label) => {
                                                const d = new Date(label);
                                                // Manual dd/MM/yyyy format
                                                return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="totalRevenue"
                                            stroke="#3B82F6"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, fill: '#3B82F6' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-6 border-b">
                                <h3 className="text-lg font-semibold">Detalle Diario</h3>
                            </div>
                            <SortableTable
                                data={salesReport?.dailySummaries || []}
                                columns={[
                                    {
                                        key: 'date',
                                        label: 'Fecha',
                                        render: (row) => {
                                            const d = new Date(row.date);
                                            // Manual dd/MM/yyyy format
                                            const day = d.getUTCDate().toString().padStart(2, '0');
                                            const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
                                            const year = d.getUTCFullYear();
                                            // Include weekday name if desired, or just date? User asked for dd/MM/yyyy.
                                            // Let's stick to simple dd/MM/yyyy as requested "standard".
                                            return `${day}/${month}/${year}`;
                                        }
                                    },
                                    {
                                        key: 'totalSales',
                                        label: 'Transacciones',
                                        render: (row) => row.totalSales,
                                        className: 'text-center'
                                    },
                                    {
                                        key: 'averageTicket',
                                        label: 'Ticket Prom.',
                                        render: (row) => formatCurrency(row.averageTicket),
                                        className: 'text-right'
                                    },
                                    {
                                        key: 'totalRevenue',
                                        label: 'Ingresos',
                                        render: (row) => formatCurrency(row.totalRevenue),
                                        className: 'font-medium text-right'
                                    },
                                    {
                                        key: 'totalProfit',
                                        label: 'Utilidad',
                                        render: (row) => (
                                            <span className="text-green-600 font-medium">{formatCurrency(row.totalProfit)}</span>
                                        ),
                                        className: 'text-right'
                                    }
                                ]}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-card p-6 rounded-xl border shadow-sm">
                            <h3 className="text-lg font-semibold mb-6">Top 10 Productos por Ingresos</h3>
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={productPerf?.slice(0, 10) || []}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category"
                                            dataKey="productName"
                                            width={150}
                                            tick={{ fontSize: 12, fill: '#4B5563' }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                            formatter={(val: number | undefined) => [`S/${(val || 0).toFixed(2)}`, 'Ingresos']}
                                        />
                                        <Bar
                                            dataKey="totalRevenue"
                                            fill="#10B981"
                                            radius={[0, 4, 4, 0]}
                                            barSize={20}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-6 border-b">
                                <h3 className="text-lg font-semibold">Rendimiento Detallado por Producto</h3>
                            </div>
                            <SortableTable
                                data={productPerf || []}
                                columns={[
                                    {
                                        key: 'productCode',
                                        label: 'Código',
                                        render: (row) => row.productCode,
                                        className: 'font-mono text-sm text-muted-foreground'
                                    },
                                    {
                                        key: 'productName',
                                        label: 'Producto',
                                        render: (row) => row.productName,
                                        className: 'font-medium'
                                    },
                                    {
                                        key: 'totalSold',
                                        label: 'Cant. Vendida',
                                        render: (row) => row.totalSold,
                                        className: 'text-center'
                                    },
                                    {
                                        key: 'totalCost',
                                        label: 'Costo Total',
                                        render: (row) => formatCurrency(row.totalCost),
                                        className: 'text-right text-muted-foreground'
                                    },
                                    {
                                        key: 'totalRevenue',
                                        label: 'Ventas Totales',
                                        render: (row) => formatCurrency(row.totalRevenue),
                                        className: 'text-right font-medium'
                                    },
                                    {
                                        key: 'totalProfit',
                                        label: 'Utilidad',
                                        render: (row) => (
                                            <span className="text-green-600 font-medium">{formatCurrency(row.totalProfit)}</span>
                                        ),
                                        className: 'text-right'
                                    },
                                    {
                                        key: 'profitMargin',
                                        label: 'Margen',
                                        render: (row) => (
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.profitMargin > 30 ? 'bg-green-100 text-green-700' : row.profitMargin > 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                {row.profitMargin.toFixed(1)}%
                                            </span>
                                        ),
                                        className: 'text-center'
                                    }
                                ]}
                            />
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
