'use client';

import { useState } from 'react';
import axios from 'axios';
import { BrainCircuit, Sparkles, TrendingUp, TrendingDown, Target, Info } from 'lucide-react';
import { DailySales } from '@/types/analytics';
import { toast } from 'sonner';

interface SalesPredictionProps {
    dailyHistory: DailySales[];
}

interface PredictionResult {
    total_sales: number;
    average_sale: number;
    max_sale: number;
    predicted_next_day_sale: number;
    growth_trend: 'up' | 'down' | 'neutral';
    message: string;
}

export default function SalesPrediction({ dailyHistory }: SalesPredictionProps) {
    const [prediction, setPrediction] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);

    const runAnalysis = async () => {
        if (dailyHistory.length === 0) {
            toast.error('No hay historial de ventas suficiente para la IA');
            return;
        }

        setLoading(true);
        try {
            // Transformamos el historial de .NET al formato que espera FastAPI (Python)
            const sales_history = dailyHistory.map(d => ({
                date: d.date,
                amount: d.totalRevenue
            }));

            // Llamada al microservicio de Python (FastAPI)
            const response = await axios.post('http://localhost:8050/api/v1/process-sales', {
                sales_history,
                forecast_days: 7
            });

            setPrediction(response.data);
            toast.success('Análisis predictivo de Python completado');
        } catch (error) {
            console.error('Error calling Python Analytics:', error);
            toast.error('El microservicio de Python no está respondiendo');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
    };

    return (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <BrainCircuit className="w-64 h-64" />
            </div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                            <Sparkles className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Motor Predictivo Python</h3>
                            <p className="text-blue-300/70 text-sm font-medium">Análisis de series temporales en tiempo real</p>
                        </div>
                    </div>

                    <button
                        onClick={runAnalysis}
                        disabled={loading || dailyHistory.length === 0}
                        className="px-8 py-4 bg-white text-indigo-950 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-50 transition-all shadow-xl shadow-black/20 flex items-center gap-2 group disabled:opacity-50"
                    >
                        {loading ? 'Procesando en Python...' : 'Ejecutar Predicción IA'}
                        {!loading && <Target className="w-4 h-4 group-hover:scale-125 transition-transform" />}
                    </button>
                </div>

                {!prediction ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center bg-white/5 rounded-[2rem] border border-white/10 border-dashed">
                        <Info className="w-12 h-12 text-blue-400/30 mb-4" />
                        <p className="text-blue-200/50 max-w-xs italic">
                            Haz clic en el botón superior para enviar los datos de venta al motor de **FastAPI** y generar una proyección de ingresos.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Próximo día (Est.)</p>
                            <p className="text-3xl font-black">{formatCurrency(prediction.predicted_next_day_sale)}</p>
                            <div className="flex items-center gap-1 mt-2">
                                {prediction.growth_trend === 'up' ? (
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-rose-400" />
                                )}
                                <span className={`text-xs font-bold ${prediction.growth_trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    Tendencia {prediction.growth_trend === 'up' ? 'Alcista' : 'Bajista'}
                                </span>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Promedio Diario</p>
                            <p className="text-3xl font-black">{formatCurrency(prediction.average_sale)}</p>
                            <p className="text-[10px] text-white/40 mt-2 font-medium">Sobre histórico analizado</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Venta Máxima</p>
                            <p className="text-3xl font-black">{formatCurrency(prediction.max_sale)}</p>
                            <p className="text-[10px] text-white/40 mt-2 font-medium">Pico histórico detectado</p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col justify-center">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 border-l-2 border-emerald-500 pl-2">Machine Learning Insight:</p>
                            <p className="text-xs text-blue-100/80 leading-relaxed italic">
                                "{prediction.message}"
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
