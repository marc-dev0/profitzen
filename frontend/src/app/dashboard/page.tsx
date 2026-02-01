'use client';

import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useDashboard } from '@/hooks/useAnalytics';
import { useAuthStore } from '@/store/authStore';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  ArrowUp,
  ArrowDown,
  Calendar,
  Package,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Download,
  FileText,
  BarChart3,
  Wallet,
  Tag,
  PieChart as PieChartIcon,
  RefreshCw,
  Clock
} from 'lucide-react';
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
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area
} from 'recharts';
import { useRouter } from 'next/navigation';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: dashboardData, isLoading, isError, error, refetch } = useDashboard(user?.currentStoreId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  const formatPercentage = (p: number) => {
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
  };

  const chartData = useMemo(() => {
    if (!dashboardData?.last30Days) return [];
    return dashboardData.last30Days.map(d => ({
      date: new Date(d.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
      revenue: d.totalRevenue,
      profit: d.totalProfit || 0
    }));
  }, [dashboardData]);



  if (isLoading) {
    return (
      <AppLayout>
        <div className="h-full min-h-[50vh] flex items-center justify-center flex-col gap-4">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Cargando tablero...</p>
        </div>
      </AppLayout>
    );
  }

  if (isError) {
    return (
      <AppLayout>
        <div className="h-full min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertTriangle className="w-12 h-12 text-destructive" />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-2xl font-black text-foreground tracking-tight">¡Ups! Algo salió mal</h2>
            <p className="text-muted-foreground font-medium">
              No pudimos cargar tu comando de ventas. Por favor intenta nuevamente.
            </p>
            <p className="text-xs text-muted-foreground bg-muted p-2 rounded mt-2 font-mono break-all text-left">
              {(error as any)?.response?.data?.error || (error as any)?.response?.data?.message || (error as Error)?.message || 'Error desconocido'}
              {(error as any)?.response?.data?.inner && (
                <span className="block mt-1 text-red-500">{(error as any).response.data.inner}</span>
              )}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="mt-4 px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all font-bold flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Reintentar Conexión
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!user?.currentStoreId) {
    return (
      <AppLayout>
        <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
          <h2 className="text-xl font-bold">Selecciona un Almacén</h2>
          <p className="text-muted-foreground">Debes seleccionar una sucursal para ver el tablero.</p>
        </div>
      </AppLayout>
    );
  }

  if (!dashboardData) {
    return (
      <AppLayout>
        <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-center p-8">
          <RefreshCw className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold">Esperando datos...</h2>
          <p className="text-muted-foreground mb-4">Si esto persiste, intenta sincronizar manualmente.</p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-bold"
          >
            Recargar
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Comando de Ventas</h1>
          <p className="text-muted-foreground font-medium mt-1">Resumen ejecutivo del rendimiento operativo</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            className="p-3 bg-secondary text-secondary-foreground rounded-2xl hover:bg-secondary/80 transition-all flex items-center gap-2 font-bold"
          >
            <RefreshCw className="w-5 h-5" />
            Actualizar
          </button>
          <button
            onClick={() => router.push('/analytics')}
            className="p-3 bg-primary text-primary-foreground rounded-2xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2 font-bold"
          >
            <BarChart3 className="w-5 h-5" />
            Análisis Profundo
          </button>
        </div>
      </div>

      {/* KPI Section - High Impact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Ventas Hoy</span>
          </div>
          <p className="text-3xl font-black text-foreground">{formatCurrency(dashboardData.todayRevenue)}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${dashboardData.revenueGrowthPercentage >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {dashboardData.revenueGrowthPercentage >= 0 ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
              {formatPercentage(dashboardData.revenueGrowthPercentage)}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{dashboardData.todaySalesCount} Tickets</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Utilidad Hoy</span>
          </div>
          <p className="text-3xl font-black text-indigo-600">
            {formatCurrency(dashboardData.todayProfit || 0)}
          </p>
          <p className="mt-4 text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Margen: {dashboardData.todayRevenue > 0 ? ((dashboardData.todayProfit / dashboardData.todayRevenue) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/20 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Ticket Promedio</span>
          </div>
          <p className="text-3xl font-black text-foreground">{formatCurrency(dashboardData.averageTicket)}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className={`flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${dashboardData.averageTicket >= dashboardData.lastMonthAverageTicket ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {dashboardData.averageTicket >= dashboardData.lastMonthAverageTicket ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
              {dashboardData.lastMonthAverageTicket > 0 ? (((dashboardData.averageTicket - dashboardData.lastMonthAverageTicket) / dashboardData.lastMonthAverageTicket) * 100).toFixed(1) : 0}%
            </span>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">vs mes anterior</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Alertas Stock</span>
          </div>
          <p className="text-3xl font-black text-foreground">{dashboardData.lowStockAlerts.length}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dashboardData.lowStockAlerts.length > 5 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {dashboardData.lowStockAlerts.length > 5 ? 'Atención Crítica' : 'Nivel Normal'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Card */}
        <div className="lg:col-span-2 bg-card border border-border rounded-[2.5rem] p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <div>
                <h3 className="text-xl font-black tracking-tight uppercase">Tendencia Mensual</h3>
                <p className="text-sm text-muted-foreground font-medium">Volumen de ventas de los últimos 30 días</p>
              </div>
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
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.5} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} tickFormatter={(v) => `S/${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 800 }}
                  labelStyle={{ fontWeight: 800, marginBottom: '0.5rem' }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  animationDuration={1500}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side Actions & Inventory */}
        <div className="space-y-6">
          <div className="bg-slate-950 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group cursor-pointer" onClick={() => router.push('/pos')}>
            <div className="absolute top-0 right-0 p-8 opacity-20 transform group-hover:scale-110 transition-transform duration-500">
              <ShoppingCart className="w-24 h-24" />
            </div>
            <div className="relative z-10">
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-2">Acceso Rápido</h3>
              <p className="text-2xl font-black mb-6">Iniciar Punto de Venta (POS)</p>
              <div className="flex items-center gap-2 group/btn">
                <span className="text-sm font-bold border-b border-blue-400 pb-0.5">Abrir Terminal</span>
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm">
            <h3 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center justify-between">
              Alertas de Stock
              <span className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full">{dashboardData.lowStockAlerts.length}</span>
            </h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {dashboardData.lowStockAlerts.length > 0 ? (
                dashboardData.lowStockAlerts.map((alert, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-border transition-all">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-primary uppercase tracking-tighter">{alert.productCode}</span>
                      <span className="text-sm font-bold text-foreground truncate max-w-[120px]">{alert.productName}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${alert.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                        {alert.currentStock} und
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <Package className="w-12 h-12 text-muted/30 mx-auto mb-2" />
                  <p className="text-xs font-bold text-muted-foreground uppercase">Inventario Óptimo</p>
                </div>
              )}
            </div>
            <button
              onClick={() => router.push('/inventory')}
              className="w-full mt-6 py-4 rounded-2xl border-2 border-dashed border-border text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              Gestionar Almacén
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
