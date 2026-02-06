'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import {
    BrainCircuit,
    AlertTriangle,
    TrendingDown,
    ShoppingCart,
    Package,
    ArrowRight,
    Sparkles,
    RefreshCw,
    Clock,
    DollarSign,
    MinusCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { InventoryInsightReport, RiskAssessment, SuggestedPurchase, ProductPerformance } from '@/types/analytics';
import { useSalesReport, useProductPerformance } from '@/hooks/useAnalytics';
import { useAuthStore } from '@/store/authStore';
import SalesPrediction from '@/components/analytics/SalesPrediction';

export default function IntelligentAnalyzerPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [insights, setInsights] = useState<InventoryInsightReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    // Date Range for ROI/Indicators (Last 30 days)
    const [fromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d;
    });
    const [toDate] = useState(() => new Date());

    const { data: salesReport } = useSalesReport(fromDate, toDate, user?.currentStoreId);
    const { data: lp } = useProductPerformance(user?.currentStoreId);

    useEffect(() => {
        fetchInsights(false);
    }, []);

    const fetchInsights = async (refreshAi: boolean = false) => {
        try {
            if (!refreshAi && !analyzing) setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/inventory/insights?refreshAi=${refreshAi}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setInsights(response.data);

            // If processing in background, poll again in 5 seconds
            if (response.data.isAiProcessing) {
                setAnalyzing(true);
                setTimeout(() => fetchInsights(false), 5000);
            } else if (analyzing) {
                setAnalyzing(false);
                toast.success('Análisis estratégico de IA completado');
            }
        } catch (error) {
            console.error('Error fetching insights:', error);
            toast.error('Error al cargar el análisis de inventario');
        } finally {
            setLoading(false);
        }
    };

    const runFullAnalysis = async () => {
        if (analyzing) return;

        setAnalyzing(true);
        // Set a "thinking" message so the user knows the IA is working
        setInsights(prev => prev ? { ...prev, aiSummary: "La inteligencia artificial está analizando tus datos en segundo plano... Puedes seguir navegando, los resultados se actualizarán automáticamente." } : null);

        try {
            const token = localStorage.getItem('token');
            // Trigger background analysis
            await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/inventory/insights/trigger`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.info('Proceso de IA iniciado. Los resultados aparecerán en unos momentos.');

            // Start polling
            setTimeout(() => fetchInsights(false), 3000);
        } catch (error) {
            console.error('Error in full analysis:', error);
            toast.error('Error al iniciar el análisis de IA');
            setAnalyzing(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    };

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'Critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
            case 'High': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
            case 'Medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
            default: return 'text-green-600 bg-green-100 dark:bg-green-900/20';
        }
    };

    if (loading && !insights) {
        return (
            <AppLayout>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
                            <div className="relative rounded-full bg-primary/10 p-4">
                                <BrainCircuit className="w-12 h-12 text-primary animate-pulse" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">Iniciando Analizador IA...</h2>
                        <p className="text-muted-foreground">Procesando tendencias de ventas y niveles de stock</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const handleGoToPurchase = (s: SuggestedPurchase) => {
        const riskItem = insights?.atRiskProducts.find(r => r.productId === s.productId);
        const params = new URLSearchParams({
            productId: s.productId,
            productName: s.productName,
            quantity: s.quantityToOrder.toString(),
            price: s.unitPrice.toString(),
            uomId: "" // We lead with basic info, PurchasesPage will fetch full product details
        });

        router.push(`/purchases?${params.toString()}`);
    };

    return (
        <AppLayout>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-3xl font-bold text-foreground">Analizador Inteligente</h1>
                            <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Powered by IA
                            </div>
                        </div>
                        <p className="text-muted-foreground">Predicciones y recomendaciones estratégicas basadas en tus datos.</p>
                    </div>
                    <button
                        onClick={runFullAnalysis}
                        disabled={analyzing}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:grayscale font-medium"
                    >
                        {analyzing ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-5 h-5" />
                        )}
                        {analyzing ? 'Analizando...' : 'Recalcular Inteligencia'}
                    </button>
                </div>

                {/* AI Summary Banner */}
                <div className={`rounded-2xl p-6 mb-8 text-white shadow-xl relative overflow-hidden transition-all ${insights?.aiSummary?.includes('Error') || insights?.aiSummary?.includes('⚠️')
                    ? 'bg-gradient-to-br from-red-900 to-red-950 border border-red-500/30'
                    : 'bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950'
                    }`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        {insights?.aiSummary?.includes('Error') || insights?.aiSummary?.includes('⚠️')
                            ? <AlertTriangle className="w-40 h-40" />
                            : <BrainCircuit className="w-40 h-40" />
                        }
                    </div>
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl border ${insights?.aiSummary?.includes('Error') || insights?.aiSummary?.includes('⚠️')
                                ? 'bg-red-500/20 border-red-500/40'
                                : 'bg-white/10 border-white/20'
                                }`}>
                                {insights?.aiSummary?.includes('Error') || insights?.aiSummary?.includes('⚠️')
                                    ? <AlertTriangle className="w-8 h-8 text-red-400" />
                                    : <Sparkles className="w-8 h-8 text-blue-400" />
                                }
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        {insights?.aiSummary?.includes('Error') || insights?.aiSummary?.includes('⚠️')
                                            ? 'Error en el Análisis'
                                            : 'Resumen del Analizador'
                                        }
                                    </h3>
                                    {!analyzing && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-white/50 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-md">
                                            <Clock className="w-3 h-3" />
                                            Actualizado: {new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    )}
                                </div>
                                <p className={`${insights?.aiSummary?.includes('Error') || insights?.aiSummary?.includes('⚠️')
                                    ? 'text-red-100'
                                    : 'text-blue-100'
                                    } text-lg leading-relaxed max-w-4xl italic`}>
                                    "{insights?.aiSummary || (analyzing ? "El cerebro artificial de Profitzen está procesando miles de datos para darte la mejor estrategia..." : "Analizando comportamiento de ventas para generar recomendaciones...")}"
                                </p>
                            </div>
                        </div>

                        {(insights?.aiSummary?.includes('Error') || insights?.aiSummary?.includes('⚠️')) && (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => runFullAnalysis()}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-bold transition-colors"
                                >
                                    Reintentar Análisis
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Column 1: Risk Assessment */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-6 h-6 text-orange-500" />
                                <h2 className="text-xl font-bold">Riesgo de Quiebre de Stock</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {insights?.atRiskProducts.map((p, idx) => (
                                    <div key={idx} className="bg-card border border-border rounded-xl p-5 hover:border-blue-500/50 transition-colors shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{p.productCode}</p>
                                                <h4 className="font-bold text-foreground line-clamp-1">{p.productName}</h4>
                                            </div>
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${getRiskColor(p.riskLevel)}`}>
                                                {p.riskLevel === 'Critical' ? 'Crítico' : p.riskLevel}
                                            </span>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> Tiempo restante
                                                    </span>
                                                    <span className="font-bold text-foreground">{p.estimatedDaysRemaining} días</span>
                                                </div>
                                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${p.estimatedDaysRemaining <= 3 ? 'bg-red-500' :
                                                            p.estimatedDaysRemaining <= 7 ? 'bg-orange-500' : 'bg-yellow-500'
                                                            }`}
                                                        style={{ width: `${Math.max(5, (p.estimatedDaysRemaining / 14) * 100)}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                                                <span>Stock Actual: <b>{p.currentStock} {p.uomName || 'unid.'}</b></span>
                                                <span>Venta diaria: <b>~{p.dailyConsumptionRate} {p.uomName || 'unid.'}</b></span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {insights?.atRiskProducts.length === 0 && (
                                    <div className="col-span-full py-12 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                                        <p className="text-muted-foreground">No hay riesgos inminentes detectados.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Inventory Value / Purchase Recommendations */}
                        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mb-8">
                            <div className="p-6 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-foreground">Órdenes de Compra Sugeridas</h3>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                                            <th className="px-6 py-4 font-bold">Producto</th>
                                            <th className="px-6 py-4 font-bold text-right">Sugerido</th>
                                            <th className="px-6 py-4 font-bold text-right">Costo Est.</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {insights?.purchaseRecommendations.map((s, idx) => {
                                            const riskItem = insights.atRiskProducts.find(r => r.productId === s.productId);
                                            const uom = riskItem?.uomName || 'unid.';

                                            return (
                                                <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="font-bold text-foreground">{s.productName}</p>
                                                            <p className="text-xs text-muted-foreground">{s.reason}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-foreground">
                                                        +{s.quantityToOrder} {uom}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-bold text-blue-600">
                                                        {formatCurrency(s.estimatedCost)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => handleGoToPurchase(s)}
                                                            className="p-2 rounded-lg bg-blue-50 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <ArrowRight className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {insights?.purchaseRecommendations.length === 0 && (
                                    <div className="py-12 text-center">
                                        <p className="text-muted-foreground">Tu inventario está optimizado para la demanda actual.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Dead Stock / Insights Sidebar */}
                    <div className="space-y-8">
                        <section className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-red-50 dark:bg-red-950/20 px-6 py-4 border-b border-border flex items-center gap-2">
                                <MinusCircle className="w-5 h-5 text-red-600" />
                                <h2 className="text-lg font-bold text-red-600">Stock Estancado (30+ días)</h2>
                            </div>
                            <div className="p-2">
                                {insights?.deadStock.map((p, idx) => (
                                    <div key={idx} className="p-4 hover:bg-muted/50 rounded-lg transition-colors border-b border-border/50 last:border-0">
                                        <h4 className="font-bold text-foreground text-sm line-clamp-1">{p.productName}</h4>
                                        <div className="flex justify-between items-center mt-2 text-xs">
                                            <span className="text-muted-foreground">Última venta: {p.daysSinceLastSale} días</span>
                                            <span className="font-bold text-red-500">Capital Atrapado</span>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                            <button className="flex-1 px-3 py-1.5 bg-muted text-foreground rounded-lg text-xs font-bold hover:bg-muted/80">
                                                Promoción
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {insights?.deadStock.length === 0 && (
                                    <div className="py-8 text-center">
                                        <p className="text-xs text-muted-foreground px-4">¡Excelente rotación! Todos tus productos han tenido movimiento recientemente.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-xl p-6 border border-blue-100 dark:border-blue-900/50">
                            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                <TrendingDown className="w-4 h-4" /> Tip de Inteligencia
                            </h3>
                            <p className="text-sm text-blue-800/80 dark:text-blue-400/80 leading-relaxed">
                                Los productos con stock crítico representan una pérdida potencial de
                                <span className="font-bold" > {formatCurrency(insights?.purchaseRecommendations.reduce((acc, curr) => acc + curr.estimatedCost, 0) || 0)} </span >
                                en ventas esta semana. Reponer inventario ahora optimizará tu flujo de caja.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sales Prediction Section (Python FastAPI Integration) */}
                <div className="mt-12">
                    <SalesPrediction dailyHistory={salesReport?.dailySummaries || []} />
                </div>

                <div className="mt-12 space-y-8">
                    <div className="flex items-center gap-3">
                        <TrendingDown className="w-8 h-8 text-indigo-600 rotate-180" />
                        <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Rendimiento Mensual</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* ROI Card */}
                        <div className="bg-slate-900 text-white rounded-[2rem] p-8 shadow-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                                <DollarSign className="w-24 h-24" />
                            </div>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">KPI Estratégico</span>
                            <h3 className="text-xl font-bold mb-4">Retorno de Inversión</h3>
                            <div className="flex items-baseline gap-2">
                                <p className="text-5xl font-black">
                                    {(salesReport && salesReport.totalCost > 0) ? ((salesReport.totalProfit / salesReport.totalCost) * 100).toFixed(1) : 0}%
                                </p>
                                <span className="text-slate-400 font-bold">ROI</span>
                            </div>
                            <p className="mt-4 text-sm text-slate-400">Eficiencia de tu capital invertido en los últimos 30 días.</p>
                        </div>

                        {/* Top Product Card */}
                        {lp && lp.length > 0 && (
                            <div className="bg-card border border-border rounded-[2rem] p-8 shadow-sm lg:col-span-2">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold">Productos Estrella</h3>
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Top 5 por Ingresos</span>
                                </div>
                                <div className="space-y-4">
                                    {lp.slice(0, 5).map((p, i) => (
                                        <div key={p.productId} className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-bold text-sm truncate max-w-[200px]">{p.productName}</span>
                                                    <span className="font-bold text-sm text-indigo-600">{formatCurrency(p.totalRevenue)}</span>
                                                </div>
                                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full"
                                                        style={{ width: `${(p.totalRevenue / lp[0].totalRevenue) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
