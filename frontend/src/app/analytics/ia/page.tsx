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

export default function IntelligentAnalyzerPage() {
    const router = useRouter();
    const [insights, setInsights] = useState<InventoryInsightReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

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
                <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 mb-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <BrainCircuit className="w-40 h-40" />
                    </div>
                    <div className="relative z-10 flex items-start gap-4">
                        <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                            <Sparkles className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                                Resumen del Analizador
                            </h3>
                            <p className="text-blue-100 text-lg leading-relaxed max-w-4xl">
                                {insights?.aiSummary || (analyzing ? "El cerebro artificial de Profitzen está procesando miles de datos para darte la mejor estrategia..." : "Analizando comportamiento de ventas para generar recomendaciones...")}
                            </p>
                        </div>
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
            </div>
        </AppLayout>
    );
}
