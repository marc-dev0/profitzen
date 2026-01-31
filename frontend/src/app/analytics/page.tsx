'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
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
    Sparkles
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
    ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DailySale {
    date: string;
    totalRevenue: number;
    totalSales: number;
}

interface PaymentMethodStat {
    paymentMethod: string;
    totalAmount: number;
    transactionCount: number;
    [key: string]: any;
}

interface TopProduct {
    rank?: number;
    productName: string;
    totalSold: number;
    totalRevenue: number;
    unitOfMeasure?: string;
}

interface GroupedTopProduct extends TopProduct {
    variants: TopProduct[];
    totalGroupRevenue: number;
    percentage?: number;
}





interface AnalyticsData {
    todayRevenue: number;
    yesterdayRevenue: number;
    revenueGrowthPercentage: number;
    todaySalesCount: number;
    yesterdaySalesCount: number;
    weekRevenue: number;
    lastWeekRevenue: number;
    weekGrowthPercentage: number;
    monthRevenue: number;
    lastMonthRevenue: number;
    monthGrowthPercentage: number;
    averageTicket: number;
    lastMonthAverageTicket: number;
    topProducts: TopProduct[];
    last30Days: DailySale[];
    salesByPaymentMethod: PaymentMethodStat[];
    lowStockAlerts: any[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const paymentMethodLabels: { [key: string]: string } = {
    Cash: 'Efectivo',
    Card: 'Tarjeta',
    Transfer: 'Transferencia',
    Credit: 'Crédito'
};

export default function AnalyticsPage() {
    const router = useRouter();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [groupedTopProducts, setGroupedTopProducts] = useState<GroupedTopProduct[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/sales/dashboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('=== ANALYTICS DATA DEBUG ===');
            console.log('Full response:', response);
            console.log('Response data:', response.data);

            const analyticsData: AnalyticsData = response.data;
            setData(analyticsData);

            // Grouping Logic
            const groups: { [key: string]: GroupedTopProduct } = {};
            analyticsData.topProducts.forEach((product) => {
                const name = product.productName;
                if (!groups[name]) {
                    groups[name] = {
                        ...product,
                        totalSold: 0, // We will just display 'Varies' or sum if units match, but simpler to sum just revenue
                        totalRevenue: 0,
                        totalGroupRevenue: 0,
                        variants: []
                    };
                }
                groups[name].variants.push(product);
                groups[name].totalRevenue += product.totalRevenue;
                groups[name].totalGroupRevenue += product.totalRevenue;
                // Sum quantity only if unit is same? For now let's just keep variants.
            });

            // Convert to array and sort by revenue
            // Convert to array and sort by revenue
            const groupedList = Object.values(groups).sort((a, b) => b.totalGroupRevenue - a.totalGroupRevenue);

            // Calculate total revenue from the grouped list (which should match the raw sum)
            const totalGroupedRevenue = groupedList.reduce((sum, p) => sum + p.totalGroupRevenue, 0);

            // Calculate initial percentages and assign ranks
            let currentSum = 0;
            const tempProductsWithPct = groupedList.map((p, index) => {
                p.rank = index + 1;
                // Calculate raw percentage
                let pct = totalGroupedRevenue > 0 ? (p.totalGroupRevenue / totalGroupedRevenue) * 100 : 0;
                // Parse to fixed 2 decimals to simulate what we display, but keep as number
                pct = parseFloat(pct.toFixed(2));
                return { ...p, percentage: pct };
            });

            // Adjust rounding errors to ensure EXACTLY 100.00%
            // We sum the rounded values. It might be 99.99 or 100.01.
            const sumOfRounded = tempProductsWithPct.reduce((sum, p) => sum + (p.percentage || 0), 0);
            const diff = 100 - sumOfRounded;

            // If there is a difference (e.g. 0.01), add it to the first (largest) item.
            // Using a small epsilon for float comparison safety
            if (Math.abs(diff) > 0.001 && tempProductsWithPct.length > 0) {
                if (tempProductsWithPct[0].percentage !== undefined) {
                    tempProductsWithPct[0].percentage += diff;
                    // Ensure javascript didn't introduce long float tails again
                    tempProductsWithPct[0].percentage = parseFloat(tempProductsWithPct[0].percentage.toFixed(2));
                }
            }

            setGroupedTopProducts(tempProductsWithPct);

        } catch (error: any) {
            console.error('Error fetching analytics:', error);
            toast.error('Error al cargar las estadísticas');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number | undefined | null) => {
        if (amount === undefined || amount === null || isNaN(amount)) {
            return 'S/ 0.00';
        }
        return `S/ ${amount.toFixed(2)}`;
    };

    const formatDate = (dateString: string | undefined | null) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            // Use UTC to prevent timezone shifts
            const day = date.getUTCDate().toString().padStart(2, '0');
            const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return '-';
        }
    };

