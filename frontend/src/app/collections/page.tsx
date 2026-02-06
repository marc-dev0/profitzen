'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getPendingCredits, addCreditPayment, useCreditPayments } from '@/hooks/useCustomers';
import { DataTable, Column } from '@/components/DataTable';
import AppLayout from '@/components/layout/AppLayout';
import { Credit, CreditPaymentDetail } from '@/types/customer';
import { NumberInput } from '@/components/ui/number-input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import {
    Banknote,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    Search,
    ArrowRight,
    Wallet,
    User,
    RefreshCw,
    History,
    Store,
    Info
} from 'lucide-react';

export default function CollectionsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

    // Pending Credits Query
    const { data: credits, isLoading, refetch } = useQuery({
        queryKey: ['pending-credits'],
        queryFn: getPendingCredits,
        enabled: isAuthenticated && activeTab === 'pending'
    });

    // Abonos History Hook
    const { payments, isLoading: isPaymentsLoading, refresh: refreshPayments } = useCreditPayments(
        undefined, // Store (all)
        undefined, // Date Start
        undefined  // Date End
    );

    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentNote, setPaymentNote] = useState('');
    const [isPaying, setIsPaying] = useState(false);
    const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'pending'>('all');

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

    const formatDateString = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-PE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleOpenPayModal = (credit: Credit) => {
        setSelectedCredit(credit);
        setPaymentAmount(credit.remainingAmount);
        setPaymentNote('');
        setIsPayModalOpen(true);
    };

    const handleProcessPayment = async () => {
        if (!selectedCredit || paymentAmount <= 0 || paymentAmount > selectedCredit.remainingAmount) {
            toast.error('Monto de pago inválido');
            return;
        }

        setIsPaying(true);
        try {
            await addCreditPayment(selectedCredit.id, paymentAmount, user?.currentStoreId || '', paymentNote);
            toast.success('Pago registrado correctamente');
            setIsPayModalOpen(false);
            refetch();
            refreshPayments();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al procesar el pago');
        } finally {
            setIsPaying(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            if (!isPaying && paymentAmount > 0 && selectedCredit) {
                handleProcessPayment();
            }
        }
    };

    const filteredCredits = credits?.filter(c => {
        if (statusFilter === 'overdue') return c.isOverdue;
        if (statusFilter === 'pending') return !c.isOverdue;
        return true;
    }) || [];

    const stats = {
        totalPending: credits?.reduce((sum, c) => sum + c.remainingAmount, 0) || 0,
        totalOverdue: credits?.filter(c => c.isOverdue).reduce((sum, c) => sum + c.remainingAmount, 0) || 0,
        countPending: credits?.length || 0,
        countOverdue: credits?.filter(c => c.isOverdue).length || 0
    };

    const columns: Column<Credit>[] = [
        {
            key: 'customerName',
            header: 'Cliente',
            sortable: true,
            render: (credit) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{credit.customerName}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">ID: {credit.id.substring(0, 8)}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'creditDate',
            header: 'Fecha Emisión',
            sortable: true,
            render: (credit) => (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(credit.creditDate).toLocaleDateString('es-PE')}
                </div>
            )
        },
        {
            key: 'dueDate',
            header: 'Vencimiento',
            sortable: true,
            render: (credit) => (
                <div className={`flex items-center gap-1.5 text-sm font-medium ${credit.isOverdue ? 'text-red-600' : 'text-foreground'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(credit.dueDate || '').toLocaleDateString('es-PE')}
                </div>
            )
        },
        {
            key: 'amount',
            header: 'Monto Original',
            sortable: true,
            render: (credit) => (
                <span className="text-sm font-medium font-mono tracking-tighter">{formatCurrency(credit.amount)}</span>
            )
        },
        {
            key: 'remainingAmount',
            header: 'Saldo Pendiente',
            sortable: true,
            render: (credit) => (
                <span className={`text-sm font-black font-mono tracking-tighter ${credit.isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                    {formatCurrency(credit.remainingAmount)}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Estado',
            render: (credit) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${credit.isOverdue
                    ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                    : 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                    }`}>
                    {credit.isOverdue ? 'Vencido' : 'Pendiente'}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (credit) => (
                <button
                    onClick={() => handleOpenPayModal(credit)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-all text-xs font-bold"
                >
                    <Banknote className="w-3.5 h-3.5" />
                    Cobrar
                </button>
            )
        }
    ];

    const historyColumns: Column<CreditPaymentDetail>[] = [
        {
            key: 'customerName',
            header: 'Cliente',
            sortable: true,
            render: (p) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="font-bold text-sm text-foreground leading-tight">{p.customerName}</p>
                        <p className="text-[10px] text-muted-foreground/80 dark:text-slate-400 uppercase font-black tracking-tighter">REF CRÉDITO: {p.creditId.substring(0, 8)}</p>
                    </div>
                </div>
            )
        },
        {
            key: 'paymentDate',
            header: 'Fecha y Hora',
            sortable: true,
            render: (p) => (
                <div className="flex flex-col text-xs font-medium">
                    <div className="flex items-center gap-1 text-foreground">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        {new Date(p.paymentDate).toLocaleDateString('es-PE')}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(p.paymentDate).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            )
        },
        {
            key: 'amount',
            header: 'Monto Abono',
            sortable: true,
            render: (p) => (
                <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-emerald-600 font-mono tracking-tighter">
                        +{formatCurrency(p.amount)}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded mt-0.5">Cobranza</span>
                </div>
            )
        },
        {
            key: 'notes',
            header: 'Notas / Referencia',
            render: (p) => (
                <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={p.notes || ''}>
                    {p.notes || '-'}
                </p>
            )
        },
        {
            key: 'storeId',
            header: 'Sede / Caja',
            render: (p) => (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
                    <Store className="w-3 h-3" />
                    {p.storeId ? 'Almacen 1' : 'Oficina'}
                </div>
            )
        }
    ];

    if (!_hasHydrated || !isAuthenticated) return null;

    return (
        <AppLayout>
            <div className="p-6">
                <div className="max-w-[1500px] mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20">
                                    <Banknote className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black text-foreground tracking-tight">Cuentas por Cobrar</h1>
                                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                                        <Wallet className="w-4 h-4" />
                                        Control de cobranzas, abonos y deudas activas.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {activeTab === 'pending' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                                    <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                        <Wallet className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-emerald-600/70 tracking-tighter">Total por Cobrar</p>
                                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono tracking-tighter">{formatCurrency(stats.totalPending)}</p>
                                    </div>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-2xl flex items-center gap-4 shadow-sm">
                                    <div className="p-2 bg-rose-500/10 text-rose-600 rounded-xl">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-black text-rose-600/70 tracking-tighter">Monto Vencido</p>
                                        <p className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono tracking-tighter">{formatCurrency(stats.totalOverdue)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-card border rounded-2xl p-2 shadow-sm">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'pending'
                                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <Banknote className="w-4 h-4" />
                                Pendientes
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'history'
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <History className="w-4 h-4" />
                                Historial de Abonos
                            </button>
                        </div>

                        <div className="flex items-center gap-3 pr-2">
                            {activeTab === 'pending' && (
                                <div className="flex bg-muted/50 rounded-lg p-1">
                                    {['all', 'overdue', 'pending'].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setStatusFilter(f as any)}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === f
                                                ? 'bg-card text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'}`}
                                        >
                                            {f === 'all' ? 'Ver Todos' : f === 'overdue' ? 'Vencidos' : 'Al Día'}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button
                                onClick={() => { refetch(); refreshPayments(); }}
                                className="p-3 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                                title="Actualizar"
                            >
                                <RefreshCw className={`w-5 h-5 ${(isLoading || isPaymentsLoading) ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="bg-card border rounded-[2rem] shadow-xl overflow-hidden min-h-[500px]">
                        {activeTab === 'pending' ? (
                            <DataTable
                                data={filteredCredits}
                                columns={columns}
                                keyExtractor={(item) => item.id}
                                loading={isLoading}
                                emptyMessage="No hay cobranzas pendientes"
                                searchable={true}
                                searchPlaceholder="Buscar por cliente o referencia..."
                                searchKeys={['customerName', 'id']}
                                renderDetail={(credit) => (
                                    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-8 border-y border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex flex-col md:flex-row justify-between gap-8 mb-6">
                                            <div>
                                                <h3 className="text-xl font-black text-foreground flex items-center gap-2 mb-2">
                                                    <Info className="w-5 h-5 text-primary" />
                                                    Detalle del Crédito
                                                </h3>
                                                <p className="text-sm text-muted-foreground">ID del documento: <span className="font-mono">{credit.id}</span></p>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase font-black text-muted-foreground">Total Amortizado</p>
                                                    <p className="text-2xl font-black text-emerald-600 font-mono tracking-tighter">{formatCurrency(credit.amount - credit.remainingAmount)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase font-black text-muted-foreground">Días Transcurridos</p>
                                                    <p className="text-2xl font-black text-foreground">{Math.floor((new Date().getTime() - new Date(credit.creditDate).getTime()) / (1000 * 3600 * 24))} días</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-muted text-[10px] uppercase font-black text-muted-foreground tracking-[0.1em]">
                                                    <tr>
                                                        <th className="px-6 py-4">Fecha de Pago</th>
                                                        <th className="px-6 py-4">Monto Amortizado</th>
                                                        <th className="px-6 py-4 text-center">Estado</th>
                                                        <th className="px-6 py-4">Notas / Observación</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {credit.payments.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic font-medium">
                                                                No se han registrado abonos para este crédito todavía.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        credit.payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map((p) => (
                                                            <tr key={p.id} className="hover:bg-muted/30 transition-all group">
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-foreground">{formatDateString(p.paymentDate).split(',')[0]}</span>
                                                                        <span className="text-[10px] text-muted-foreground">{formatDateString(p.paymentDate).split(',')[1]}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 font-black text-emerald-600 text-lg font-mono tracking-tighter">
                                                                    +{formatCurrency(p.amount)}
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase px-2 py-1 rounded-md border border-emerald-100">Registrado</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-muted-foreground group-hover:text-foreground transition-all">
                                                                    {p.notes || <span className="opacity-30 italic">Sin observación</span>}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            />
                        ) : (
                            <DataTable
                                data={payments}
                                columns={historyColumns}
                                keyExtractor={(item) => item.id}
                                loading={isPaymentsLoading}
                                emptyMessage="No se han registrado abonos en el periodo"
                                searchable={true}
                                searchPlaceholder="Buscar abono por cliente..."
                                searchKeys={['customerName', 'notes']}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {isPayModalOpen && selectedCredit && (
                <div
                    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300"
                    onKeyDown={handleKeyDown}
                >
                    <div className="bg-card rounded-[2.5rem] shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-primary p-8 text-primary-foreground relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-2 block">Modulo de Cobranzas</span>
                                <h2 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                                    <Banknote className="w-10 h-10" />
                                    Registrar Abono
                                </h2>
                                <div className="mt-4 flex items-center gap-3 bg-white/10 p-3 rounded-2xl w-fit">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">Cliente</p>
                                        <p className="font-bold text-lg leading-none">{selectedCredit.customerName}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                                    <p className="text-[10px] uppercase font-black text-muted-foreground mb-1 tracking-[0.1em]">Saldo Pendiente</p>
                                    <p className="text-2xl font-black text-foreground font-mono tracking-tighter">{formatCurrency(selectedCredit.remainingAmount)}</p>
                                </div>
                                <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 flex flex-col justify-center">
                                    <p className="text-[10px] uppercase font-black opacity-80 mb-1 tracking-[0.1em]">Saldo Final</p>
                                    <p className="text-2xl font-black font-mono tracking-tighter">
                                        {formatCurrency(Math.max(0, selectedCredit.remainingAmount - paymentAmount))}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">
                                        Monto del Abono (S/)
                                    </label>
                                    <CurrencyInput
                                        value={paymentAmount}
                                        onChange={(val) => setPaymentAmount(val)}
                                        max={selectedCredit.remainingAmount}
                                        min={0.01}
                                        className="w-full h-20 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 focus:border-primary dark:focus:bg-slate-900 rounded-[1.5rem] outline-none text-4xl font-black text-center pr-6 pl-14 text-slate-900 dark:text-white transition-all transition-colors duration-300"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">
                                        Notas o Referencia de Pago
                                    </label>
                                    <textarea
                                        value={paymentNote}
                                        onChange={(e) => setPaymentNote(e.target.value)}
                                        placeholder="Ejem: Pago parcial en efectivo, transferencia BCP..."
                                        rows={2}
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none resize-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsPayModalOpen(false)}
                                    className="px-8 py-5 text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleProcessPayment}
                                    disabled={isPaying || paymentAmount <= 0}
                                    className="flex-1 py-5 bg-primary text-primary-foreground rounded-3xl text-xl font-black shadow-xl shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-3"
                                >
                                    {isPaying ? 'Procesando...' : 'Confirmar Abono'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
