'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import { DataTable, Column } from '@/components/DataTable';
import {
    TrendingUp,
    Calendar,
    DollarSign,
    ShoppingCart,
    ArrowUp,
    ArrowDown,
    Download,
    FileText,
    BarChart3,
    BrainCircuit,
    Sparkles,
    RefreshCw,
    Wallet,
    Tag,
    PieChart as PieChartIcon
} from 'lucide-react';
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { useSalesReport, useProductPerformance, useAnalyticsActions } from '@/hooks/useAnalytics';
import { useAuthStore } from '@/store/authStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface TopProduct {
    rank?: number;
    productId: string;
    productName: string;
    totalSold: number;
    totalRevenue: number;
    unitOfMeasure?: string;
    totalProfit: number;
}

interface GroupedTopProduct {
    rank?: number;
    productId: string;
    productName: string;
    totalSold: number;
    totalRevenue: number;
    totalProfit: number;
    percentage?: number;
    variants: TopProduct[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { generateReport } = useAnalyticsActions();

    // Date Range State (Default last 30 days)
    const [fromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
    });
    const [toDate] = useState(() => new Date());

    const { data: report, isLoading: loadingReport, refetch: refetchReport } = useSalesReport(fromDate, toDate, user?.currentStoreId);
    const { data: lp, isLoading: loadingLP, refetch: refetchLP } = useProductPerformance(user?.currentStoreId);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (!user?.currentStoreId) return;
        setIsRefreshing(true);
        try {
            await generateReport(user.currentStoreId);
            await Promise.all([refetchReport(), refetchLP()]);
            toast.success('Datos actualizados correctamente');
        } catch (error: any) {
            console.error('Refresh error:', error);
            const msg = error?.response?.data?.error || error?.message || 'Error al actualizar los datos';
            toast.error(`Error: ${msg}`);
        } finally {
            setIsRefreshing(false);
        }
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null || isNaN(amount)) return 'S/ 0.00';
        return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
    };

    const formatDate = (dateString: string | Date | undefined | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return `${date.getUTCDate().toString().padStart(2, '0')}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
    };

    const getBaseName = (name: string) => {
        const match = name.match(/^(.*?)\s\(.*?\)$/);
        return match ? match[1] : name;
    };

    // Grouping Logic for "Productos Más Vendidos (Agrupado)"
    const groupedTopProducts = useMemo(() => {
        if (!lp) return [];
        const groups: Record<string, GroupedTopProduct> = {};

        lp.forEach(p => {
            const baseName = getBaseName(p.productName);
            const key = p.productId; // Group by productId to avoid name collisions

            if (!groups[key]) {
                groups[key] = {
                    productId: p.productId,
                    productName: baseName,
                    totalSold: 0,
                    totalRevenue: 0,
                    totalProfit: 0,
                    variants: []
                };
            }

            groups[key].totalSold += p.totalSold;
            groups[key].totalRevenue += p.totalRevenue;
            groups[key].totalProfit += p.totalProfit;
            groups[key].variants.push({
                productId: p.productId,
                productName: p.productName,
                totalSold: p.totalSold,
                totalRevenue: p.totalRevenue,
                totalProfit: p.totalProfit,
                unitOfMeasure: p.productName.match(/\((.*?)\)$/)?.[1] || 'UNID'
            });
        });

        const sorted = Object.values(groups).sort((a, b) => b.totalRevenue - a.totalRevenue);
        const totalRevenue = sorted.reduce((sum, p) => sum + p.totalRevenue, 0);

        return sorted.map((p, index) => ({
            ...p,
            rank: index + 1,
            percentage: totalRevenue > 0 ? (p.totalRevenue / totalRevenue) * 100 : 0
        }));
    }, [lp]);

    const topProductColumns: Column<GroupedTopProduct>[] = [
        {
            key: 'rank',
            header: '#',
            render: (product) => {
                const r = product.rank || 0;
                let bgClass = 'bg-slate-500';
                if (r === 1) bgClass = 'bg-yellow-500 hover:bg-yellow-600';
                else if (r === 2) bgClass = 'bg-slate-400 hover:bg-slate-500';
                else if (r === 3) bgClass = 'bg-orange-600 hover:bg-orange-700';

                return (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-colors ${bgClass}`}>
                        {r}
                    </div>
                );
            }
        },
        {
            key: 'productName',
            header: 'PRODUCTO',
            render: (product) => (
                <div className="py-2">
                    <span className="font-bold text-foreground block">{product.productName}</span>
                    {product.variants.length > 1 && (
                        <span className="text-xs text-muted-foreground font-medium">{product.variants.length} presentaciones</span>
                    )}
                </div>
            ),
            footer: <span className="font-bold">TOTAL</span>
        },
        {
            key: 'totalSold',
            header: 'CANTIDAD',
            className: 'text-right',
            render: (product) => {
                if (product.variants.length === 1) {
                    return <span className="font-medium">{product.variants[0].totalSold} {product.variants[0].unitOfMeasure}</span>;
                }
                return <span className="text-sm text-muted-foreground italic font-medium">Ver detalle</span>;
            }
        },
        {
            key: 'totalRevenue',
            header: 'INGRESOS TOTALES',
            className: 'text-right',
            render: (product) => <span className="font-bold text-foreground">{formatCurrency(product.totalRevenue)}</span>,
            footer: (data) => <span className="font-bold">{formatCurrency(data.reduce((sum, p) => sum + p.totalRevenue, 0))}</span>
        },
        {
            key: 'percentage',
            header: '% INGRESOS',
            className: 'text-right',
            render: (p) => (
                <div className="flex items-center justify-end gap-3 min-w-[120px]">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[80px]">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${p.percentage}%` }} />
                    </div>
                    <span className="text-sm font-mono font-bold w-14">{p.percentage?.toFixed(2)}%</span>
                </div>
            ),
            footer: (data) => <span className="font-bold">100.00%</span>
        }
    ];

    const generatePDFReport = () => {
        if (!report) return;
        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text('REPORTE ANALÍTICO DE VENTAS', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Periodo: ${formatDate(fromDate)} - ${formatDate(toDate)}`, 105, 28, { align: 'center' });

        const summary = [
            ['Ingresos Totales', formatCurrency(report.totalRevenue)],
            ['Costo de Ventas', formatCurrency(report.totalCost)],
            ['Utilidad Bruta', formatCurrency(report.totalProfit)],
            ['Margen de Ganancia', `${(report.profitMargin * 100).toFixed(2)}%`],
            ['Ticket Promedio', formatCurrency(report.averageTicket)]
        ];

        autoTable(doc, {
            startY: 40,
            head: [['Métrica', 'Valor']],
            body: summary,
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246] }
        });

        doc.save(`reporte-analitico-${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('PDF generado con éxito');
    };

    if (loadingReport || loadingLP) {
        return (
            <AppLayout>
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                    <RefreshCw className="w-12 h-12 text-primary animate-spin" />
                    <p className="text-muted-foreground font-medium">Analizando datos financieros...</p>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight flex items-center gap-3">
                        <BarChart3 className="w-10 h-10 text-primary" />
                        Centro Analítico
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">Visión estratégica de rentabilidad y desempeño</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-all shadow-sm flex items-center gap-2 font-bold"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Sincronizar
                    </button>
                    <button
                        onClick={generatePDFReport}
                        className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all shadow-md flex items-center gap-2 font-bold"
                    >
                        <Download className="w-5 h-5" />
                        Exportar PDF
                    </button>
                    {/* 
                    <button
                        onClick={() => router.push('/analytics/ia')}
                        className="p-3 bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-700 bg-size-200 animate-gradient-x text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all font-bold flex items-center gap-2 border border-white/10"
                    >
                        <BrainCircuit className="w-6 h-6" />
                        Analizador IA
                        <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                    </button>
                    */}
                </div>
            </div>

            {/* KPI Row - Premium Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {/* Revenue Card */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Ingresos (30d)</span>
                    </div>
                    <p className="text-3xl font-black text-foreground">{formatCurrency(report?.totalRevenue)}</p>
                    <div className="mt-4 flex items-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 w-fit px-2 py-1 rounded-full">
                        <ArrowUp className="w-3 h-3 mr-1" />
                        Meta superada
                    </div>
                </div>

                {/* Costs Card */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
                            <Tag className="w-6 h-6 text-orange-600" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Costo Directo</span>
                    </div>
                    <p className="text-3xl font-black text-orange-600">{formatCurrency(report?.totalCost)}</p>
                    <p className="mt-4 text-xs font-medium text-muted-foreground italic">Basado en precios de compra UOM</p>
                </div>

                {/* Profit Card */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group bg-gradient-to-br from-green-500/[0.03] to-transparent">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all" />
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Utilidad Bruta</span>
                    </div>
                    <p className="text-3xl font-black text-green-600">{formatCurrency(report?.totalProfit)}</p>
                    <p className="mt-4 text-xs font-medium text-muted-foreground">Retorno sobre inversión</p>
                </div>

                {/* Margin Card */}
                <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group bg-gradient-to-br from-indigo-500/[0.03] to-transparent">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
                            <PieChartIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Margen de Ganancia</span>
                    </div>
                    <p className="text-3xl font-black text-indigo-600">
                        {((report?.profitMargin || 0) * 100).toFixed(1)}%
                    </p>
                    <div className="mt-4 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${(report?.profitMargin || 0) * 100}%` }} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold">Desempeño Temporal</h3>
                            <p className="text-sm text-muted-foreground">Ingresos vs Utilidad por día</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-xs font-bold uppercase tracking-tighter">Ventas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500" />
                                <span className="text-xs font-bold uppercase tracking-tighter">Utilidad</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={report?.dailySummaries && report.dailySummaries.length === 1
                                ? [{ ...report.dailySummaries[0], date: new Date(new Date(report.dailySummaries[0].date).getTime() - 86400000).toISOString(), totalRevenue: 0, totalProfit: 0 }, ...report.dailySummaries]
                                : report?.dailySummaries}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                                <XAxis dataKey="date" tickFormatter={formatDate} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 600 }} tickFormatter={(v) => `S/${v}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    formatter={(v, name) => [
                                        formatCurrency(v as number),
                                        name === 'totalRevenue' ? 'Ventas' : name === 'totalProfit' ? 'Utilidad' : name
                                    ]}
                                    labelFormatter={formatDate}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="totalRevenue"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRev)"
                                    animationDuration={1500}
                                    connectNulls
                                />
                                <Area
                                    type="monotone"
                                    dataKey="totalProfit"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorProfit)"
                                    animationDuration={1500}
                                    connectNulls
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Side Stats */}
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                            Operación
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-2xl">
                                <span className="text-sm font-medium text-muted-foreground">Ticket Mediano</span>
                                <span className="font-bold">{formatCurrency(report?.averageTicket)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-2xl">
                                <span className="text-sm font-medium text-muted-foreground">Unidades por Venta</span>
                                <span className="font-bold">{(report ? (report.totalItems / (report.totalSales || 1)) : 0).toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-muted/30 p-3 rounded-2xl">
                                <span className="text-sm font-medium text-muted-foreground">Ventas Exitosas</span>
                                <span className="font-bold">{report?.totalSales}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden h-[180px]">
                        <div className="absolute top-0 right-0 p-4 opacity-20">
                            <Wallet className="w-20 h-20" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">KPI Crítico</h3>
                        <p className="text-lg font-medium text-slate-300">Retorno de Inversión (ROI)</p>
                        <p className="text-4xl font-black mt-4">
                            {(report && report.totalCost > 0) ? ((report.totalProfit / report.totalCost) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Top Products Table (Preserving layout and logic from image) */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Productos Más Vendidos (Agrupado)</h2>
                        <p className="text-sm text-muted-foreground font-medium">Top de rendimiento por volumen de ingresos</p>
                    </div>
                </div>
                <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg border-t-4 border-t-primary">
                    <DataTable
                        data={groupedTopProducts}
                        columns={topProductColumns}
                        keyExtractor={(item) => item.productId}
                        defaultRowsPerPage={10}
                        rowsPerPageOptions={[10, 20, 50, 100]}
                        emptyMessage="No hay datos de productos disponibles"
                        renderDetail={(product) => (
                            <div className="p-6 bg-muted/20 border-t border-border">
                                <h4 className="text-sm font-black mb-4 uppercase text-primary tracking-widest">Desglose por Presentación</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {product.variants.map((v, i) => (
                                        <div key={i} className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col justify-between">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-black bg-muted px-2 py-1 rounded-md text-muted-foreground uppercase">{v.unitOfMeasure}</span>
                                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md">Margen: {(v.totalRevenue > 0 ? (v.totalProfit / v.totalRevenue) * 100 : 0).toFixed(1)}%</span>
                                            </div>
                                            <p className="text-sm font-bold text-foreground truncate mb-2">{v.productName}</p>
                                            <div className="flex justify-between items-end border-t border-border pt-2 mt-2">
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Cantidad</p>
                                                    <p className="text-sm font-black">{v.totalSold}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Ingresos</p>
                                                    <p className="text-sm font-black text-blue-600">{formatCurrency(v.totalRevenue)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