    const generatePDFReport = () => {
        if (!data) return;

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE VENTAS', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const today = new Date();
        const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        doc.text(`Generado: ${dateStr}`, pageWidth / 2, 28, { align: 'center' });

        // Summary Stats
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumen Ejecutivo', 14, 40);

        const summaryData = [
            ['Métrica', 'Valor', 'Variación'],
            ['Ventas Hoy', formatCurrency(data.todayRevenue), `${data.revenueGrowthPercentage.toFixed(1)}%`],
            ['Ventas Semana', formatCurrency(data.weekRevenue), `${data.weekGrowthPercentage.toFixed(1)}%`],
            ['Ventas Mes', formatCurrency(data.monthRevenue), `${data.monthGrowthPercentage.toFixed(1)}%`],
            ['Ticket Promedio', formatCurrency(data.averageTicket), '-'],
            ['Ventas Hoy (Cant.)', data.todaySalesCount.toString(), '-']
        ];

        autoTable(doc, {
            startY: 45,
            head: [summaryData[0]],
            body: summaryData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] }
        });

        // Top Products
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const topProductsY = (doc as any).lastAutoTable.finalY + 15;
        doc.text('Top 10 Productos', 14, topProductsY);

        const productsData = data.topProducts.map((p, i) => [
            (i + 1).toString(),
            p.productName,
            p.totalSold.toString(),
            formatCurrency(p.totalRevenue)
        ]);

        autoTable(doc, {
            startY: topProductsY + 5,
            head: [['#', 'Producto', 'Cantidad', 'Ingresos']],
            body: productsData,
            theme: 'striped',
            headStyles: { fillColor: [16, 185, 129] }
        });

        // Payment Methods
        doc.addPage();
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Ventas por Método de Pago', 14, 20);

        const paymentData = data.salesByPaymentMethod.map(p => [
            paymentMethodLabels[p.paymentMethod] || p.paymentMethod,
            p.transactionCount.toString(),
            formatCurrency(p.totalAmount)
        ]);

        autoTable(doc, {
            startY: 25,
            head: [['Método', 'Cantidad', 'Total']],
            body: paymentData,
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11] }
        });

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Página ${i} de ${pageCount}`,
                pageWidth / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }

        doc.save(`reporte-ventas-${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success('Reporte PDF generado correctamente');
    };

    // Calculate total revenue for percentages
    const totalTopProductsRevenue = data?.topProducts.reduce((sum, p) => sum + p.totalRevenue, 0) || 0;

    const topProductColumns: Column<GroupedTopProduct>[] = [
        {
            key: 'rank',
            header: '#',
            render: (product) => {
                // We can use the rank from backend if available, or just render it. 
                // Backend sends 'Rank' in TopProductDto? Let's assume we map it or it comes as 'rank' (since JSON usually camelCases).
                // If 'rank' is not in API response, we might need to rely on index in full list, but DataTable paginates...
                // However, the backend DOES send 'Rank' (seen in SaleDto.cs). Let's use it.
                // If for some reason it's missing, we fall back to '-' 
                const r = product.rank || 0;
                let bgClass = 'bg-slate-300';
                if (r === 1) bgClass = 'bg-yellow-500';
                else if (r === 2) bgClass = 'bg-slate-400';
                else if (r === 3) bgClass = 'bg-orange-600';

                return (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${bgClass}`}>
                        {r}
                    </div>
                );
            }
        },
        {
            key: 'productName',
            header: 'PRODUCTO',
            render: (product) => (
                <div>
                    <span className="font-medium text-foreground">{product.productName}</span>
                    {product.variants.length > 1 && (
                        <span className="text-xs text-muted-foreground block">{product.variants.length} presentaciones</span>
                    )}
                </div>
            ),
            footer: <span className="font-bold text-foreground">TOTAL</span>
        },
        {
            key: 'totalSold',
            header: 'CANTIDAD',
            className: 'text-right',
            render: (product) => {
                // If only 1 variant, show it. If multiple, show "Ver detalle" or sum if possible?
                if (product.variants.length === 1) {
                    return (
                        <span className="font-medium text-foreground">
                            {product.variants[0].totalSold} {product.variants[0].unitOfMeasure || 'UNID'}
                        </span>
                    );
                }
                return <span className="text-sm text-muted-foreground italic">Ver detalle</span>;
            }
        },
        {
            key: 'totalRevenue',
            header: 'INGRESOS TOTALES',
            className: 'text-right',
            render: (product) => <span className="font-semibold text-foreground">{formatCurrency(product.totalGroupRevenue)}</span>,
            footer: (data) => {
                const total = data.reduce((sum, p) => sum + p.totalGroupRevenue, 0);
                return <span className="font-bold text-foreground">{formatCurrency(total)}</span>;
            }
        },
        {
            key: 'percentage', // Virtual key
            header: '% INGRESOS',
            className: 'text-right',
            render: (product) => {
                const percentage = product.percentage ?? (totalTopProductsRevenue > 0 ? (product.totalGroupRevenue / totalTopProductsRevenue) * 100 : 0);
                return (
                    <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                            {percentage.toFixed(2)}%
                        </span>
                    </div>
                );
            },
            footer: (data) => {
                const totalPct = data.reduce((sum, p) => sum + (p.percentage || 0), 0);
                return <span className="font-semibold text-foreground text-sm">{totalPct.toFixed(2)}%</span>;
            }
        }
    ];

    const renderTopProductDetail = (product: GroupedTopProduct) => {
        return (
            <div className="py-2">
                <p className="text-sm font-semibold mb-2 text-primary">Detalle por Unidad de Medida:</p>
                <div className="bg-background rounded border border-border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="px-4 py-2 text-left">Unidad</th>
                                <th className="px-4 py-2 text-right">Cantidad</th>
                                <th className="px-4 py-2 text-right">Precio Prom.</th>
                                <th className="px-4 py-2 text-right">Ingresos</th>
                                <th className="px-4 py-2 text-right">% del Producto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {product.variants.map((variant, idx) => {
                                const percent = product.totalGroupRevenue > 0 ? (variant.totalRevenue / product.totalGroupRevenue) * 100 : 0;
                                const avgPrice = variant.totalSold > 0 ? variant.totalRevenue / variant.totalSold : 0;
                                return (
                                    <tr key={idx} className="hover:bg-muted/30">
                                        <td className="px-4 py-2 font-medium">{variant.unitOfMeasure || 'UNID'}</td>
                                        <td className="px-4 py-2 text-right">{variant.totalSold}</td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(avgPrice)}</td>
                                        <td className="px-4 py-2 text-right font-semibold">{formatCurrency(variant.totalRevenue)}</td>
                                        <td className="px-4 py-2 text-right text-muted-foreground">{percent.toFixed(2)}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Cargando estadísticas...</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!data) {
        return (
            <AppLayout>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No hay datos disponibles</p>
                        <button
                            onClick={fetchAnalytics}
                            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            </AppLayout>
        );
    }



    return (
        <AppLayout>
            {/* ... existing headers and charts ... */}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Dashboard de Ventas</h1>
                    <p className="text-muted-foreground mt-1">Análisis y tendencias de tu negocio</p>
                </div>
                {/* ... existing buttons ... */}
                <div className="flex gap-3">
                    <button
                        onClick={() => router.push('/analytics/ia')}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-purple-500/30 transition-all font-medium shadow-lg flex items-center gap-2"
                    >
                        <BrainCircuit className="w-5 h-5" />
                        Analizador IA
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                    </button>
                    <button
                        onClick={generatePDFReport}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-600/30 flex items-center gap-2"
                    >
                        <Download className="w-5 h-5" />
                        Descargar PDF
                    </button>
                    <button
                        onClick={() => router.push('/sales')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/30"
                    >
                        Ver Historial
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Today Revenue */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        {data.revenueGrowthPercentage >= 0 ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <ArrowUp className="w-4 h-4" />
                                <span className="text-sm font-medium">{data.revenueGrowthPercentage.toFixed(1)}%</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <ArrowDown className="w-4 h-4" />
                                <span className="text-sm font-medium">{Math.abs(data.revenueGrowthPercentage).toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Ventas Hoy</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(data.todayRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-2">vs. ayer: {formatCurrency(data.yesterdayRevenue)}</p>
                </div>

                {/* Week Revenue */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        {data.weekGrowthPercentage >= 0 ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <ArrowUp className="w-4 h-4" />
                                <span className="text-sm font-medium">{data.weekGrowthPercentage.toFixed(1)}%</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <ArrowDown className="w-4 h-4" />
                                <span className="text-sm font-medium">{Math.abs(data.weekGrowthPercentage).toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Ventas Semana</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(data.weekRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-2">vs. semana anterior: {formatCurrency(data.lastWeekRevenue)}</p>
                </div>

                {/* Month Revenue */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        {data.monthGrowthPercentage >= 0 ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <ArrowUp className="w-4 h-4" />
                                <span className="text-sm font-medium">{data.monthGrowthPercentage.toFixed(1)}%</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <ArrowDown className="w-4 h-4" />
                                <span className="text-sm font-medium">{Math.abs(data.monthGrowthPercentage).toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Ventas Mes</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(data.monthRevenue)}</p>
                    <p className="text-xs text-muted-foreground mt-2">vs. mes anterior: {formatCurrency(data.lastMonthRevenue)}</p>
                </div>

                {/* Average Ticket */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                            <ShoppingCart className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">Ticket Promedio</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(data.averageTicket)}</p>
                    <p className="text-xs text-muted-foreground mt-2">Mes anterior: {formatCurrency(data.lastMonthAverageTicket)}</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Sales Trend Chart */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold text-foreground">Tendencia de Ventas (30 días)</h2>
                        <BarChart3 className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.last30Days}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                stroke="#888888"
                                style={{ fontSize: '12px' }}
                            />
                            <YAxis
                                stroke="#888888"
                                style={{ fontSize: '12px' }}
                                tickFormatter={(value) => `S/ ${value}`}
                            />
                            <Tooltip
                                formatter={(value: any) => formatCurrency(value)}
                                labelFormatter={formatDate}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: '8px',
                                    color: 'hsl(var(--foreground))'
                                }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                labelStyle={{ color: 'hsl(var(--foreground))' }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="totalRevenue"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                name="Ventas"
                                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Payment Methods Chart */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                    <h2 className="text-lg font-bold text-foreground mb-6">Métodos de Pago</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data.salesByPaymentMethod}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                nameKey="paymentMethod"
                                label={(entry: any) => {
                                    const percent = entry.percent || 0;
                                    if (percent < 0.05) return '';
                                    const method = entry.payload.paymentMethod || '';
                                    return `${paymentMethodLabels[method] || method} ${(percent * 100).toFixed(0)}%`;
                                }}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="totalAmount"
                            >
                                {data.salesByPaymentMethod.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: any) => formatCurrency(value)} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Products Table using DataTable */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-foreground">Productos Más Vendidos (Agrupado)</h2>
                </div>
                <DataTable
                    data={groupedTopProducts}
                    columns={topProductColumns}
                    keyExtractor={(item) => item.productName}
                    defaultRowsPerPage={10}
                    rowsPerPageOptions={[10, 20, 50]}
                    emptyMessage="No hay productos vendidos en este periodo"
                    renderDetail={renderTopProductDetail}
                />
            </div>
        </AppLayout>
    );
}
