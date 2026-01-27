'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import {
    TrendingUp,
    Calendar,
    DollarSign,
    ShoppingCart,
    ArrowUp,
    ArrowDown,
    Download,
    FileText,
    BarChart3
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
    total: number;
    count: number;
}

interface PaymentMethodStat {
    method: string;
    total: number;
    count: number;
    [key: string]: any;
}

interface TopProduct {
    productName: string;
    quantity: number;
    revenue: number;
}

interface AnalyticsData {
    todayRevenue: number;
    yesterdayRevenue: number;
    revenueGrowth: number;
    todaySalesCount: number;
    yesterdaySalesCount: number;
    weekRevenue: number;
    lastWeekRevenue: number;
    weekGrowth: number;
    monthRevenue: number;
    lastMonthRevenue: number;
    monthGrowth: number;
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
            console.log('Data keys:', Object.keys(response.data || {}));
            console.log('todayRevenue:', response.data?.todayRevenue);
            console.log('topProducts:', response.data?.topProducts);
            console.log('last30Days:', response.data?.last30Days);
            console.log('salesByPaymentMethod:', response.data?.salesByPaymentMethod);
            console.log('=== END DEBUG ===');
            setData(response.data);
        } catch (error: any) {
            console.error('Error fetching analytics:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
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
            ['Ventas Hoy', formatCurrency(data.todayRevenue), `${data.revenueGrowth.toFixed(1)}%`],
            ['Ventas Semana', formatCurrency(data.weekRevenue), `${data.weekGrowth.toFixed(1)}%`],
            ['Ventas Mes', formatCurrency(data.monthRevenue), `${data.monthGrowth.toFixed(1)}%`],
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
            p.quantity.toString(),
            formatCurrency(p.revenue)
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
            paymentMethodLabels[p.method] || p.method,
            p.count.toString(),
            formatCurrency(p.total)
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
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Dashboard de Ventas</h1>
                    <p className="text-muted-foreground mt-1">Análisis y tendencias de tu negocio</p>
                </div>
                <div className="flex gap-3">
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
                        {data.revenueGrowth >= 0 ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <ArrowUp className="w-4 h-4" />
                                <span className="text-sm font-medium">{data.revenueGrowth.toFixed(1)}%</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <ArrowDown className="w-4 h-4" />
                                <span className="text-sm font-medium">{Math.abs(data.revenueGrowth).toFixed(1)}%</span>
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
                        {data.weekGrowth >= 0 ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <ArrowUp className="w-4 h-4" />
                                <span className="text-sm font-medium">{data.weekGrowth.toFixed(1)}%</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <ArrowDown className="w-4 h-4" />
                                <span className="text-sm font-medium">{Math.abs(data.weekGrowth).toFixed(1)}%</span>
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
                        {data.monthGrowth >= 0 ? (
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                <ArrowUp className="w-4 h-4" />
                                <span className="text-sm font-medium">{data.monthGrowth.toFixed(1)}%</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                <ArrowDown className="w-4 h-4" />
                                <span className="text-sm font-medium">{Math.abs(data.monthGrowth).toFixed(1)}%</span>
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
                                dataKey="total"
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
                                label={(entry: any) => {
                                    const method = entry.method || '';
                                    const percent = entry.percent || 0;
                                    return `${paymentMethodLabels[method] || method} ${(percent * 100).toFixed(0)}%`;
                                }}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="total"
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

            {/* Top Products Table */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-bold text-foreground">Top 10 Productos Más Vendidos</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">#</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Producto</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Cantidad</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Ingresos</th>
                                <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">% del Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {data.topProducts.map((product, index) => {
                                const totalRevenue = data.topProducts.reduce((sum, p) => sum + p.revenue, 0);
                                const percentage = (product.revenue / totalRevenue) * 100;

                                return (
                                    <tr key={index} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' :
                                                index === 1 ? 'bg-slate-400' :
                                                    index === 2 ? 'bg-orange-600' :
                                                        'bg-slate-300'
                                                }`}>
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-foreground">{product.productName}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-medium text-foreground">{product.quantity}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-semibold text-foreground">{formatCurrency(product.revenue)}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-blue-600 rounded-full"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm text-muted-foreground w-12 text-right">
                                                    {percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
