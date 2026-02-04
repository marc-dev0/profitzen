'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getPendingCredits, addCreditPayment } from '@/hooks/useCustomers';
import { DataTable, Column } from '@/components/DataTable';
import AppLayout from '@/components/layout/AppLayout';
import { Credit } from '@/types/customer';
import { NumberInput } from '@/components/ui/number-input';
import { toast } from 'sonner';
import {
    Banknote,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    Search,
    Filter,
    ArrowRight,
    Wallet,
    TrendingDown,
    User,
    RefreshCw
} from 'lucide-react';

export default function CollectionsPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    const { data: credits, isLoading, isError, refetch } = useQuery({
        queryKey: ['pending-credits'],
        queryFn: getPendingCredits,
        enabled: isAuthenticated
    });

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

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('es-PE');
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
            await addCreditPayment(selectedCredit.id, paymentAmount, paymentNote);
            toast.success('Pago registrado correctamente');
            setIsPayModalOpen(false);
            refetch();
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
                        <p className="text-xs text-muted-foreground">ID: {credit.id.substring(0, 8)}</p>
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
                    {formatDate(credit.creditDate)}
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
                    {formatDate(credit.dueDate)}
                </div>
            )
        },
        {
            key: 'amount',
            header: 'Monto Original',
            sortable: true,
            render: (credit) => (
                <span className="text-sm font-medium">{formatCurrency(credit.amount)}</span>
            )
        },
        {
            key: 'remainingAmount',
            header: 'Saldo Pendiente',
            sortable: true,
            render: (credit) => (
                <span className={`text-sm font-bold ${credit.isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
                    {formatCurrency(credit.remainingAmount)}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Estado',
            render: (credit) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${credit.isOverdue
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

    if (!_hasHydrated || !isAuthenticated) return null;

    return (
        <AppLayout>
            <div className="p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-foreground">Cuentas por Cobrar</h1>
                                <p className="text-muted-foreground mt-1">Control de cobranzas y deudas activas</p>
                            </div>
                            <button
                                onClick={() => refetch()}
                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                title="Actualizar"
                            >
                                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-card rounded-2xl p-5 shadow-sm border border-border relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                    <Wallet className="w-12 h-12 text-primary" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Total por Cobrar</p>
                                <p className="text-3xl font-black text-foreground">{formatCurrency(stats.totalPending)}</p>
                                <div className="mt-2 flex items-center text-xs text-primary font-bold">
                                    <ArrowRight className="w-3 h-3 mr-1" />
                                    {stats.countPending} créditos activos
                                </div>
                            </div>

                            <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-5 shadow-sm border border-red-100 dark:border-red-900/30 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-red-600">
                                    <AlertCircle className="w-12 h-12" />
                                </div>
                                <p className="text-sm font-medium text-red-600/80 mb-1">Monto Vencido</p>
                                <p className="text-3xl font-black text-red-600">{formatCurrency(stats.totalOverdue)}</p>
                                <div className="mt-2 flex items-center text-xs text-red-600 font-bold">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {stats.countOverdue} recibos vencidos
                                </div>
                            </div>

                            <div className="bg-card rounded-2xl p-5 shadow-sm border border-border relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-orange-500">
                                    <Clock className="w-12 h-12" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Pendiente Regular</p>
                                <p className="text-3xl font-black text-foreground">{formatCurrency(stats.totalPending - stats.totalOverdue)}</p>
                                <div className="mt-2 flex items-center text-xs text-orange-500 font-bold">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {stats.countPending - stats.countOverdue} a tiempo
                                </div>
                            </div>

                            <div className="bg-card rounded-2xl p-5 shadow-sm border border-border relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-indigo-500">
                                    <TrendingDown className="w-12 h-12" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">% de Morosidad</p>
                                <p className="text-3xl font-black text-foreground">
                                    {stats.totalPending > 0 ? ((stats.totalOverdue / stats.totalPending) * 100).toFixed(1) : 0}%
                                </p>
                                <div className="mt-2 flex items-center text-xs text-indigo-500 font-bold">
                                    <Search className="w-3 h-3 mr-1" />
                                    Análisis de riesgo
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="mb-6 flex flex-wrap items-center gap-4">
                        <div className="flex bg-card border border-border rounded-xl p-1 shadow-sm">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === 'all' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setStatusFilter('overdue')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === 'overdue' ? 'bg-red-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Vencidos
                            </button>
                            <button
                                onClick={() => setStatusFilter('pending')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === 'pending' ? 'bg-orange-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                Al Día
                            </button>
                        </div>
                    </div>

                    {/* Main Table */}
                    <DataTable
                        data={filteredCredits}
                        columns={columns}
                        keyExtractor={(item) => item.id}
                        loading={isLoading}
                        emptyMessage="No hay cobranzas pendientes"
                        searchable={true}
                        searchPlaceholder="Buscar por cliente..."
                        searchKeys={['customerName']}
                        renderDetail={(credit) => (
                            <div className="bg-muted/50 rounded-xl p-4 border border-border">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                                        <Banknote className="w-4 h-4 text-primary" />
                                        Historial de Pagos / Abonos
                                    </h3>
                                    <span className="text-xs text-muted-foreground">
                                        {credit.payments.length} abonos realizados
                                    </span>
                                </div>

                                {credit.payments.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground text-sm italic">
                                        No se han registrado pagos para este crédito aún.
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-lg border border-border bg-card">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                                                <tr>
                                                    <th className="px-4 py-2">Fecha</th>
                                                    <th className="px-4 py-2">Monto</th>
                                                    <th className="px-4 py-2">Notas / Referencia</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {credit.payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).map((p) => (
                                                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="px-4 py-2 whitespace-nowrap text-muted-foreground font-medium">
                                                            {formatDate(p.paymentDate)}
                                                        </td>
                                                        <td className="px-4 py-2 font-bold text-primary">
                                                            {formatCurrency(p.amount)}
                                                        </td>
                                                        <td className="px-4 py-2 text-muted-foreground">
                                                            {p.notes || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10 flex justify-between items-center">
                                    <span className="text-xs font-bold text-primary uppercase">Total Amortizado:</span>
                                    <span className="text-sm font-black text-primary">
                                        {formatCurrency(credit.amount - credit.remainingAmount)}
                                    </span>
                                </div>
                            </div>
                        )}
                    />
                </div>
            </div>

            {/* Payment Modal */}
            {isPayModalOpen && selectedCredit && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onKeyDown={handleKeyDown}
                >
                    <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-primary p-6 text-primary-foreground">
                            <h2 className="text-xl font-black flex items-center gap-2">
                                <Banknote className="w-6 h-6" />
                                Registrar Cobranza
                            </h2>
                            <p className="opacity-80 text-sm mt-1">Cliente: {selectedCredit.customerName}</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-muted/50 rounded-xl border border-border">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-wider">Total Deuda</p>
                                    <p className="text-lg font-black text-foreground">{formatCurrency(selectedCredit.amount)}</p>
                                </div>
                                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                                    <p className="text-[10px] uppercase font-bold text-primary mb-1 tracking-wider">Saldo Restante</p>
                                    <p className="text-lg font-black text-primary">{formatCurrency(selectedCredit.remainingAmount)}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                        Monto a Cobrar (S/)
                                    </label>
                                    <NumberInput
                                        value={paymentAmount}
                                        onChange={(val) => setPaymentAmount(val)}
                                        decimals={2}
                                        max={selectedCredit.remainingAmount}
                                        min={0.01}
                                        className="w-full h-16 bg-background border-2 border-primary/20 rounded-xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-2xl font-black text-center transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                        Notas / Referencia
                                    </label>
                                    <textarea
                                        value={paymentNote}
                                        onChange={(e) => setPaymentNote(e.target.value)}
                                        placeholder="Ejem: Pago parcial en efectivo..."
                                        rows={2}
                                        className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30 flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-orange-700">Nuevo Saldo</p>
                                    <p className="text-lg font-black text-orange-800">
                                        {formatCurrency(Math.max(0, selectedCredit.remainingAmount - paymentAmount))}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setIsPayModalOpen(false)}
                                    className="flex-1 py-4 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleProcessPayment}
                                    disabled={isPaying || paymentAmount <= 0}
                                    className="flex-[2] py-4 bg-primary text-primary-foreground rounded-xl text-lg font-black shadow-lg shadow-primary/30 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex flex-col items-center justify-center leading-tight"
                                >
                                    <span>{isPaying ? 'Procesando...' : 'Confirmar Cobro'}</span>
                                    {!isPaying && (
                                        <span className="text-[10px] opacity-70 font-medium mt-1">Ctrl + Enter</span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
