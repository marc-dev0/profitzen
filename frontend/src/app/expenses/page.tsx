'use client';

import { useState, useMemo } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { DataTable, Column } from '@/components/DataTable';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, useMarkExpenseAsPaid, Expense } from '@/hooks/useExpenses';
import { useStores } from '@/hooks/useStores';
import { useAuthStore } from '@/store/authStore';
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    CheckCircle,
    Clock,
    AlertCircle,
    DollarSign,
    Calendar as CalendarIcon,
    Wallet,
    Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { FormattedDateInput } from '@/components/ui/formatted-date-input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { getLocalTodayString, formatDateUTC, toNoonISO } from '@/utils/dateUtils';

const CATEGORIES = [
    { value: 'Servicios', label: 'Servicios (Luz, Agua, Internet)' },
    { value: 'Alquiler', label: 'Alquiler' },
    { value: 'Sueldos', label: 'Sueldos / Salarios' },
    { value: 'Mercadería', label: 'Mercadería / Compras' },
    { value: 'Marketing', label: 'Marketing / Publicidad' },
    { value: 'Mantenimiento', label: 'Mantenimiento' },
    { value: 'Impuestos', label: 'Impuestos' },
    { value: 'Otros', label: 'Otros' }
];

const PAYMENT_METHODS = [
    { value: 'Cash', label: 'Efectivo' },
    { value: 'Card', label: 'Tarjeta' },
    { value: 'Transfer', label: 'Transferencia' },
    { value: 'DigitalWallet', label: 'Billetera Digital (Yape/Plin)' }
];

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ExpensesPage() {
    const { user } = useAuthStore();
    const { data: stores } = useStores();
    const [filterStoreId, setFilterStoreId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Update filterStoreId when user loads
    useMemo(() => {
        if (user?.currentStoreId && !filterStoreId) {
            setFilterStoreId(user.currentStoreId);
        }
    }, [user?.currentStoreId]);

    const { data: expenses, isLoading, refetch } = useExpenses(filterStoreId, undefined, undefined, showDeleted);
    const createExpense = useCreateExpense();
    const updateExpense = useUpdateExpense();
    const deleteExpense = useDeleteExpense();
    const markAsPaid = useMarkExpenseAsPaid();

    // ... existing formData state ...
    const [formData, setFormData] = useState({
        storeId: user?.currentStoreId || '',
        description: '',
        category: 'Otros',
        amount: 0,
        date: getLocalTodayString(),
        paymentMethod: 'Cash',
        isPaid: true,
        dueDate: '',
        reference: '',
        notes: ''
    });

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(value);
    };

    const formatDate = (dateString: string) => formatDateUTC(dateString);

    const totals = useMemo(() => {
        if (!expenses) return { paid: 0, pending: 0, total: 0 };
        return expenses.reduce((acc, exp) => {
            if (exp.deletedAt) return acc;
            if (exp.isPaid) acc.paid += exp.amount;
            else acc.pending += exp.amount;
            acc.total += exp.amount;
            return acc;
        }, { paid: 0, pending: 0, total: 0 });
    }, [expenses]);

    const handleOpenModal = (expense?: Expense) => {
        if (expense) {
            setEditingExpense(expense);
            setFormData({
                storeId: expense.storeId,
                description: expense.description,
                category: expense.category,
                amount: expense.amount,
                date: expense.date.split('T')[0],
                paymentMethod: expense.paymentMethod,
                isPaid: expense.isPaid,
                dueDate: expense.dueDate ? expense.dueDate.split('T')[0] : '',
                reference: expense.reference || '',
                notes: expense.notes || ''
            });
        } else {
            setEditingExpense(null);
            setFormData({
                storeId: user?.currentStoreId || '',
                description: '',
                category: 'Otros',
                amount: 0,
                date: getLocalTodayString(),
                paymentMethod: 'Cash',
                isPaid: true,
                dueDate: '',
                reference: '',
                notes: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.description) return toast.error('La descripción es obligatoria');
        if (formData.amount <= 0) return toast.error('El monto debe ser mayor a 0');

        try {
            if (editingExpense) {
                await updateExpense.mutateAsync({
                    id: editingExpense.id,
                    request: {
                        ...formData,
                        date: toNoonISO(formData.date),
                        dueDate: formData.dueDate ? toNoonISO(formData.dueDate) : undefined
                    }
                });
                toast.success('Gasto actualizado');
            } else {
                await createExpense.mutateAsync({
                    ...formData,
                    date: toNoonISO(formData.date),
                    dueDate: formData.dueDate ? toNoonISO(formData.dueDate) : undefined
                });
                toast.success('Gasto registrado');
            }
            setIsModalOpen(false);
            refetch();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al procesar el gasto');
        }
    };

    const handleDelete = (id: string) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteExpense.mutateAsync(deleteId);
            toast.success('Gasto eliminado');
            setDeleteId(null);
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const handleMarkAsPaid = async (id: string) => {
        try {
            await markAsPaid.mutateAsync(id);
            toast.success('Gasto marcado como pagado');
        } catch (error) {
            toast.error('Error al actualizar estado');
        }
    };

    const columns: Column<Expense>[] = [
        {
            key: 'date',
            header: 'Fecha',
            sortable: true,
            render: (exp) => (
                <div className="flex flex-col">
                    <span className="font-medium">{formatDate(exp.date)}</span>
                    {!exp.isPaid && exp.dueDate && (
                        <span className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Vence: {formatDate(exp.dueDate)}
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'description',
            header: 'Descripción',
            sortable: true,
            render: (exp) => (
                <div className="flex flex-col">
                    <span className="font-bold text-foreground">{exp.description}</span>
                    <span className="text-xs text-muted-foreground">{exp.category}</span>
                </div>
            )
        },
        {
            key: 'paymentMethod',
            header: 'Método',
            render: (exp) => (
                <span className="text-xs px-2 py-1 bg-muted rounded-full font-medium">
                    {PAYMENT_METHODS.find(m => m.value === exp.paymentMethod)?.label || exp.paymentMethod}
                </span>
            )
        },
        {
            key: 'isPaid',
            header: 'Estado',
            sortable: true,
            render: (exp) => (
                exp.deletedAt ? (
                    <span className="flex items-center gap-1.5 text-slate-500 font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                        <Trash2 className="w-3.5 h-3.5" />
                        ELIMINADO
                    </span>
                ) : exp.isPaid ? (
                    <span className="flex items-center gap-1.5 text-green-600 font-bold text-xs bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-800">
                        <CheckCircle className="w-3.5 h-3.5" />
                        PAGADO
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5 text-amber-600 font-bold text-xs bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                        <AlertCircle className="w-3.5 h-3.5" />
                        PENDIENTE
                    </span>
                )
            )
        },
        {
            key: 'amount',
            header: 'Monto',
            sortable: true,
            render: (exp) => (
                <div className="text-right font-black text-lg text-primary">
                    {formatCurrency(exp.amount)}
                </div>
            )
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (exp) => (
                <div className="flex items-center justify-end gap-2">
                    {!exp.deletedAt && (
                        <>
                            {!exp.isPaid && (
                                <button
                                    onClick={() => handleMarkAsPaid(exp.id)}
                                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                    title="Marcar como pagado"
                                >
                                    <CheckCircle className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => handleOpenModal(exp)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Editar"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => handleDelete(exp.id)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                            <Wallet className="w-8 h-8 text-primary" />
                            Gestión de Gastos
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Controla los gastos operativos y egresos de tu negocio.
                        </p>
                    </div>
                    <Button
                        onClick={() => handleOpenModal()}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 h-12 rounded-xl font-bold shadow-lg shadow-primary/25 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Registrar Gasto
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Gastado</p>
                            <p className="text-2xl font-black text-foreground">{formatCurrency(totals.total)}</p>
                        </div>
                    </div>

                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-xl">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Pagado</p>
                            <p className="text-2xl font-black text-green-600">{formatCurrency(totals.paid)}</p>
                        </div>
                    </div>

                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Por Pagar</p>
                            <p className="text-2xl font-black text-amber-600">{formatCurrency(totals.pending)}</p>
                        </div>
                    </div>
                </div>

                {/* Main Table Content */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por descripción..."
                                    className="pl-9 bg-background border-border rounded-xl h-10"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select
                                value={filterStoreId}
                                onChange={(e) => setFilterStoreId(e.target.value)}
                                className="h-10 px-4 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            >
                                <option value="">Todas las tiendas</option>
                                {stores?.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showDeleted}
                                    onChange={(e) => setShowDeleted(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                                />
                                <span className="text-sm font-medium text-muted-foreground">Ver eliminados</span>
                            </label>
                            <Button variant="outline" className="h-10 rounded-xl gap-2 text-sm font-bold border-border">
                                <Filter className="w-4 h-4" />
                                Filtros
                            </Button>
                        </div>
                    </div>

                    <DataTable
                        data={expenses || []}
                        columns={columns}
                        keyExtractor={(exp) => exp.id}
                        loading={isLoading}
                        emptyMessage="No se han registrado gastos aún."
                        searchable={false}
                        searchTerm={searchTerm}
                        searchKeys={['description', 'category', 'reference']}
                    />
                </div>
            </div>

            {/* Modal de Registro/Edición */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                    <form onSubmit={handleSubmit}>
                        <div className="bg-primary p-6 text-primary-foreground">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black flex items-center gap-2">
                                    {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
                                </DialogTitle>
                                <DialogDescription className="text-primary-foreground/70">
                                    {editingExpense
                                        ? 'Modifica los detalles del gasto registrado.'
                                        : 'Ingresa la información necesaria para registrar un nuevo egreso.'
                                    }
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Descripción *</Label>
                                    <Input
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Ej: Pago de luz Enero 2024"
                                        className="h-12 rounded-xl text-lg"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Categoría *</Label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        required
                                    >
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Monto *</Label>
                                    <NumberInput
                                        value={formData.amount}
                                        onChange={(val) => setFormData({ ...formData, amount: val })}
                                        className="h-12 rounded-xl text-xl font-bold text-primary"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Fecha del Gasto *</Label>
                                    <FormattedDateInput
                                        value={formData.date}
                                        onChange={(val) => setFormData({ ...formData, date: val })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Método de Pago</Label>
                                    <select
                                        value={formData.paymentMethod}
                                        onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                        className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                    >
                                        {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2 p-5 bg-primary/5 rounded-2xl border border-primary/10 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2 rounded-lg ${formData.isPaid ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                <Wallet className="w-4 h-4" />
                                            </div>
                                            <Label className="text-base font-black text-foreground">¿Ya fue pagado?</Label>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${formData.isPaid ? 'text-green-500' : 'text-amber-500'}`}>
                                                {formData.isPaid ? 'SÍ, PAGADO' : 'NO, PENDIENTE'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, isPaid: !formData.isPaid })}
                                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none shadow-inner ${formData.isPaid ? 'bg-green-600' : 'bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xl transition-transform duration-300 ${formData.isPaid ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {!formData.isPaid && (
                                        <div className="space-y-2 pt-3 border-t border-primary/10 animate-in fade-in slide-in-from-top-2">
                                            <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                                <CalendarIcon className="w-3 h-3 text-amber-500" />
                                                Fecha de Vencimiento (Cuenta por Pagar)
                                            </Label>
                                            <FormattedDateInput
                                                value={formData.dueDate}
                                                onChange={(val) => setFormData({ ...formData, dueDate: val })}
                                            />
                                            <p className="text-[10px] text-amber-500/70 font-medium italic">
                                                * El gasto se guardará como una deuda pendiente hasta que lo marques como pagado.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Referencia</Label>
                                    <Input
                                        value={formData.reference}
                                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                        placeholder="Nro Factura / Voucher"
                                        className="h-10 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Tienda</Label>
                                    <select
                                        value={formData.storeId}
                                        onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                                        className="w-full h-10 px-3 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                        required
                                    >
                                        {stores?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Notas Adicionales</Label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full min-h-[80px] p-3 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                        placeholder="Alguna observación adicional..."
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="p-6 bg-muted/20 border-t border-border gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 h-12 rounded-xl font-bold border-border"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="flex-[2] h-12 rounded-xl font-black text-lg bg-primary shadow-lg shadow-primary/25"
                                disabled={createExpense.isPending || updateExpense.isPending}
                            >
                                {editingExpense ? 'Guardar Cambios' : 'Confirmar Registro'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el gasto permanentemente. No podrás deshacer esta acción.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
