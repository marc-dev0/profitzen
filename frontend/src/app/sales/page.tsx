'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useAuthStore } from '@/store/authStore';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import AppLayout from '@/components/layout/AppLayout';
import { FormattedDateInput } from '@/components/ui/formatted-date-input';
import { DataTable, Column } from '@/components/DataTable';
import {
    Eye,
    CheckCircle,
    Trash2,
    XCircle,
    Printer,
    FileSpreadsheet,
    FileText,
    DollarSign,
    CreditCard,
    TrendingUp,
    Receipt,
    RefreshCcw
} from 'lucide-react';

interface SaleItem {
    id: string;
    productId: string;
    productName: string;
    productCode: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    subtotal: number;
}

interface Payment {
    id: string;
    method: string;
    amount: number;
    reference: string | null;
    paymentDate: string;
}

interface Sale {
    id: string;
    saleNumber: string;
    storeId: string;
    cashierId: string;
    customerId: string | null;
    customerName: string | null;
    saleDate: string;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    status: string;
    notes: string | null;
    paidAmount: number;
    remainingAmount: number;
    isFullyPaid: boolean;
    items: SaleItem[];
    payments: Payment[];
}

const statusColors = {
    Pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
    Completed: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700',
    Refunded: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-orange-300 dark:border-orange-700'
};

const statusLabels = {
    Pending: 'Pendiente',
    Completed: 'Completada',
    Refunded: 'Devuelta'
};

const paymentMethodLabels = {
    Cash: 'Efectivo',
    Card: 'Tarjeta',
    Transfer: 'Transferencia',
    Credit: 'Crédito'
};

function SalesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSearch = searchParams?.get('q') || '';
    const { user } = useAuthStore();
    const { data: companySettings } = useCompanySettings();
    const [sales, setSales] = useState<Sale[]>([]);
    const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returning, setReturning] = useState(false);

    useEffect(() => {
        if (user?.currentStoreId) {
            fetchSales();
        }
    }, [user?.currentStoreId]);

    useEffect(() => {
        filterSales();
    }, [sales, statusFilter, dateFrom, dateTo]);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const storeId = user?.currentStoreId;
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/sales${storeId ? `?storeId=${storeId}` : ''}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSales(response.data);
        } catch (error: any) {
            console.error('Error fetching sales:', error);
            toast.error('Error al cargar las ventas');
        } finally {
            setLoading(false);
        }
    };

    const filterSales = () => {
        let filtered = [...sales];

        if (statusFilter !== 'all') {
            filtered = filtered.filter(sale => sale.status === statusFilter);
        }

        if (dateFrom) {
            filtered = filtered.filter(sale => new Date(sale.saleDate) >= new Date(dateFrom));
        }
        if (dateTo) {
            const endDate = new Date(dateTo);
            endDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(sale => new Date(sale.saleDate) <= endDate);
        }

        setFilteredSales(filtered);
    };

    const handleCancelSale = async () => {
        if (!selectedSale) return;

        try {
            setCancelling(true);
            const token = localStorage.getItem('token');
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/sales/${selectedSale.id}/cancel`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Venta anulada correctamente');
            setShowCancelModal(false);
            setSelectedSale(null);
            fetchSales();
        } catch (error: any) {
            console.error('Error cancelling sale:', error);
            toast.error(error.response?.data?.message || 'Error al anular la venta');
        } finally {
            setCancelling(false);
        }
    };

    const handleReturnSale = async () => {
        if (!selectedSale) return;

        try {
            setReturning(true);
            const token = localStorage.getItem('token');
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/sales/${selectedSale.id}/return`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Venta devuelta correctamente');
            setShowReturnModal(false);
            setSelectedSale(null);
            fetchSales();
        } catch (error: any) {
            console.error('Error returning sale:', error);
            toast.error(error.response?.data?.message || 'Error al devolver la venta');
        } finally {
            setReturning(false);
        }
    };

    const exportToExcel = () => {
        const dataToExport = filteredSales.map(sale => ({
            'N° Venta': sale.saleNumber,
            'Fecha': formatDate(sale.saleDate),
            'Cliente': sale.customerName || 'Cliente General',
            'Subtotal': sale.subtotal,
            'Descuento': sale.discountAmount,
            'IGV': sale.taxAmount,
            'Total': sale.total,
            'Estado': statusLabels[sale.status as keyof typeof statusLabels],
            'Pagado': sale.paidAmount,
            'Pendiente': sale.remainingAmount
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ventas');

        const maxWidth = dataToExport.reduce((w: any, r: any) => {
            return Object.keys(r).map((k, i) => {
                const val = r[k] ? r[k].toString().length : 10;
                return Math.max(w[i] || 10, val);
            });
        }, []);
        ws['!cols'] = maxWidth.map((w: number) => ({ width: w + 2 }));

        const fileName = `ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
        toast.success('Archivo Excel descargado correctamente');
    };

    const handlePrint = async (sale: Sale) => {
        try {
            toast.loading('Generando ticket...', { id: 'print-ticket' });
            const token = localStorage.getItem('token');
            const settings = {
                StoreName: companySettings?.tradeName || companySettings?.companyName || "Mi Tienda",
                StoreAddress: companySettings?.address || "Av. Principal 123",
                StorePhone: companySettings?.phone || "",
                StoreRuc: companySettings?.ruc || "20123456789",
                HeaderText: companySettings?.ticketHeader || '',
                FooterText: companySettings?.ticketFooter || '¡Gracias por su compra!\nVuelva pronto',
                LogoUrl: companySettings?.logoUrl,
                ShowLogo: companySettings?.showLogo ?? true,
                TicketWidth: companySettings?.ticketWidth || 80,
                CashierName: user?.fullName || 'Usuario'
            };

            const response = await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/sales/${sale.id}/ticket`,
                settings,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob'
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            window.open(url, '_blank');
            toast.success('Ticket generado correctamente', { id: 'print-ticket' });

        } catch (error) {
            console.error('Error creating ticket:', error);
            toast.error('Error al generar el ticket', { id: 'print-ticket' });
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const formatCurrency = (amount: number) => {
        return `S/ ${amount.toFixed(2)}`;
    };

    const clearFilters = () => {
        setStatusFilter('all');
        setDateFrom('');
        setDateTo('');
    };

    const getTotalRevenue = () => {
        return filteredSales
            .filter(s => s.status === 'Completed')
            .reduce((sum, sale) => sum + sale.total, 0);
    };

    const handleDeleteSale = async (sale: Sale) => {
        if (!confirm('¿Estás seguro que deseas eliminar esta venta pendiente? Esta acción no se puede deshacer.')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/sales/${sale.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Venta eliminada correctamente');
            fetchSales();
        } catch (error: any) {
            console.error('Error deleting sale:', error);
            toast.error('Error al eliminar la venta');
        }
    };

    // Define columns for DataTable
    const salesColumns: Column<Sale>[] = [
        {
            key: 'saleNumber',
            header: 'N° Venta',
            sortable: true,
            render: (sale) => (
                <span className="font-mono text-sm font-medium text-foreground">
                    {sale.saleNumber}
                </span>
            )
        },
        {
            key: 'saleDate',
            header: 'Fecha',
            sortable: true,
            render: (sale) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(sale.saleDate)}
                </span>
            )
        },
        {
            key: 'customerName',
            header: 'Cliente',
            sortable: true,
            render: (sale) => (
                <span className="text-sm text-foreground">
                    {sale.customerName || 'Cliente General'}
                </span>
            )
        },
        {
            key: 'total',
            header: 'Total',
            sortable: true,
            render: (sale) => (
                <span className="font-semibold text-foreground">
                    {formatCurrency(sale.total)}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Estado',
            sortable: true,
            render: (sale) => (
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[sale.status as keyof typeof statusColors]}`}>
                    {statusLabels[sale.status as keyof typeof statusLabels]}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (sale) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSale(sale);
                            setShowDetailModal(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

                    {sale.status !== 'Pending' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePrint(sale);
                            }}
                            className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Imprimir ticket"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                    )}

                    {sale.status === 'Pending' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSale(sale);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar borrador"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}

                    {sale.status === 'Completed' && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSale(sale);
                                setShowCancelModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Anular venta"
                        >
                            <XCircle className="w-4 h-4" />
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <AppLayout>
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Historial de Ventas</h1>
                        <p className="text-muted-foreground mt-1">Gestiona y consulta todas tus ventas</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={exportToExcel}
                            disabled={filteredSales.length === 0}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg shadow-green-600/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileSpreadsheet className="w-5 h-5" />
                            Exportar Excel
                        </button>
                        <button
                            onClick={() => router.push('/pos')}
                            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/30"
                        >
                            Nueva Venta
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
                    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Ventas</p>
                                <p className="text-2xl font-bold text-foreground">{sales.length}</p>
                            </div>
                            <FileText className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Completadas</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {sales.filter(s => s.status === 'Completed').length}
                                </p>
                            </div>
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pendientes</p>
                                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                    {sales.filter(s => s.status === 'Pending').length}
                                </p>
                            </div>
                            <CreditCard className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                        </div>
                    </div>
                    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Devueltas</p>
                                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                    {sales.filter(s => s.status === 'Refunded').length}
                                </p>
                            </div>
                            <RefreshCcw className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                    <div className="bg-primary/90 rounded-xl p-4 shadow-lg text-primary-foreground">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-primary-foreground/80">Ingresos Totales</p>
                                <p className="text-2xl font-bold text-primary-foreground">
                                    {formatCurrency(getTotalRevenue())}
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-primary-foreground/80" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-foreground cursor-pointer"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="Pending">Pendientes</option>
                        <option value="Completed">Completadas</option>
                        <option value="Refunded">Devueltas</option>
                    </select>

                    <FormattedDateInput
                        value={dateFrom}
                        onChange={setDateFrom}
                        placeholder="Desde"
                    />

                    <FormattedDateInput
                        value={dateTo}
                        onChange={setDateTo}
                        placeholder="Hasta"
                    />
                </div>

                {(statusFilter !== 'all' || dateFrom || dateTo) && (
                    <button
                        onClick={clearFilters}
                        className="mt-4 text-sm text-primary hover:text-primary/80 font-medium"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Sales Table with DataTable Component */}
            <DataTable
                key={initialSearch} // Remount if initial search changes
                initialSearchTerm={initialSearch}
                data={filteredSales}
                columns={salesColumns}
                keyExtractor={(sale) => sale.id}
                loading={loading}
                emptyMessage="No se encontraron ventas"
                searchable={true}
                searchPlaceholder="Buscar por N° venta o cliente..."
                searchKeys={['saleNumber', 'customerName']}
                defaultRowsPerPage={10}
                rowsPerPageOptions={[10, 25, 50, 100]}
            />


            {/* Detail Modal */}
            {
                showDetailModal && selectedSale && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-border">
                            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Detalle de Venta</h2>
                                    <p className="text-sm text-muted-foreground font-mono">{selectedSale.saleNumber}</p>
                                </div>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Sale Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Fecha</p>
                                        <p className="font-medium text-foreground">{formatDate(selectedSale.saleDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Estado</p>
                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusColors[selectedSale.status as keyof typeof statusColors]}`}>
                                            {statusLabels[selectedSale.status as keyof typeof statusLabels]}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Cliente</p>
                                        <p className="font-medium text-foreground">{selectedSale.customerName || 'Cliente General'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total</p>
                                        <p className="font-bold text-lg text-foreground">{formatCurrency(selectedSale.total)}</p>
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="font-semibold text-foreground mb-3">Productos</h3>
                                    <div className="border border-border rounded-lg overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-muted/50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Producto</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Cant.</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">P. Unit.</th>
                                                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">Subtotal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {selectedSale.items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-2 text-sm text-foreground">{item.productName}</td>
                                                        <td className="px-4 py-2 text-sm text-muted-foreground text-right">{item.quantity}</td>
                                                        <td className="px-4 py-2 text-sm text-muted-foreground text-right">{formatCurrency(item.unitPrice)}</td>
                                                        <td className="px-4 py-2 text-sm font-medium text-foreground text-right">{formatCurrency(item.subtotal)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Payments */}
                                <div>
                                    <h3 className="font-semibold text-foreground mb-3">Pagos</h3>
                                    <div className="space-y-2">
                                        {selectedSale.payments.map((payment) => (
                                            <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {paymentMethodLabels[payment.method as keyof typeof paymentMethodLabels]}
                                                    </p>
                                                    {payment.reference && (
                                                        <p className="text-xs text-muted-foreground">Ref: {payment.reference}</p>
                                                    )}
                                                </div>
                                                <p className="font-semibold text-foreground">{formatCurrency(payment.amount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Totals */}
                                <div className="border-t border-border pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="font-medium text-foreground">{formatCurrency(selectedSale.subtotal)}</span>
                                    </div>
                                    {selectedSale.discountAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Descuento</span>
                                            <span className="font-medium text-red-600">-{formatCurrency(selectedSale.discountAmount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">IGV (18%)</span>
                                        <span className="font-medium text-foreground">{formatCurrency(selectedSale.taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold border-t border-border pt-2">
                                        <span className="text-foreground">Total</span>
                                        <span className="text-foreground">{formatCurrency(selectedSale.total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cancel Modal */}
            {
                showCancelModal && selectedSale && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6 border border-border">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Anular Venta</h2>
                                    <p className="text-sm text-muted-foreground font-mono">{selectedSale.saleNumber}</p>
                                </div>
                            </div>

                            <p className="text-muted-foreground mb-6">
                                ¿Estás seguro que deseas anular esta venta? Esta acción no se puede deshacer.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCancelModal(false)}
                                    disabled={cancelling}
                                    className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCancelSale}
                                    disabled={cancelling}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                >
                                    {cancelling ? 'Anulando...' : 'Anular Venta'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Return Modal */}
            {
                showReturnModal && selectedSale && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6 border border-border">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <RefreshCcw className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Devolver Venta</h2>
                                    <p className="text-sm text-muted-foreground font-mono">{selectedSale.saleNumber}</p>
                                </div>
                            </div>

                            <p className="text-muted-foreground mb-6">
                                ¿Estás seguro que deseas realizar la devolución de esta venta?
                                <br /><br />
                                <span className="font-medium text-foreground">• Se restaurará el stock de los productos.</span>
                                <br />
                                <span className="font-medium text-foreground">• Se anulará la deuda (crédito) o se registrará el reembolso.</span>
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowReturnModal(false)}
                                    disabled={returning}
                                    className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleReturnSale}
                                    disabled={returning}
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                                >
                                    {returning ? 'Procesando...' : 'Confirmar Devolución'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }


        </AppLayout >
    );
}



export default function SalesPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background text-foreground">Cargando módulo de ventas...</div>}>
            <SalesContent />
        </Suspense>
    );
}
