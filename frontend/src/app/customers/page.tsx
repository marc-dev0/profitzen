'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useCustomers, createCustomer, updateCustomer, deleteCustomer, updateCreditLimit, getCustomerCredits, addCreditPayment } from '@/hooks/useCustomers';
import { DataTable, Column } from '@/components/DataTable';
import AppLayout from '@/components/layout/AppLayout';
import { Customer, CreateCustomerRequest, DocumentType, Credit } from '@/types/customer';
import { NumberInput } from '@/components/ui/number-input';
import { toast } from 'sonner';
import { Edit, Trash2, UserPlus, CreditCard, Users, AlertCircle, Banknote, X, RefreshCw } from 'lucide-react';

export default function CustomersPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const { customers, isLoading, isError, refresh } = useCustomers();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const [selectedCustomerForCredits, setSelectedCustomerForCredits] = useState<Customer | null>(null);
    const [customerCredits, setCustomerCredits] = useState<Credit[]>([]);
    const [loadingCredits, setLoadingCredits] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentNote, setPaymentNote] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    const [formData, setFormData] = useState<CreateCustomerRequest>({
        documentType: DocumentType.DNI,
        documentNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        creditLimit: 0
    });

    useEffect(() => {
        if (_hasHydrated && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, _hasHydrated, router]);

    if (!_hasHydrated || !isAuthenticated) {
        return null;
    }

    const handleOpenModal = (customer?: Customer) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                documentType: customer.documentType,
                documentNumber: customer.documentNumber,
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                creditLimit: customer.creditLimit
            });
        } else {
            setEditingCustomer(null);
            setFormData({
                documentType: DocumentType.DNI,
                documentNumber: '',
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                address: '',
                creditLimit: 0
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            setIsSubmitting(true);
            if (editingCustomer) {
                await updateCustomer(editingCustomer.id, {
                    documentType: formData.documentType,
                    documentNumber: formData.documentNumber,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address
                });

                if (formData.creditLimit !== editingCustomer.creditLimit) {
                    await updateCreditLimit(editingCustomer.id, formData.creditLimit);
                }

                toast.success('Cliente actualizado correctamente');
            } else {
                await createCustomer(formData);
                toast.success('Cliente creado correctamente');
            }
            setIsModalOpen(false);
            refresh();
        } catch (error: any) {
            console.error('Error saving customer:', error);
            toast.error(error.response?.data?.message || 'Error al guardar el cliente');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

        try {
            await deleteCustomer(id);
            toast.success('Cliente eliminado correctamente');
            refresh();
        } catch (error: any) {
            console.error('Error deleting customer:', error);
            toast.error(error.response?.data?.message || 'Error al eliminar el cliente');
        }
    };

    const handleViewCredits = async (customer: Customer) => {
        setSelectedCustomerForCredits(customer);
        setIsCreditsModalOpen(true);
        loadCredits(customer.id);
    };

    const loadCredits = async (customerId: string) => {
        try {
            setLoadingCredits(true);
            const credits = await getCustomerCredits(customerId);
            setCustomerCredits(credits);
        } catch (error) {
            console.error('Error loading credits:', error);
            toast.error('Error al cargar los créditos');
        } finally {
            setLoadingCredits(false);
        }
    };

    const handleOpenPayModal = (credit: Credit) => {
        setSelectedCredit(credit);
        setPaymentAmount(credit.remainingAmount);
        setPaymentNote('');
        setIsPayModalOpen(true);
    };

    const handleProcessPayment = async () => {
        if (!selectedCredit || paymentAmount <= 0) return;

        if (paymentAmount > selectedCredit.remainingAmount) {
            toast.error('El monto no puede ser mayor a la deuda restante');
            return;
        }

        try {
            setIsPaying(true);
            await addCreditPayment(selectedCredit.id, paymentAmount, paymentNote);
            toast.success('Pago registrado correctamente');
            setIsPayModalOpen(false);

            if (selectedCustomerForCredits) {
                loadCredits(selectedCustomerForCredits.id);
                refresh();
            }
        } catch (error: any) {
            console.error('Error processing payment:', error);
            const errorMsg = error.response?.data?.details || error.response?.data?.message || 'Error al registrar el pago';
            toast.error(errorMsg);
        } finally {
            setIsPaying(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `S/ ${amount.toFixed(2)}`;
    };

    const getDocumentTypeLabel = (type: DocumentType) => {
        switch (type) {
            case DocumentType.DNI: return 'DNI';
            case DocumentType.RUC: return 'RUC';
            case DocumentType.ForeignId: return 'CE';
            default: return 'N/A';
        }
    };

    const getTotalDebt = () => {
        return customers?.reduce((sum, c) => sum + c.currentDebt, 0) || 0;
    };

    const getCustomersWithDebt = () => {
        return customers?.filter(c => c.currentDebt > 0).length || 0;
    };

    const customerColumns: Column<Customer>[] = [
        {
            key: 'documentNumber',
            header: 'Documento',
            sortable: true,
            render: (customer) => (
                <div>
                    <span className="text-xs text-muted-foreground">{getDocumentTypeLabel(customer.documentType)}</span>
                    <p className="font-mono text-sm font-medium text-foreground">{customer.documentNumber}</p>
                </div>
            )
        },
        {
            key: 'fullName',
            header: 'Nombre Completo',
            sortable: true,
            render: (customer) => (
                <span className="text-sm font-medium text-foreground">{customer.fullName}</span>
            )
        },
        {
            key: 'phone',
            header: 'Teléfono',
            sortable: true,
            render: (customer) => (
                <span className="text-sm text-muted-foreground">{customer.phone || '-'}</span>
            )
        },
        {
            key: 'email',
            header: 'Email',
            sortable: true,
            render: (customer) => (
                <span className="text-sm text-muted-foreground">{customer.email || '-'}</span>
            )
        },
        {
            key: 'creditLimit',
            header: 'Línea Crédito',
            sortable: true,
            render: (customer) => (
                <span className="text-sm font-medium text-foreground">{formatCurrency(customer.creditLimit)}</span>
            )
        },
        {
            key: 'currentDebt',
            header: 'Deuda',
            sortable: true,
            render: (customer) => (
                <span className={`text-sm font-bold ${customer.currentDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(customer.currentDebt)}
                </span>
            )
        },
        {
            key: 'availableCredit',
            header: 'Disponible',
            sortable: true,
            render: (customer) => (
                <span className="text-sm font-medium text-blue-600">{formatCurrency(customer.availableCredit)}</span>
            )
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (customer) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewCredits(customer);
                        }}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Ver Deudas / Créditos"
                    >
                        <Banknote className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(customer);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(customer.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold text-foreground">Gestión de Clientes</h1>
                                <p className="text-muted-foreground mt-1">Administra tu cartera de clientes</p>
                            </div>
                            <button
                                onClick={() => handleOpenModal()}
                                className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/30 flex items-center gap-2"
                            >
                                <UserPlus className="w-5 h-5" />
                                Nuevo Cliente
                            </button>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Clientes</p>
                                        <p className="text-2xl font-bold text-foreground">{customers?.length || 0}</p>
                                    </div>
                                    <Users className="w-8 h-8 text-primary" />
                                </div>
                            </div>
                            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Con Deuda</p>
                                        <p className="text-2xl font-bold text-red-600">{getCustomersWithDebt()}</p>
                                    </div>
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </div>
                            </div>
                            <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Deuda Total</p>
                                        <p className="text-2xl font-bold text-red-600">{formatCurrency(getTotalDebt())}</p>
                                    </div>
                                    <CreditCard className="w-8 h-8 text-red-600" />
                                </div>
                            </div>
                            <div className="bg-primary/90 rounded-xl p-4 shadow-lg text-primary-foreground">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-primary-foreground/80">Crédito Total</p>
                                        <p className="text-2xl font-bold text-primary-foreground">
                                            {formatCurrency(customers?.reduce((sum, c) => sum + c.creditLimit, 0) || 0)}
                                        </p>
                                    </div>
                                    <CreditCard className="w-8 h-8 text-primary-foreground/80" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customers Table with DataTable Component */}
                    <DataTable
                        data={customers || []}
                        columns={customerColumns}
                        keyExtractor={(customer) => customer.id}
                        loading={isLoading}
                        emptyMessage="No hay clientes registrados"
                        searchable={true}
                        searchPlaceholder="Buscar por nombre, documento o email..."
                        searchKeys={['fullName', 'documentNumber', 'email', 'phone']}
                        defaultRowsPerPage={25}
                        rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                </div>

                {/* Create/Edit Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
                            <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
                                <h2 className="text-xl font-bold text-foreground">
                                    {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                                </h2>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Tipo Documento
                                        </label>
                                        <select
                                            value={formData.documentType.toString()}
                                            onChange={(e) => setFormData({ ...formData, documentType: parseInt(e.target.value) as DocumentType })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground disabled:bg-muted"
                                        >
                                            <option value="1">DNI</option>
                                            <option value="2">RUC</option>
                                            <option value="4">CE / Extranjería</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Número
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.documentNumber}
                                            onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground disabled:bg-muted"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Nombres
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.firstName}
                                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Apellidos
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.phone || ''}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                                        Línea de Crédito (S/)
                                    </label>
                                    <NumberInput
                                        value={formData.creditLimit}
                                        onChange={(val) => setFormData({ ...formData, creditLimit: val })}
                                        min={0}
                                        step={100}
                                        decimals={2}
                                        className="font-semibold"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Monto máximo de crédito permitido para este cliente.
                                    </p>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Credits / Debts Modal */}
                {isCreditsModalOpen && selectedCustomerForCredits && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-border">
                            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Historial de Créditos</h2>
                                    <p className="text-sm text-muted-foreground">{selectedCustomerForCredits.fullName}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => loadCredits(selectedCustomerForCredits.id)}
                                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                                        title="Recargar"
                                    >
                                        <RefreshCw className={`w-5 h-5 ${loadingCredits ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => setIsCreditsModalOpen(false)}
                                        className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1">
                                {loadingCredits ? (
                                    <div className="flex justify-center py-12">
                                        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : customerCredits.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        Este cliente no tiene registros de crédito.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {customerCredits.map((credit) => (
                                                <div
                                                    key={credit.id}
                                                    className={`p-4 rounded-xl border ${credit.isPaid ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : credit.isOverdue ? 'border-red-200 bg-red-50/50 dark:bg-red-900/10' : 'border-border bg-card'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${credit.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {credit.isPaid ? 'PAGADO' : 'PENDIENTE'}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {(() => {
                                                                const d = new Date(credit.creditDate);
                                                                return `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
                                                            })()}
                                                        </span>
                                                    </div>

                                                    <div className="mb-4">
                                                        <p className="text-sm text-muted-foreground line-clamp-2" title={credit.notes}>{credit.notes || 'Sin descripción'}</p>
                                                        <div className="mt-2 flex justify-between items-end">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Monto Original</p>
                                                                <p className="font-semibold text-foreground">{formatCurrency(credit.amount)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-muted-foreground">Deuda Restante</p>
                                                                <p className={`font-bold text-lg ${credit.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                                    {formatCurrency(credit.remainingAmount)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {!credit.isPaid && credit.remainingAmount > 0 && (
                                                        <button
                                                            onClick={() => handleOpenPayModal(credit)}
                                                            className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                                        >
                                                            <Banknote className="w-4 h-4" />
                                                            Pagar Deuda
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Pay Modal */}
                {isPayModalOpen && selectedCredit && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                        <div className="bg-card rounded-xl shadow-2xl max-w-sm w-full border border-border">
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-foreground mb-1">Registrar Pago</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Deuda actual: <span className="font-bold text-red-600">{formatCurrency(selectedCredit.remainingAmount)}</span>
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Monto a Pagar (S/)
                                        </label>
                                        <NumberInput
                                            value={paymentAmount}
                                            onChange={setPaymentAmount}
                                            min={0}
                                            max={selectedCredit.remainingAmount}
                                            step={1}
                                            className="font-bold text-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                                            Nota (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={paymentNote}
                                            onChange={(e) => setPaymentNote(e.target.value)}
                                            placeholder="Ej. Pago en efectivo por caja"
                                            className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-indigo-500 text-foreground"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setIsPayModalOpen(false)}
                                        disabled={isPaying}
                                        className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleProcessPayment}
                                        disabled={isPaying || paymentAmount <= 0}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {isPaying ? 'Procesando...' : 'Confirmar Pago'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
