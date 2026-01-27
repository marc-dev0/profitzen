
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { StoreInventoryItem, TransferItem } from '@/hooks/useInventoryMovements';
import { useCreateTransfer } from '@/hooks/useTransfers';
import { useStores } from '@/hooks/useStores';
import { useUsers } from '@/hooks/useUsers';
import { useAuthStore } from '@/store/authStore';
import { generateTransferPDF } from '@/utils/pdfGenerator';
import { X, ArrowRight, Printer, Check, ShoppingCart, Trash2 } from 'lucide-react';
import { Product, ProductPurchaseUOM } from '@/types/inventory';

interface BatchTransferDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItems: StoreInventoryItem[];
    onClearSelection: () => void;
    products: Product[];
}

export default function BatchTransferDialog({ isOpen, onClose, selectedItems, onClearSelection, products }: BatchTransferDialogProps) {
    const { user } = useAuthStore();
    const { data: stores } = useStores();
    const { data: users } = useUsers();
    const createTransferMutation = useCreateTransfer();

    const [destinationStoreId, setDestinationStoreId] = useState('');
    const [requestedByUserId, setRequestedByUserId] = useState('');
    const [reason, setReason] = useState('');
    // Map of productId -> quantity (in selected UOM) to transfer
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    // Map of productId -> selected UOM ID
    const [uomSelections, setUomSelections] = useState<Record<string, string>>({});

    // Items to actually transfer (user might remove some from the list in the dialog)
    const [itemsToTransfer, setItemsToTransfer] = useState<StoreInventoryItem[]>(selectedItems);

    // Transfer success state (stores the full Transfer object if needed, or just code)
    const [transferResult, setTransferResult] = useState<any>(null);

    // Filter out current store from destinations
    const availableStores = stores?.filter(s => s.id !== user?.currentStoreId) || [];

    // Sync state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setItemsToTransfer(selectedItems);
            // Default requested by to current user
            if (user?.id) setRequestedByUserId(user.id);

            // Initialize UOM selections
            const initialUoms: Record<string, string> = {};
            selectedItems.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    // Prefer default purchase UOM, otherwise base UOM
                    // Actually Product type has purchaseUOMId (default)
                    // But we need to make sure it exists in purchaseUOMs list or is the base
                    // Let's check logic:
                    if (product.purchaseUOMId) {
                        initialUoms[item.productId] = product.purchaseUOMId;
                    } else {
                        initialUoms[item.productId] = product.baseUOMId;
                    }
                }
            });
            setUomSelections(initialUoms);
            setQuantities({});
        }
    }, [isOpen, selectedItems, user, products]);

    const handleQuantityChange = (productId: string, val: string) => {
        const num = parseFloat(val) || 0; // Allow decimals? Usually yes if UOM allows
        setQuantities(prev => ({ ...prev, [productId]: num }));
    };

    const handleUomChange = (productId: string, uomId: string) => {
        setUomSelections(prev => ({ ...prev, [productId]: uomId }));
    };

    const handleRemoveItem = (id: string) => {
        setItemsToTransfer(prev => prev.filter(i => i.id !== id));
    };

    const getConversionFactor = (product: Product, uomId: string): number => {
        if (uomId === product.baseUOMId) return 1;
        const uom = product.purchaseUOMs?.find(u => u.uomId === uomId);
        return uom ? uom.conversionToBase : 1;
    };

    const getUomName = (product: Product, uomId: string): string => {
        if (uomId === product.baseUOMId) return product.baseUOMName || 'Unidad Base';
        const uom = product.purchaseUOMs?.find(u => u.uomId === uomId);
        return uom ? uom.uomName : 'Desconocido';
    };

    const handleSubmit = async () => {
        if (!user?.currentStoreId) {
            toast.error('No se ha identificado la tienda de origen. Intente recargar la página.');
            return;
        }
        if (!destinationStoreId) {
            toast.error('Seleccione una tienda de destino');
            return;
        }
        if (!requestedByUserId) {
            toast.error('Seleccione quien solicita la transferencia');
            return;
        }
        // Reason is now optional notes, but good to have

        const transferItems: { productId: string; quantity: number }[] = [];
        let hasError = false;

        itemsToTransfer.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return;

            const qtyEntered = quantities[item.productId] || 0;
            const uomId = uomSelections[item.productId] || product.baseUOMId;
            const conversion = getConversionFactor(product, uomId);
            const totalBaseQty = qtyEntered * conversion;

            if (qtyEntered <= 0) {
                // skip or warn? Implicit skip currently
            } else if (totalBaseQty > item.currentStock) {
                toast.error(`Stock insuficiente para ${item.productName}. Necesario: ${totalBaseQty} (Base), Disponible: ${item.currentStock} (Base)`);
                hasError = true;
            } else {
                transferItems.push({
                    productId: item.productId,
                    quantity: totalBaseQty
                });
            }
        });

        if (hasError) return;

        if (transferItems.length === 0) {
            toast.error('Ingrese cantidades válidas para al menos un producto');
            return;
        }

        try {
            const response = await createTransferMutation.mutateAsync({
                originStoreId: user.currentStoreId,
                destinationStoreId,
                requestedByUserId,
                notes: reason,
                items: transferItems
            });

            toast.success('Transferencia creada exitosamente (En Tránsito)');
            setTransferResult(response);
            // Keep dialog open in success state
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al crear transferencia');
        }
    };

    const handleClose = () => {
        setTransferResult(null);
        setDestinationStoreId('');
        setReason('');
        setQuantities({});
        setUomSelections({});
        setItemsToTransfer(selectedItems);
        if (transferResult) onClearSelection(); // Only clear if we had success
        onClose();
    };

    if (!isOpen) return null;

    const handlePrint = () => {
        if (!transferResult) return;

        const items = itemsToTransfer.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return null;

            const qtyEntered = quantities[item.productId] || 0;
            const uomId = uomSelections[item.productId] || product.baseUOMId;
            const conversion = getConversionFactor(product, uomId);
            const totalBaseQty = qtyEntered * conversion;
            // PDF usually shows Base Quantity, but maybe we want to show "5 Boxes"?
            // The generateTransferPDF usually expects items with `quantity`. 
            // If we send `totalBaseQty`, it's correct for inventory.

            if (qtyEntered <= 0) return null;
            return {
                productName: item.productName,
                productCode: item.productCode,
                quantity: qtyEntered, // Show entered quantity (e.g., 5 Boxes)
                uom: getUomName(product, uomId),
                isPositive: false
            };
        }).filter(Boolean) as any[];

        const sourceName = stores?.find(s => s.id === user?.currentStoreId)?.name || 'Origen';
        const destName = stores?.find(s => s.id === destinationStoreId)?.name || 'Destino';

        // Find requester name
        const requester = users?.find(u => u.id === requestedByUserId);
        const requesterName = requester ? `${requester.firstName} ${requester.lastName}` : 'Desconocido';

        generateTransferPDF({
            code: transferResult.transferNumber || 'TRF-???',
            date: new Date(transferResult.createdAt),
            sourceStore: sourceName,
            destinationStore: destName,
            reason: reason || transferResult.notes || '',
            items: items,
            requesterName: requesterName,
            isPending: true
        });
    };

    // Success View
    if (transferResult) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20">
                <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95 duration-200">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                            <ArrowRight className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold">Transferencia Enviada</h2>
                        <div className="p-3 bg-muted rounded-lg border border-border">
                            <p className="text-sm text-muted-foreground">Código de Transferencia</p>
                            <p className="text-xl font-mono font-bold text-primary tracking-wider">{transferResult.transferNumber}</p>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            Los productos han salido del almacén y están <strong>En Tránsito</strong>.
                            El destino debe confirmar la recepción.
                        </p>

                        <div className="flex flex-col gap-2 pt-4">
                            <button
                                onClick={handlePrint}
                                className="w-full py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 flex items-center justify-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Descargar Guía de Remisión PDF
                            </button>
                            <button
                                onClick={handleClose}
                                className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20">
            <div className="bg-card w-full max-w-5xl rounded-xl shadow-lg border border-border flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Nueva Transferencia de Mercadería</h2>
                            <p className="text-sm text-muted-foreground">Mover {itemsToTransfer.length} productos seleccionados</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tienda de Destino</label>
                            <select
                                value={destinationStoreId}
                                onChange={(e) => setDestinationStoreId(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Seleccione destino...</option>
                                {availableStores.map(store => (
                                    <option key={store.id} value={store.id}>{store.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Solicitado Por</label>
                            <select
                                value={requestedByUserId}
                                onChange={(e) => setRequestedByUserId(e.target.value)}
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary"
                            >
                                <option value="">Seleccione empleado...</option>
                                {users?.filter(u => u.isActive).map(u => (
                                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Motivo / Notas</label>
                            <input
                                type="text"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ej. Reabastecimiento semanal, Solicitud #123..."
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Producto</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock Disp.</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unidad</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-32">Cantidad</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {itemsToTransfer.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                            No hay productos seleccionados
                                        </td>
                                    </tr>
                                ) : (
                                    itemsToTransfer.map(item => {
                                        const product = products.find(p => p.id === item.productId);
                                        const selectedUomId = uomSelections[item.productId] || product?.baseUOMId;

                                        // Calculate displayed stock based on selected UOM
                                        let stockDisplay = item.currentStock;
                                        let conversion = 1;
                                        if (product && selectedUomId) {
                                            conversion = getConversionFactor(product, selectedUomId);
                                            stockDisplay = Math.floor(item.currentStock / conversion);
                                        }

                                        return (
                                            <tr key={item.id} className="bg-card">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-foreground">{item.productName}</div>
                                                    <div className="text-xs text-muted-foreground">{item.productCode}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-muted-foreground">
                                                    <div className="font-medium">{stockDisplay}</div>
                                                    {conversion > 1 && <div className="text-xs">({item.currentStock} Base)</div>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {product ? (
                                                        <select
                                                            value={selectedUomId || ''}
                                                            onChange={(e) => handleUomChange(item.productId, e.target.value)}
                                                            className="w-full max-w-[140px] px-2 py-1 text-sm bg-background border border-input rounded focus:ring-2 focus:ring-primary"
                                                        >
                                                            <option value={product.baseUOMId}>{product.baseUOMName || 'Unidad Base'}</option>
                                                            {product.purchaseUOMs?.map(u => (
                                                                <option key={u.uomId} value={u.uomId}>
                                                                    {u.uomName} (x{u.conversionToBase})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={stockDisplay} // Limit to converted available stock
                                                        value={quantities[item.productId] ?? ''}
                                                        onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                                                        placeholder="0"
                                                        className="w-full px-2 py-1 bg-background border border-input rounded text-center focus:ring-2 focus:ring-primary"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3 transition-all">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={createTransferMutation.isPending || itemsToTransfer.length === 0}
                        className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {createTransferMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <ArrowRight className="w-4 h-4" />
                        )}
                        Iniciar Transferencia
                    </button>
                </div>
            </div>
        </div>
    );
}
