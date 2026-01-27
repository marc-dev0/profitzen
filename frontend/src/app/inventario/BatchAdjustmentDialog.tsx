import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { StoreInventoryItem, useCreateAdjustmentBatch, BatchAdjustmentItem } from '@/hooks/useInventoryMovements';
import { useAuthStore } from '@/store/authStore';
import { Check, X, ArrowRight, Activity, Trash2, Download } from 'lucide-react';
import { generateAdjustmentPDF } from '@/utils/pdfGenerator';
import { Product } from '@/types/inventory'; // Import Product

interface BatchAdjustmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    selectedItems: StoreInventoryItem[];
    onClearSelection: () => void;
    products: Product[]; // Add products prop
}

const ADJUSTMENT_TYPES = [
    { value: 'MERMA', label: 'Merma', description: 'Pérdida por manipulación o transporte', isNegative: true },
    { value: 'DAÑADO', label: 'Producto Dañado', description: 'Producto deteriorado', isNegative: true },
    { value: 'VENCIDO', label: 'Producto Vencido', description: 'Producto caducado', isNegative: true },
    { value: 'CORRECCION', label: 'Corrección de Inventario', description: 'Ajuste manual (positivo o negativo)', isNegative: false },
    { value: 'OTRO', label: 'Otro', description: 'Otro tipo de ajuste', isNegative: false }
];

