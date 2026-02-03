'use client';

import { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store/authStore';
import { useSmartSummaries } from '@/hooks/useAnalytics';
import {
    Clock,
    Sparkles,
    ChevronRight,
    Calendar,
    ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VigilanteHistoryPage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { data: summaries, isLoading } = useSmartSummaries(20, user?.currentStoreId, 'DailyInsight');

    const formatDateTime = (date: string) => {
        const d = new Date(date);
        const dateStr = d.toLocaleDateString('es-PE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const timeStr = d.toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        return { dateStr, timeStr };
    };

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">Bitácora del Vigilante</h1>
                        <p className="text-muted-foreground font-medium">Historial completo de consejos estratégicos</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-muted/50 rounded-3xl animate-pulse" />
                        ))}
                    </div>
                ) : summaries && summaries.length > 0 ? (
                    <div className="space-y-6">
                        {summaries.map((s) => (
                            <div key={s.id} className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                                        <Calendar className="w-4 h-4 text-indigo-500" />
                                    </div>
                                    <span className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                                        {formatDateTime(s.createdAt).dateStr}
                                        <span className="w-1 h-1 rounded-full bg-indigo-500/30" />
                                        <span className="text-indigo-400">{formatDateTime(s.createdAt).timeStr}</span>
                                    </span>
                                </div>
                                <div className="text-lg text-foreground/80 leading-relaxed italic border-l-4 border-indigo-500/30 pl-6 py-1">
                                    {s.content.split('\n').map((line: string, i: number) => line && (
                                        <p key={i} className={i > 0 ? 'mt-4' : ''}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border border-dashed border-border">
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                        <h3 className="text-lg font-bold text-muted-foreground">No hay historial todavía</h3>
                        <p className="text-sm text-muted-foreground">Los consejos aparecerán aquí a medida que el Vigilante analice tu negocio.</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
