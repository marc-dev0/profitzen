'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useDashboard } from '@/hooks/useAnalytics';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileSpreadsheet, FileText } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const PAYMENT_METHOD_NAMES: Record<string, string> = {
  'Cash': 'Efectivo',
  'Card': 'Tarjeta',
  'Transfer': 'Transferencia',
  'Yape': 'Yape',
  'Plin': 'Plin',
  'Credit': 'Crédito'
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();

  // Debug: log user data
  console.log('[Dashboard] User:', user);
  console.log('[Dashboard] StoreId:', user?.currentStoreId);

  const { data: dashboardData, isLoading, error } = useDashboard(user?.currentStoreId);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated || !isAuthenticated) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    // Use UTC to prevent timezone shifts
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const chartData = dashboardData?.last30Days?.map(day => ({
    date: formatShortDate(day.date),
    ventas: day.totalRevenue,
    transacciones: day.totalSales
  })) || [];

  const topProductsData = dashboardData?.topProducts?.slice(0, 5).map(p => ({
    name: p.productName.length > 25 ? p.productName.substring(0, 25) + '...' : p.productName,
    fullName: p.productName,
    ventas: p.totalRevenue,
    cantidad: p.totalSold
  })) || [];

  const paymentMethodData = dashboardData?.salesByPaymentMethod?.map(pm => ({
    name: PAYMENT_METHOD_NAMES[pm.paymentMethod] || pm.paymentMethod,
    value: pm.totalAmount,
    count: pm.transactionCount
  })) || [];

  const exportToExcel = (data: any) => {
    const exportData = [
      { Métrica: 'Ventas Hoy', Valor: formatCurrency(data.todayRevenue) },
      { Métrica: 'Ventas Semana', Valor: formatCurrency(data.weekRevenue) },
      { Métrica: 'Ventas Mes', Valor: formatCurrency(data.monthRevenue) },
      { Métrica: 'Ticket Promedio', Valor: formatCurrency(data.averageTicket) },
    ];

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');

    // Add top products sheet
    if (data.topProducts && data.topProducts.length > 0) {
      const productsData = data.topProducts.map((p: any, i: number) => ({
        '#': i + 1,
        Producto: p.productName,
        Cantidad: p.totalSold,
        Ingresos: formatCurrency(p.totalRevenue)
      }));
      const wsProducts = XLSX.utils.json_to_sheet(productsData);
      XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Productos');
    }

    const fileName = `dashboard-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Archivo Excel descargado correctamente');
  };

  const exportToPDF = (data: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DASHBOARD DE VENTAS', pageWidth / 2, 20, { align: 'center' });

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
      ['Métrica', 'Valor'],
      ['Ventas Hoy', formatCurrency(data.todayRevenue)],
      ['Ventas Semana', formatCurrency(data.weekRevenue)],
      ['Ventas Mes', formatCurrency(data.monthRevenue)],
      ['Ticket Promedio', formatCurrency(data.averageTicket)]
    ];

    autoTable(doc, {
      startY: 45,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Top Products
    if (data.topProducts && data.topProducts.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const topProductsY = (doc as any).lastAutoTable.finalY + 15;
      doc.text('Top Productos', 14, topProductsY);

      const productsData = data.topProducts.slice(0, 10).map((p: any, i: number) => [
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
    }

    doc.save(`dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Reporte PDF generado correctamente');
  };

  return (

    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Dashboard de Ventas
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Análisis y tendencias de tu negocio</p>
        </div>
        {!isLoading && !error && dashboardData && (
          <div className="flex gap-3">
            <button
              onClick={() => exportToExcel(dashboardData)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-600/30 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
              Exportar Excel
            </button>
            <button
              onClick={() => exportToPDF(dashboardData)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-600/30 flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Exportar PDF
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Cargando datos...</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded mb-4">
          <p className="font-medium">No hay datos disponibles</p>
          <p className="text-sm mt-1">El sistema aun no tiene ventas registradas. Los datos apareceran una vez que se procesen las primeras transacciones.</p>
        </div>
      )}

      {!isLoading && !error && dashboardData && (
        <>
          {/* Low Stock Alerts */}
          {dashboardData.lowStockAlerts && dashboardData.lowStockAlerts.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg mr-3">
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Alertas de Stock Bajo</h3>
                    <p className="text-sm text-muted-foreground">{dashboardData.lowStockAlerts.length} productos requieren atención</p>
                  </div>
                </div>
                <Link
                  href="/inventario"
                  className="text-sm font-medium text-primary hover:text-primary/80 flex items-center bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
                >
                  Ver inventario completo
                  <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent -mx-4 px-4 sm:mx-0 sm:px-0">
                {dashboardData.lowStockAlerts.map((alert, index) => (
                  <div
                    key={`${alert.productId}-${index}`}
                    className={`min-w-[280px] md:min-w-[320px] bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border-l-4 group
                          ${alert.severity === 'critical' ? 'border-l-red-500' :
                        alert.severity === 'high' ? 'border-l-orange-500' : 'border-l-yellow-400'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-semibold text-foreground truncate" title={alert.productName}>
                          {alert.productName}
                        </h4>
                        <span className="inline-block text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border mt-1">
                          {alert.productCode}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide
                            ${alert.severity === 'critical' ? 'bg-red-50 text-red-700' :
                          alert.severity === 'high' ? 'bg-orange-50 text-orange-700' : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {alert.severity === 'critical' ? 'CRÍTICO' :
                          alert.severity === 'high' ? 'ALTO' : 'MEDIO'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Stock Actual</div>
                        <div className={`text-2xl font-bold font-mono leading-none
                              ${alert.severity === 'critical' ? 'text-red-500' :
                            alert.severity === 'high' ? 'text-orange-500' : 'text-foreground'
                          }`}>
                          {alert.currentStock}
                          <span className="text-sm font-normal text-gray-400 ml-1">/ {alert.minimumStock}</span>
                        </div>
                      </div>

                      {/* Mini visual indicator bar */}
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${alert.severity === 'critical' ? 'bg-red-500' :
                            alert.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-400'
                            }`}
                          style={{ width: `${Math.min((alert.currentStock / alert.minimumStock) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card p-6 rounded-lg shadow border-l-4 border-blue-500">
              <h3 className="text-sm font-medium text-muted-foreground uppercase">Ventas Hoy</h3>
              <p className="text-2xl font-bold text-foreground mt-2">
                {formatCurrency(dashboardData.todayRevenue)}
              </p>
              <div className="flex items-center mt-2">
                <span className={`text-sm font-medium ${dashboardData.revenueGrowthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(dashboardData.revenueGrowthPercentage)}
                </span>
                <span className="text-sm text-muted-foreground ml-1">vs ayer</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{dashboardData.todaySalesCount} transacciones</p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow border-l-4 border-green-500">
              <h3 className="text-sm font-medium text-muted-foreground uppercase">Semana</h3>
              <p className="text-2xl font-bold text-foreground mt-2">
                {formatCurrency(dashboardData.weekRevenue)}
              </p>
              <div className="flex items-center mt-2">
                <span className={`text-sm font-medium ${dashboardData.weekGrowthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(dashboardData.weekGrowthPercentage)}
                </span>
                <span className="text-sm text-muted-foreground ml-1">vs sem. ant.</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Sem. Ant.: {formatCurrency(dashboardData.lastWeekRevenue)}</p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow border-l-4 border-purple-500">
              <h3 className="text-sm font-medium text-muted-foreground uppercase">Mes</h3>
              <p className="text-2xl font-bold text-foreground mt-2">
                {formatCurrency(dashboardData.monthRevenue)}
              </p>
              <div className="flex items-center mt-2">
                <span className={`text-sm font-medium ${dashboardData.monthGrowthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(dashboardData.monthGrowthPercentage)}
                </span>
                <span className="text-sm text-muted-foreground ml-1">vs mes ant.</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mes Ant.: {formatCurrency(dashboardData.lastMonthRevenue)}</p>
            </div>

            <div className="bg-card p-6 rounded-lg shadow border-l-4 border-orange-500">
              <h3 className="text-sm font-medium text-muted-foreground uppercase">Ticket Promedio</h3>
              <p className="text-2xl font-bold text-foreground mt-2">
                {formatCurrency(dashboardData.averageTicket)}
              </p>
              <div className="flex items-center mt-2">
                <span className={`text-sm font-medium ${dashboardData.averageTicket >= dashboardData.lastMonthAverageTicket ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {dashboardData.lastMonthAverageTicket > 0
                    ? formatPercentage(((dashboardData.averageTicket - dashboardData.lastMonthAverageTicket) / dashboardData.lastMonthAverageTicket) * 100)
                    : '+0.0%'}
                </span>
                <span className="text-sm text-muted-foreground ml-1">vs mes ant.</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mes Ant.: {formatCurrency(dashboardData.lastMonthAverageTicket)}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Sales Trend Chart */}
            <div className="bg-card p-6 rounded-lg shadow border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Tendencia de Ventas (30 dias)</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => value >= 1000 ? `S/${(value / 1000).toFixed(1)}k` : `S/${value}`}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      name="Ventas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos para mostrar
                </div>
              )}
            </div>

            {/* Top Products Bar Chart */}
            <div className="bg-card p-6 rounded-lg shadow border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Top 5 Productos (30 dias)</h3>
              {topProductsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProductsData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => value >= 1000 ? `S/${(value / 1000).toFixed(1)}k` : `S/${value}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={190}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value || 0))}
                      labelStyle={{ color: '#374151' }}
                    />
                    <Bar dataKey="ventas" fill="#10B981" name="ventas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No hay datos para mostrar
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Methods Pie Chart */}
            <div className="bg-card p-6 rounded-lg shadow border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Metodos de Pago (Mes)</h3>
              {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart margin={{ top: 0, right: 80, left: 80, bottom: 0 }}>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {paymentMethodData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value || 0))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No hay datos para mostrar
                </div>
              )}
            </div>

            {/* Top Products Table */}
            <div className="bg-card p-6 rounded-lg shadow border border-border lg:col-span-2">
              <h3 className="text-lg font-semibold text-foreground mb-4">Productos Mas Vendidos</h3>
              {dashboardData.topProducts && dashboardData.topProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Codigo</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Producto</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Cant.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {dashboardData.topProducts.slice(0, 10).map((product) => (
                        <tr key={product.productId} className="hover:bg-muted/50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                            {product.rank}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                            {product.productCode}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                            {product.productName}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground text-right">
                            {product.totalSold}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600 text-right">
                            {formatCurrency(product.totalRevenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay productos vendidos aun
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {!isLoading && !error && !dashboardData && (
        <div className="text-center py-8 bg-card rounded-lg shadow border border-border">
          <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="mt-4 text-muted-foreground">
            Bienvenido al sistema Profitzen. Comienza a registrar ventas para ver tus metricas aqui.
          </p>
          <Link href="/pos" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Ir a Punto de Venta
          </Link>
        </div>
      )}
    </AppLayout>
  );
}