export default function BatchAdjustmentDialog({ isOpen, onClose, selectedItems, onClearSelection, products }: BatchAdjustmentDialogProps) {
    const { user } = useAuthStore();
    const createBatchAdjustment = useCreateAdjustmentBatch();

    const [adjustmentType, setAdjustmentType] = useState(ADJUSTMENT_TYPES[0].value);
    const [reason, setReason] = useState('');
    // Map of productId -> quantity (in selected UOM)
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    // Map of productId -> selected UOM ID
    const [uomSelections, setUomSelections] = useState<Record<string, string>>({});

    const [itemsToAdjust, setItemsToAdjust] = useState<StoreInventoryItem[]>(selectedItems);
    const [adjustmentCode, setAdjustmentCode] = useState<string | null>(null);

    const [isManualPositive, setIsManualPositive] = useState(true);

    // Sync state when dialog opens, but NOT if we successfully finished an adjustment (to keep items for PDF)
    useEffect(() => {
        if (isOpen && !adjustmentCode) {
            setItemsToAdjust(selectedItems);
            // Default UOMs to Purchase UOM or Base UOM
            const initialUoms: Record<string, string> = {};
            selectedItems.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product) {
                    initialUoms[item.productId] = product.purchaseUOMId || product.baseUOMId;
                }
            });
            setUomSelections(initialUoms);
            setQuantities({});
        }
    }, [isOpen, selectedItems, products, adjustmentCode]);

    const handleQuantityChange = (productId: string, val: string) => {
        const num = parseFloat(val) || 0; // Support decimals
        setQuantities(prev => ({ ...prev, [productId]: num }));
    };

    const handleUomChange = (productId: string, uomId: string) => {
        setUomSelections(prev => ({ ...prev, [productId]: uomId }));
    };

    const handleRemoveItem = (id: string) => {
        setItemsToAdjust(prev => prev.filter(i => i.id !== id));
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

    const currentTypeInfo = ADJUSTMENT_TYPES.find(t => t.value === adjustmentType);
    const isStrictlyNegative = currentTypeInfo?.isNegative === true;
    const finalIsPositive = isStrictlyNegative ? false : isManualPositive;

    const handleSubmit = async () => {
        if (!reason) {
            toast.error('Ingrese un motivo/referencia para el ajuste');
            return;
        }

        const adjustmentItems: BatchAdjustmentItem[] = [];
        let hasError = false;

        itemsToAdjust.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return;

            const qty = quantities[item.productId] || 0;
            const uomId = uomSelections[item.productId] || product.baseUOMId;
            const conversion = getConversionFactor(product, uomId);
            const totalBaseQty = qty * conversion;

            if (qty <= 0) {
                // skip 0 qty
            } else {
                if (!finalIsPositive && totalBaseQty > item.currentStock) {
                    toast.error(`Stock insuficiente para ${item.productName}. Necesario: ${totalBaseQty} (Base), Disponible: ${item.currentStock} (Base)`);
                    hasError = true;
                } else {
                    const isVirtual = item.id.startsWith('virtual-');
                    adjustmentItems.push({
                        storeInventoryId: isVirtual ? undefined : item.id,
                        productId: item.productId,
                        quantity: totalBaseQty, // Send converted base quantity
                        uomId: uomId,
                        uomCode: uomId === product.baseUOMId ? product.baseUOMCode : (product.purchaseUOMs?.find(u => u.uomId === uomId)?.uomCode),
                        originalQuantity: qty,
                        conversionFactor: conversion
                    });
                }
            }
        });

        if (hasError) return;

        if (adjustmentItems.length === 0) {
            toast.error('Ingrese cantidades válidas para al menos un producto');
            return;
        }

        const storeId = itemsToAdjust[0]?.storeId;
        if (!storeId) {
            toast.error('Error: No se pudo identificar el almacén');
            return;
        }

        try {
            const result = await createBatchAdjustment.mutateAsync({
                storeId,
                items: adjustmentItems,
                adjustmentType,
                reason,
                isPositive: finalIsPositive
            });

            toast.success('Ajuste realizado con éxito');
            setAdjustmentCode(result.adjustmentCode || 'Exitoso');
            onClearSelection();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al realizar ajuste');
        }
    };

    const handleClose = () => {
        setAdjustmentCode(null);
        setAdjustmentType(ADJUSTMENT_TYPES[0].value);
        setReason('');
        setQuantities({});
        setUomSelections({});
        setIsManualPositive(true);
        // Do not reset itemsToAdjust here, just close
        onClose();
    };

    const handleGeneratePDF = () => {
        const typeLabel = ADJUSTMENT_TYPES.find(t => t.value === adjustmentType)?.label || adjustmentType;

        const items = itemsToAdjust.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return null;

            const qty = quantities[item.productId] || 0;
            const uomId = uomSelections[item.productId] || product.baseUOMId;
            // PDF: Show entered quantity and UOM Name

            if (qty <= 0) return null;
            return {
                productName: item.productName,
                productCode: item.productCode,
                barcode: product.barcode, // Pass barcode
                quantity: qty,
                uom: getUomName(product, uomId), // Pass UOM Name
                isPositive: finalIsPositive
            };
        }).filter(Boolean) as any[];

        generateAdjustmentPDF({
            code: adjustmentCode || 'PENDIENTE',
            date: new Date(),
            type: typeLabel,
            reason: reason,
            userName: user ? user.fullName : 'Usuario',
            items: items
        });
    };

    if (!isOpen) return null;

    if (adjustmentCode) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20">
                <div className="bg-card w-full max-w-md rounded-xl shadow-lg border border-border p-6 animate-in zoom-in-95 duration-200">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <Check className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold">Ajuste Registrado</h2>
                        <div className="p-3 bg-muted rounded-lg border border-border">
                            <p className="text-sm text-muted-foreground">Código de Referencia</p>
                            <p className="text-xl font-mono font-bold text-primary tracking-wider">{adjustmentCode}</p>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            El inventario ha sido actualizado correctamente.
                        </p>

                        <div className="flex flex-col gap-2 pt-4">
                            <button
                                onClick={handleGeneratePDF}
                                className="w-full py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 flex items-center justify-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Descargar Comprobante PDF
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
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Nuevo Ajuste de Inventario (Lote)</h2>
                            <p className="text-sm text-muted-foreground">Ajustar {itemsToAdjust.length} productos seleccionados</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Tipo de Ajuste</label>
                                <select
                                    value={adjustmentType}
                                    onChange={(e) => setAdjustmentType(e.target.value)}
                                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary"
                                >
                                    {ADJUSTMENT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Manual Toggle for Correction/Other */}
                            {!isStrictlyNegative && (
                                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border border-border">
                                    <span className="text-sm font-medium">Operación:</span>
                                    <div className="flex bg-background rounded-lg border border-input p-1">
                                        <button
                                            type="button"
                                            onClick={() => setIsManualPositive(true)}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${isManualPositive ? 'bg-green-100 text-green-700 shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                        >
                                            + Ingreso (Sumar)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsManualPositive(false)}
                                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!isManualPositive ? 'bg-red-100 text-red-700 shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                                        >
                                            - Salida (Restar)
                                        </button>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground">
                                {currentTypeInfo?.description}
                                {finalIsPositive ?
                                    <span className="text-green-600 font-medium ml-1"> (Aumentará el stock)</span> :
                                    <span className="text-red-500 font-medium ml-1"> (Disminuirá el stock)</span>
                                }
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Motivo / Referencia</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Ej. Auditoría Mensual #05..."
                                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary min-h-[100px]"
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Producto</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stock Actual</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-40">Unidad</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-32">
                                        Cantidad
                                        {finalIsPositive ? ' a Sumar' : ' a Restar'}
                                    </th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {itemsToAdjust.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                            No hay productos seleccionados
                                        </td>
                                    </tr>
                                ) : (
                                    itemsToAdjust.map(item => {
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
                                                            className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:ring-2 focus:ring-primary"
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
                                                        max={!finalIsPositive ? stockDisplay : undefined}
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
                <div className="p-6 border-t border-border bg-muted/20 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={createBatchAdjustment.isPending || itemsToAdjust.length === 0}
                        className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {createBatchAdjustment.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <ArrowRight className="w-4 h-4" />
                        )}
                        Procesar Ajuste
                    </button>
                </div>
            </div>
        </div>
    );
}
