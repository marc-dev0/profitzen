
import { useState } from 'react';
import { DataTable, Column } from '@/components/DataTable';
import { useTransfers, useCompleteTransfer, useCancelTransfer } from '@/hooks/useTransfers';
import { useAuthStore } from '@/store/authStore';
import { useStores } from '@/hooks/useStores';
import { useUsers } from '@/hooks/useUsers';

import apiClient from '@/lib/axios';

import { generateTransferPDF } from '@/utils/pdfGenerator';
import { Check, FileText, ArrowRight, ArrowLeft, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Product } from '@/types/inventory';

interface TransferListProps {
    products?: Product[];
}

export default function TransferList({ products }: TransferListProps) {
    const { user } = useAuthStore();
    const { data: stores } = useStores();
    const { data: users } = useUsers();

    // Incoming Transfers (Destination = Current Store)
    const { data: incomingTransfers, isLoading: isLoadingIncoming } = useTransfers(undefined, user?.currentStoreId);

    // Outgoing Transfers (Origin = Current Store)
    const { data: outgoingTransfers, isLoading: isLoadingOutgoing } = useTransfers(user?.currentStoreId, undefined);

    const completeTransferMutation = useCompleteTransfer();
    const cancelTransferMutation = useCancelTransfer();

    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        type: 'receive' | 'cancel' | null;
        transferId: string | null;
        title: string;
        description: string;
    }>({
        isOpen: false,
        type: null,
        transferId: null,
        title: '',
        description: ''
    });

    const getStoreName = (id: string) => stores?.find(s => s.id === id)?.name || 'Tienda Desconocida';
    const getUserName = (id: string) => {
        const u = users?.find(u => u.id === id);
        return u ? `${u.firstName} ${u.lastName}` : 'Usuario Desconocido';
    };

    const initiateReceive = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            type: 'receive',
            transferId: id,
            title: 'Confirmar recepción',
            description: '¿Está seguro de recibir la mercadería? Esta acción sumará los productos al stock de su tienda.'
        });
    };

    const initiateCancel = (id: string) => {
        setConfirmDialog({
            isOpen: true,
            type: 'cancel',
            transferId: id,
            title: 'Cancelar Envio',
            description: '¿Está seguro de cancelar este envío? El stock será devuelto al almacén de origen inmediatamente.'
        });
    };

    const handleConfirmAction = async () => {
        if (!confirmDialog.transferId || !confirmDialog.type) return;

        try {
            if (confirmDialog.type === 'receive') {
                await completeTransferMutation.mutateAsync(confirmDialog.transferId);
                toast.success('Transferencia recibida y stock actualizado');
            } else if (confirmDialog.type === 'cancel') {
                await cancelTransferMutation.mutateAsync(confirmDialog.transferId);
                toast.success('Transferencia cancelada y stock devuelto');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || `Error al ${confirmDialog.type === 'receive' ? 'recibir' : 'cancelar'} transferencia`);
        } finally {
            setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handlePrint = async (transfer: any) => {
        try {
            // Fetch full transfer details
            const response = await apiClient.get<any>(`/api/inventory/transfers/${transfer.id}`);
            const fullTransfer = response.data;

            const items = fullTransfer.details?.map((d: any) => {
                // Try to find the product to get its Base UOM Name
                const product = products?.find(p => p.id === d.productId || p.code === d.productCode);
                const uomName = d.uom || product?.baseUOMName || 'Unidades';

                return {
                    productName: d.productName,
                    productCode: d.productCode,
                    quantity: d.quantity,
                    uom: uomName,
                    isPositive: true
                };
            }) || [];

            if (!items.length) {
                toast.error('No se encontraron detalles para esta transferencia');
                return;
            }

            generateTransferPDF({
                code: fullTransfer.transferNumber,
                date: new Date(fullTransfer.createdAt),
                sourceStore: getStoreName(fullTransfer.originStoreId),
                destinationStore: getStoreName(fullTransfer.destinationStoreId),
                reason: fullTransfer.notes || '',
                items: items,
                requesterName: getUserName(fullTransfer.requestedByUserId),
                receiverName: fullTransfer.receivedByUserId ? getUserName(fullTransfer.receivedByUserId) : undefined,
                isPending: fullTransfer.status === 0
            });
        } catch {
            toast.error('Error al cargar detalles para impresión');
        }
    };

    // Column Definitions
    const getStatusBadge = (status: number) => {
        switch (status) {
            case 0: return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> En Tránsito</span>;
            case 1: return <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><Check className="w-3 h-3" /> Completado</span>;
            case 2: return <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><X className="w-3 h-3" /> Cancelado</span>;
            default: return null;
        }
    };

    const incomingColumns: Column<any>[] = [
        {
            key: 'transferNumber',
            header: 'Código',
            sortable: true,
            render: (item) => (
                <div className="flex flex-col gap-1">
                    <span className="font-mono font-bold text-primary">{item.transferNumber}</span>
                    {getStatusBadge(item.status)}
                </div>
            )
        },
        {
            key: 'createdAt',
            header: 'Fecha',
            sortable: true,
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium">{new Date(item.createdAt).toLocaleDateString('es-PE')}</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )
        },
        {
            key: 'originStoreId',
            header: 'Origen',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                    <span>{getStoreName(item.originStoreId)}</span>
                </div>
            )
        },
        {
            key: 'requestedByUserId',
            header: 'Solicitado Por',
            render: (item) => <span className="text-sm">{getUserName(item.requestedByUserId)}</span>
        },
        {
            key: 'notes',
            header: 'Nota',
            render: (item) => item.notes ? <span className="text-xs italic text-muted-foreground max-w-[200px] block truncate" title={item.notes}>{item.notes}</span> : <span className="text-muted-foreground">-</span>
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePrint(item)} className="p-2 text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-accent transition-colors" title="Imprimir Guía">
                        <FileText className="w-4 h-4" />
                    </button>
                    {item.status === 0 && (
                        <button
                            onClick={() => initiateReceive(item.id)}
                            disabled={completeTransferMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Recibir
                        </button>
                    )}
                </div>
            )
        }
    ];

    const outgoingColumns: Column<any>[] = [
        {
            key: 'transferNumber',
            header: 'Código',
            sortable: true,
            render: (item) => (
                <div className="flex flex-col gap-1">
                    <span className="font-mono font-bold text-primary">{item.transferNumber}</span>
                    {getStatusBadge(item.status)}
                </div>
            )
        },
        {
            key: 'createdAt',
            header: 'Fecha',
            sortable: true,
            render: (item) => (
                <div className="flex flex-col">
                    <span className="font-medium">{new Date(item.createdAt).toLocaleDateString('es-PE')}</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )
        },
        {
            key: 'destinationStoreId',
            header: 'Destino',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-orange-500" />
                    <span>{getStoreName(item.destinationStoreId)}</span>
                </div>
            )
        },
        {
            key: 'requestedByUserId',
            header: 'Solicitado Por',
            render: (item) => <span className="text-sm">{getUserName(item.requestedByUserId)}</span>
        },
        {
            key: 'receivedByUserId',
            header: 'Recibido Por',
            render: (item) => item.receivedByUserId ? <span className="text-sm">{getUserName(item.receivedByUserId)}</span> : <span className="text-muted-foreground text-xs">-</span>
        },
        {
            key: 'notes',
            header: 'Nota',
            render: (item) => item.notes ? <span className="text-xs italic text-muted-foreground max-w-[200px] block truncate" title={item.notes}>{item.notes}</span> : <span className="text-muted-foreground">-</span>
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (item) => (
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePrint(item)} className="p-2 text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-accent transition-colors" title="Imprimir Guía">
                        <FileText className="w-4 h-4" />
                    </button>
                    {item.status === 0 && (
                        <button
                            onClick={() => initiateCancel(item.id)}
                            disabled={cancelTransferMutation.isPending}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm transition-colors disabled:opacity-50"
                        >
                            <X className="w-3.5 h-3.5" />
                            Cancelar
                        </button>
                    )}
                </div>
            )
        }
    ];

    // Enrichment for Search
    const enrichedIncoming = incomingTransfers?.map(t => ({
        ...t,
        originStoreName: getStoreName(t.originStoreId),
        requesterName: getUserName(t.requestedByUserId)
    })) || [];

    const enrichedOutgoing = outgoingTransfers?.map(t => ({
        ...t,
        destinationStoreName: getStoreName(t.destinationStoreId),
        requesterName: getUserName(t.requestedByUserId),
        receiverName: t.receivedByUserId ? getUserName(t.receivedByUserId) : ''
    })) || [];

    return (
        <div className="space-y-8">
            {/* Incoming Section */}
            <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5 text-blue-500" />
                    Por Recibir (Entrantes)
                </h3>
                <DataTable
                    data={enrichedIncoming}
                    columns={incomingColumns}
                    keyExtractor={(item) => item.id}
                    loading={isLoadingIncoming}
                    emptyMessage="No hay transferencias entrantes."
                    searchable={true}
                    searchPlaceholder="Buscar por código, origen..."
                    searchKeys={['transferNumber', 'originStoreName', 'requesterName', 'notes']}
                    defaultRowsPerPage={10}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </div>

            <div className="border-t border-border my-8"></div>

            {/* Outgoing Section */}
            <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-orange-500" />
                    Historial de Envíos (Salientes)
                </h3>
                <DataTable
                    data={enrichedOutgoing}
                    columns={outgoingColumns}
                    keyExtractor={(item) => item.id}
                    loading={isLoadingOutgoing}
                    emptyMessage="No hay transferencias enviadas."
                    searchable={true}
                    searchPlaceholder="Buscar por código, destino..."
                    searchKeys={['transferNumber', 'destinationStoreName', 'requesterName', 'receiverName', 'notes']}
                    defaultRowsPerPage={10}
                    rowsPerPageOptions={[10, 25, 50]}
                />
            </div>

            <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmDialog.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
                            className={confirmDialog.type === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
