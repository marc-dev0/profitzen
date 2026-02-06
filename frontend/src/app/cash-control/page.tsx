'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useCashShiftHistory } from '@/hooks/useCashShift';
import { useCreditPayments } from '@/hooks/useCustomers';
import { DataTable, Column } from '@/components/DataTable';
import AppLayout from '@/components/layout/AppLayout';
import { CashShift, CashMovement } from '@/types/cashShift';
import { generateCashShiftTicket } from '@/utils/pdfGenerator';
import {
    Clock,
    Calendar,
    ArrowUpRight,
    ArrowDownLeft,
    History,
    FileText,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    MessageSquare,
    User,
    Info,
    Banknote
} from 'lucide-react';
import { toast } from 'sonner';

export default function CashControlHistoryPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 7)), // Last 7 days
        to: new Date()
    });

    const { data: history, isLoading, refetch } = useCashShiftHistory(
        user?.currentStoreId || '',
        dateRange.from,
        dateRange.to
    );

    useEffect(() => {
        if (_hasHydrated && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, _hasHydrated, router]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount);
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const columns: Column<CashShift>[] = [
        {
            key: 'userName',
            header: 'Cajero',
            sortable: true,
            render: (shift) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-bold text-sm">{shift.userName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black">Turno ID: {shift.id.substring(0, 8)}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'startTime',
            header: 'Apertura / Cierre',
            sortable: true,
            render: (shift) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Abre: {formatDate(shift.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Cierra: {shift.endTime ? formatDate(shift.endTime) : 'En curso...'}</span>
                    </div>
                </div>
            )
        },
        {
            key: 'startAmount',
            header: 'Monto Inicial',
            render: (shift) => (
                <div className="font-black text-xs text-foreground/80 dark:text-slate-200">
                    S/ {shift.startAmount.toFixed(2)}
                </div>
            )
        },
        {
            key: 'expectedCashEndAmount',
            header: 'Saldo Final',
            render: (shift) => (
                <div className="space-y-1 text-right">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Esperado</p>
                    <p className="font-mono font-black text-sm">{formatCurrency(shift.expectedCashEndAmount)}</p>
                </div>
            )
        },
        {
            key: 'actualCashEndAmount',
            header: 'Real Contado',
            render: (shift) => (
                shift.status === 'Open' ? (
                    <span className="text-xs font-bold text-blue-500 italic">Abierto</span>
                ) : (
                    <div className="space-y-1 text-right">
                        <p className="text-xs text-muted-foreground uppercase font-bold">Contado</p>
                        <p className="font-mono font-black text-sm text-primary">{formatCurrency(shift.actualCashEndAmount)}</p>
                    </div>
                )
            )
        },
        {
            key: 'difference',
            header: 'Diferencia',
            render: (shift) => {
                const diff = shift.difference;
                const hasIssue = Math.abs(diff) > 0.01;

                return (
                    <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1.5 font-black font-mono text-sm ${!hasIssue ? 'text-muted-foreground/40' : diff > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                            {hasIssue && <AlertCircle className="w-3 h-3 opacity-50" />}
                            {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                        </div>
                        {hasIssue && (
                            <span className={`text-[8px] font-bold uppercase tracking-tighter opacity-60 ${diff > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {diff > 0 ? 'Sobrante' : 'Faltante'}
                            </span>
                        )}
                    </div>
                )
            }
        },
        {
            key: 'status',
            header: 'Estado',
            render: (shift) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${shift.status === 'Open'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                            }`}>
                            {shift.status === 'Open' ? 'Abierto' : 'Cerrado'}
                        </span>
                        {shift.notes && (
                            <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400" title={shift.notes}>
                                <MessageSquare className="w-3 h-3 fill-current opacity-50" />
                                <span className="text-[9px] font-bold uppercase tracking-tighter">Con Nota</span>
                            </div>
                        )}
                    </div>
                    {shift.notes && (
                        <p className="text-[10px] text-muted-foreground italic line-clamp-1 max-w-[120px]" title={shift.notes}>
                            "{shift.notes}"
                        </p>
                    )}
                </div>
            )
        },
        {
            key: 'id',
            header: 'Ticket',
            render: (shift) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        generateCashShiftTicket({
                            ...shift,
                            endTime: shift.endTime || new Date().toISOString(),
                            storeName: user?.stores?.find(s => s.id === shift.storeId)?.name || 'Almacen Principal'
                        });
                    }}
                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                    title="Imprimir Ticket de Cierre"
                >
                    <FileText className="w-4 h-4" />
                </button>
            )
        }
    ];

    if (!_hasHydrated || !isAuthenticated) return null;

    return (
        <AppLayout>
            <div className="max-w-[1600px] mx-auto space-y-8 p-2 md:p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                                <History className="w-8 h-8" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight text-foreground">Control de Caja</h1>
                                <p className="text-muted-foreground font-medium flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    Historial de turnos, aperturas y movimientos de efectivo.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-card p-2 border rounded-2xl shadow-sm">
                        <div className="flex items-center px-3 border-r">
                            <Calendar className="w-4 h-4 text-muted-foreground mr-2" />
                            <span className="text-xs font-bold text-muted-foreground uppercase">{history?.length || 0} Turnos encontrados</span>
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="p-2 hover:bg-muted rounded-xl transition-colors text-primary"
                            title="Actualizar datos"
                        >
                            <History className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sub-header / Stats */}
                {/* Sub-header / Stats - Minimalist Design */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-card border border-border/50 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Ventas Efectivo</span>
                            <div className="p-2 bg-emerald-500/5 text-emerald-600 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <TrendingUp className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">
                            {formatCurrency(history?.reduce((acc, s) => acc + s.totalSalesCash, 0) || 0)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Flujo de Ingresos</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border/50 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Entradas Manual</span>
                            <div className="p-2 bg-blue-500/5 text-blue-600 rounded-lg group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <ArrowUpRight className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">
                            {formatCurrency(history?.reduce((acc, s) => acc + s.totalCashIn, 0) || 0)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-1 h-1 rounded-full bg-blue-500"></div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Sencillo / Otros</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border/50 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Salidas Manual</span>
                            <div className="p-2 bg-rose-500/5 text-rose-600 rounded-lg group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                <ArrowDownLeft className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">
                            {formatCurrency(history?.reduce((acc, s) => acc + s.totalCashOut, 0) || 0)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-1 h-1 rounded-full bg-rose-500"></div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Retiros de Caja</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border/50 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Gastos Caja</span>
                            <div className="p-2 bg-orange-500/5 text-orange-600 rounded-lg group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                <TrendingDown className="w-4 h-4" />
                            </div>
                        </div>
                        <p className="text-3xl font-black text-foreground tracking-tighter">
                            {formatCurrency(history?.reduce((acc, s) => acc + s.totalExpenses, 0) || 0)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-1 h-1 rounded-full bg-orange-500"></div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Pagos en Efectivo</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                    {/* History Table */}
                    <div className="bg-card border rounded-[2.5rem] shadow-xl overflow-hidden">
                        <DataTable
                            data={history || []}
                            columns={columns}
                            keyExtractor={(item) => item.id}
                            loading={isLoading}
                            searchable={true}
                            searchPlaceholder="Buscar por cajero..."
                            searchKeys={['userName']}
                            renderDetail={(shift) => (
                                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border-y border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {/* Shift Totals Detail */}
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                <Info className="w-4 h-4" />
                                                Resumen de Auditoría
                                            </h3>

                                            <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                                                <table className="w-full text-sm">
                                                    <tbody className="divide-y divide-border/10">
                                                        <tr className="flex justify-between p-3.5 bg-slate-500/5">
                                                            <td className="text-slate-500 dark:text-slate-400 font-bold text-sm">Monto Apertura</td>
                                                            <td className="font-mono font-bold text-slate-700 dark:text-slate-200">{formatCurrency(shift.startAmount)}</td>
                                                        </tr>
                                                        <tr className="flex justify-between p-3.5">
                                                            <td className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Ventas en Efectivo (+)</td>
                                                            <td className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(shift.totalSalesCash)}</td>
                                                        </tr>
                                                        <tr className="flex justify-between p-3.5">
                                                            <td className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">Cobranzas Crédito (+)</td>
                                                            <td className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(shift.totalCreditCollections)}</td>
                                                        </tr>
                                                        <tr className="flex justify-between p-3.5">
                                                            <td className="text-blue-600 dark:text-blue-400 font-bold text-sm">Ingresos Manuales (+)</td>
                                                            <td className="font-mono font-bold text-blue-600 dark:text-blue-400">{formatCurrency(shift.totalCashIn)}</td>
                                                        </tr>
                                                        <tr className="flex justify-between p-3.5">
                                                            <td className="text-rose-600 dark:text-rose-400 font-bold text-sm">Salidas Manuales (-)</td>
                                                            <td className="font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(shift.totalCashOut)}</td>
                                                        </tr>
                                                        <tr className="flex justify-between p-3.5">
                                                            <td className="text-orange-600 dark:text-orange-400 font-bold text-sm">Gastos en Efectivo (-)</td>
                                                            <td className="font-mono font-bold text-orange-600 dark:text-orange-400">{formatCurrency(shift.totalExpenses)}</td>
                                                        </tr>
                                                        <tr className="flex justify-between p-4 bg-primary/10 border-t-2 border-primary/20">
                                                            <td className="text-primary font-black uppercase text-base">Saldo Esperado:</td>
                                                            <td className="font-mono text-xl font-black text-primary">{formatCurrency(shift.expectedCashEndAmount)}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {shift.notes && (
                                                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-100 dark:border-yellow-900/30 rounded-2xl">
                                                    <p className="text-[10px] font-black uppercase text-yellow-600 mb-1">Notas de Cierre:</p>
                                                    <p className="text-sm italic text-yellow-800 dark:text-yellow-400">"{shift.notes}"</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Movements Detail */}
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                                <ArrowUpRight className="w-4 h-4" />
                                                Movimientos Manuales ({shift.movements.length})
                                            </h3>

                                            {shift.movements.length === 0 ? (
                                                <div className="h-48 flex flex-col items-center justify-center text-muted-foreground bg-muted/40 rounded-3xl border-2 border-dashed border-slate-200">
                                                    <Info className="w-12 h-12 opacity-10 mb-2" />
                                                    <p className="text-sm font-bold opacity-50 italic">No hay movimientos registrados</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                                                    {shift.movements.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(m => (
                                                        <div key={m.id} className="group p-4 bg-card border rounded-2xl flex items-center justify-between hover:border-primary/30 transition-all shadow-sm">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`p-2 rounded-xl border ${m.type === 'IN' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                                    {m.type === 'IN' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm leading-tight">{m.description}</p>
                                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{formatDate(m.timestamp)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`font-mono font-black text-sm ${m.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                    {m.type === 'IN' ? '+' : '-'}{formatCurrency(m.amount)}
                                                                </p>
                                                                <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">Efectivo</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Credit Payments Detail */}
                                        <div className="space-y-6">
                                            <h3 className="text-sm font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                                <Banknote className="w-4 h-4" />
                                                Detalle de Cobranzas
                                            </h3>
                                            <ShiftCreditPayments
                                                storeId={shift.storeId}
                                                from={new Date(shift.startTime)}
                                                to={shift.endTime ? new Date(shift.endTime) : new Date()}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function ShiftCreditPayments({ storeId, from, to }: { storeId: string; from: Date; to: Date }) {
    const { payments, isLoading } = useCreditPayments(storeId, from, to);

    if (isLoading) {
        return (
            <div className="space-y-3">
                {[1, 2].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
                ))}
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground bg-muted/40 rounded-3xl border-2 border-dashed border-slate-200">
                <Info className="w-12 h-12 opacity-10 mb-2" />
                <p className="text-sm font-bold opacity-50 italic">No hay cobranzas registradas</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
            {payments.map(p => (
                <div key={p.id} className="group p-4 bg-card border rounded-2xl flex items-center justify-between hover:border-indigo-300 transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl border bg-indigo-50 text-indigo-600 border-indigo-100">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm leading-tight">{p.customerName}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                {new Date(p.paymentDate).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-mono font-black text-sm text-emerald-600">
                            +{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(p.amount)}
                        </p>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-100 px-2 py-0.5 rounded-full text-emerald-700">Cobranza</span>
                    </div>
                </div>
            ))}
        </div>
    );
}
