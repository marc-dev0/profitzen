'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/axios';
import {
    useStoreInventory,
    useLowStockProducts,
    useCreateAdjustment,
    useUpdateMinimumStock,
    useInventoryMovements,
    useTransferStockBatch,
    type StoreInventoryItem,
    type MovementsFilter
} from '@/hooks/useInventoryMovements';
import { useCreateTransfer } from '@/hooks/useTransfers'; // New Hook
import { useStores } from '@/hooks/useStores';
import { useUsers } from '@/hooks/useUsers';
import { useProducts, useProduct } from '@/hooks/useInventory';
import { DataTable, Column } from '@/components/DataTable';
import AppLayout from '@/components/layout/AppLayout';
import BatchTransferDialog from './BatchTransferDialog';
import BatchAdjustmentDialog from './BatchAdjustmentDialog';
import TransferList from './TransferList';
import AdjustmentList from './AdjustmentList';
import { Package, AlertTriangle, TrendingUp, Edit2, Check, X, Plus, Minus, History, Printer, Coins } from 'lucide-react';
import { generateAdjustmentPDF, generateTransferPDF } from '@/utils/pdfGenerator';


type AdjustmentType = 'CARGA_INICIAL' | 'MERMA' | 'DAÑADO' | 'CORRECCION' | 'VENCIDO' | 'OTRO';

const ADJUSTMENT_TYPES = [
    { value: 'CARGA_INICIAL', label: 'Carga Inicial', description: 'Registro inicial de stock al comenzar a usar el sistema' },
    { value: 'MERMA', label: 'Merma', description: 'Pérdida por manipulación, almacenamiento o transporte' },
    { value: 'DAÑADO', label: 'Producto Dañado', description: 'Producto deteriorado que no se puede vender' },
    { value: 'CORRECCION', label: 'Corrección por Conteo Físico', description: 'Ajuste basado en inventario físico' },
    { value: 'VENCIDO', label: 'Producto Vencido', description: 'Producto que superó su fecha de vencimiento' },
    { value: 'OTRO', label: 'Otro', description: 'Otro tipo de ajuste' }
];

interface UOMOption {
    id: string;
    code: string;
    name: string;
    conversionToBase: number;
}

export default function InventarioPage() {
    const router = useRouter();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();

    // Fetch base inventory and all products for merging
    // Renaming fetched inventory to avoid conflict with derived state if necessary, but here we just use it directly
    const currentStoreId = user?.currentStoreId;

    const { data: inventory, isLoading: isLoadingInventory } = useStoreInventory(currentStoreId);
    // const { data: lowStockData, isLoading: isLoadingLowStock } = useLowStockProducts(currentStoreId); // Removed unused
    const { data: products, isLoading: isLoadingProducts } = useProducts(); // Fetch all products for the tenant

    // Merge Inventory with Products to show all catalog items
    const mergedInventory = useMemo(() => {
        if (!products) return inventory || [];
        const inventoryMap = new Map((inventory || []).map(item => [item.productId, item]));

        return products.map(product => {
            const existing = inventoryMap.get(product.id);

            // Calculate base unit cost
            const defaultPurchaseUOM = (product as any).purchaseUOMs?.find((u: any) => u.isDefault) || (product as any).purchaseUOMs?.[0];
            const conversionFactor = defaultPurchaseUOM?.conversionToBase || 1;
            const unitCost = ((product as any).purchasePrice || 0) / (conversionFactor > 0 ? conversionFactor : 1);

            if (existing) {
                return {
                    ...existing,
                    barcode: (product as any).barcode || existing.barcode,
                    shortScanCode: (product as any).shortScanCode || existing.shortScanCode,
                    productName: product.name, // Ensure sync
                    productCode: product.code,
                    unitCost // Use calculated base unit cost
                };
            }

            // Create a virtual inventory item for products with no stock record
            return {
                id: `virtual-${product.id}`,
                productId: product.id,
                productCode: product.code,
                productName: product.name,
                currentStock: 0,
                minimumStock: 0,
                categoryName: product.categoryName,
                storeId: user?.currentStoreId || '',
                barcode: (product as any).barcode,
                shortScanCode: (product as any).shortScanCode,
                unitCost
            } as StoreInventoryItem;
        });
    }, [inventory, products, user?.currentStoreId]);

    const { data: lowStockProducts } = useLowStockProducts(currentStoreId);
    const createAdjustmentMutation = useCreateAdjustment();
    const updateMinimumStockMutation = useUpdateMinimumStock();

    // Derived state from merged inventory
    const totalProducts = mergedInventory.length;
    const outOfStockCount = mergedInventory.filter(i => i.currentStock === 0).length;
    // Low stock count comes from API
    const lowStockCount = (lowStockProducts?.length || 0);

    const isLoading = isLoadingInventory || isLoadingProducts;

    const [activeTab, setActiveTab] = useState('stock');
    const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<StoreInventoryItem | null>(null);
    const [editingMinStock, setEditingMinStock] = useState<string | null>(null);
    const [minStockValue, setMinStockValue] = useState('');

    const [movementsFilter, setMovementsFilter] = useState<MovementsFilter>({
        storeId: user?.currentStoreId
    });
    const { data: movements, isLoading: isLoadingMovements } = useInventoryMovements(movementsFilter);

    useEffect(() => {
        if (user?.currentStoreId && !movementsFilter.storeId) {
            setMovementsFilter(prev => ({ ...prev, storeId: user.currentStoreId }));
        }
    }, [user?.currentStoreId]); // Only run on user change or mount

    // Using explicitly imported useProduct to fetch details (fixing the lint error about useProduct vs products)
    const { data: fullProduct, isLoading: isLoadingProduct } = useProduct(selectedProduct?.productId ?? null);



    const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('CORRECCION');
    const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
    const [selectedUomId, setSelectedUomId] = useState<string>('');
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [isPositive, setIsPositive] = useState(false);

    // Transfer State
    const { data: stores } = useStores();
    const { data: users } = useUsers();
    // Using useCreateTransfer for 2-step process instead of direct stock transfer
    const createTransferMutation = useCreateTransfer();
    const transferStockBatchMutation = useTransferStockBatch();

    // Batch Transfer State
    const [selectedItems, setSelectedItems] = useState<StoreInventoryItem[]>([]);
    const [showBatchTransferDialog, setShowBatchTransferDialog] = useState(false);

    const [showTransferDialog, setShowTransferDialog] = useState(false);
    const [destinationStoreId, setDestinationStoreId] = useState('');
    const [requestedByUserId, setRequestedByUserId] = useState('');
    const [transferQuantity, setTransferQuantity] = useState('');
    const [transferReason, setTransferReason] = useState('');


    // Batch Adjustment State
    const [selectedAdjustmentItems, setSelectedAdjustmentItems] = useState<StoreInventoryItem[]>([]);
    const [showBatchAdjustmentDialog, setShowBatchAdjustmentDialog] = useState(false);

    // Clear selections when changing tabs
    useEffect(() => {
        setSelectedItems([]); // Transfer tab selection
        setSelectedAdjustmentItems([]); // Adjustment tab selection
    }, [activeTab]);

    useEffect(() => {
        if (_hasHydrated && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, _hasHydrated, router]);

    useEffect(() => {
        if (fullProduct && !selectedUomId) {
            setSelectedUomId(fullProduct.baseUOMId);
        }
    }, [fullProduct, selectedUomId]);

    // Auto-select positive/negative based on type
    useEffect(() => {
        if (adjustmentType === 'CARGA_INICIAL') {
            setIsPositive(true);
            setAdjustmentReason('Carga inicial de inventario');
        } else if (['MERMA', 'DAÑADO', 'VENCIDO'].includes(adjustmentType)) {
            setIsPositive(false);
            setAdjustmentReason('');
        }
    }, [adjustmentType]);

    const availableUOMs: UOMOption[] = useMemo(() => {
        if (!fullProduct) return [];

        const uoms: UOMOption[] = [];

        if (fullProduct.baseUOMId) {
            uoms.push({
                id: fullProduct.baseUOMId,
                code: fullProduct.baseUOMCode || 'BASE',
                name: fullProduct.baseUOMName || 'Unidad Base',
                conversionToBase: 1
            });
        }

        fullProduct.purchaseUOMs?.forEach((uom) => {
            if (!uoms.find(u => u.id === uom.uomId)) {
                uoms.push({
                    id: uom.uomId,
                    code: uom.uomCode,
                    name: uom.uomName,
                    conversionToBase: uom.conversionToBase
                });
            }
        });

        fullProduct.saleUOMs?.forEach((uom) => {
            if (!uoms.find(u => u.id === uom.uomId)) {
                uoms.push({
                    id: uom.uomId,
                    code: uom.uomCode,
                    name: uom.uomName,
                    conversionToBase: uom.conversionToBase
                });
            }
        });

        return uoms;
    }, [fullProduct]);

    const currentUOM = availableUOMs.find(u => u.id === selectedUomId);
    const conversionFactor = currentUOM?.conversionToBase || 1;

    const availableStores = useMemo(() => {
        if (!stores || !selectedProduct) return [];
        return stores.filter(s => s.id !== selectedProduct.storeId && s.isActive);
    }, [stores, selectedProduct]);

    if (!_hasHydrated || !isAuthenticated) {
        return null;
    }

    const openAdjustmentDialog = (product: StoreInventoryItem) => {
        setSelectedProduct(product);
        setAdjustmentType('CORRECCION');
        setAdjustmentQuantity('');
        setSelectedUomId('');
        setAdjustmentReason('');
        setIsPositive(false);
        setShowAdjustmentDialog(true);
    };

    const closeAdjustmentDialog = () => {
        setShowAdjustmentDialog(false);
        setSelectedProduct(null);
        setAdjustmentQuantity('');
        setSelectedUomId('');
        setAdjustmentReason('');
    };

    const startEditingMinStock = (item: StoreInventoryItem) => {
        setEditingMinStock(item.id);
        setMinStockValue(item.minimumStock.toString());
    };

    const cancelEditingMinStock = () => {
        setEditingMinStock(null);
        setMinStockValue('');
    };

    const saveMinimumStock = async (inventoryId: string) => {
        const newMinStock = parseInt(minStockValue);
        if (isNaN(newMinStock) || newMinStock < 0) {
            toast.error('Ingrese un valor válido (número mayor o igual a 0)');
            return;
        }

        try {
            await updateMinimumStockMutation.mutateAsync({
                inventoryId,
                minimumStock: newMinStock
            });
            toast.success('Stock mínimo actualizado');
            setEditingMinStock(null);
            setMinStockValue('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al actualizar stock mínimo');
        }
    };

    const handleAdjustmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        const quantityInput = parseFloat(adjustmentQuantity);
        if (isNaN(quantityInput) || quantityInput <= 0) {
            toast.error('Por favor ingrese una cantidad válida');
            return;
        }

        const totalBaseUnits = Math.round(quantityInput * conversionFactor);

        if (totalBaseUnits <= 0) {
            toast.error('La cantidad calculada en unidades base debe ser mayor a 0');
            return;
        }

        if (!adjustmentReason.trim() || adjustmentReason.trim().length < 20) {
            toast.error('Por favor ingrese una justificación detallada (mínimo 20 caracteres)');
            return;
        }

        try {
            await createAdjustmentMutation.mutateAsync({
                storeInventoryId: selectedProduct.id,
                adjustmentType: adjustmentType,
                quantity: totalBaseUnits,
                isPositive: isPositive,
                reason: adjustmentReason.trim(),
                uomId: selectedUomId || undefined,
                uomCode: currentUOM?.code || undefined,
                originalQuantity: Math.round(quantityInput),
                conversionFactor: conversionFactor > 1 ? conversionFactor : undefined
            });

            toast.success('Ajuste de inventario registrado exitosamente');
            closeAdjustmentDialog();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al registrar el ajuste');
        }
    };

    const openTransferDialog = (product: StoreInventoryItem) => {
        setSelectedProduct(product);
        setDestinationStoreId('');
        setTransferQuantity('');
        setSelectedUomId('');
        setTransferReason('');
        setShowTransferDialog(true);
    };

    const closeTransferDialog = () => {
        setShowTransferDialog(false);
        setSelectedProduct(null);
        setDestinationStoreId('');
        setTransferQuantity('');
        setSelectedUomId('');
        setTransferReason('');
    };

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;

        if (!destinationStoreId) {
            toast.error('Seleccione una tienda de destino');
            return;
        }

        if (selectedProduct.storeId === destinationStoreId) { // Note: StoreInventoryItem usually contains StoreId. Check definition.
            // Actually StoreInventoryItem has `storeId`.
            toast.error('La tienda de destino debe ser diferente a la origen');
            return;
        }

        const quantityInput = parseFloat(transferQuantity);
        if (isNaN(quantityInput) || quantityInput <= 0) {
            toast.error('Ingrese una cantidad válida');
            return;
        }

        const totalBaseUnits = Math.round(quantityInput * conversionFactor);

        if (totalBaseUnits > selectedProduct.currentStock) {
            toast.error(`Stock insuficiente. Disponible: ${selectedProduct.currentStock}`);
            return;
        }

        if (!requestedByUserId) {
            toast.error('Seleccione quien solicita la transferencia');
            return;
        }

        if (!transferReason.trim()) {
            toast.error('Ingrese un motivo');
            return;
        }

        try {
            await createTransferMutation.mutateAsync({
                originStoreId: selectedProduct.storeId,
                destinationStoreId: destinationStoreId,
                requestedByUserId: requestedByUserId,
                notes: transferReason.trim(),
                items: [{
                    productId: selectedProduct.productId,
                    quantity: totalBaseUnits
                }]
            });

            toast.success('Transferencia creada exitosamente (En Tránsito)');
            closeTransferDialog();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al crear transferencia');
        }
    };

    const getTotalProducts = () => mergedInventory.length || 0;
    const getLowStockCount = () => mergedInventory.filter(i => i.currentStock <= i.minimumStock).length || 0;
    const getOutOfStockCount = () => mergedInventory.filter(i => i.currentStock === 0).length || 0;
    const getTotalValue = () => mergedInventory.reduce((sum, item) => sum + (item.currentStock * (item.unitCost || 0)), 0);

    // Stock View Columns
    const stockColumns: Column<StoreInventoryItem>[] = [
        {
            key: 'productCode',
            header: 'Código',
            sortable: true,
            render: (item) => (
                <span className="font-mono text-sm font-medium text-foreground">
                    {item.productCode}
                </span>
            )
        },
        {
            key: 'productName',
            header: 'Producto',
            sortable: true,
            render: (item) => (
                <div>
                    <p className="text-sm font-medium text-foreground">{item.productName}</p>
                    {item.categoryName && (
                        <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                    )}
                </div>
            )
        },
        {
            key: 'currentStock',
            header: 'Stock Actual',
            sortable: true,
            render: (item) => {
                const isLow = item.currentStock <= item.minimumStock && item.currentStock > 0;
                const isOut = item.currentStock === 0;
                return (
                    <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isOut ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'}`}>
                            {item.currentStock}
                        </span>
                        {(isLow || isOut) && <AlertTriangle className="w-4 h-4 text-red-600" />}
                    </div>
                );
            }
        },
        {
            key: 'minimumStock',
            header: 'Stock Mínimo',
            sortable: true,
            render: (item) => (
                editingMinStock === item.id ? (
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            value={minStockValue}
                            onChange={(e) => setMinStockValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    saveMinimumStock(item.id);
                                } else if (e.key === 'Escape') {
                                    cancelEditingMinStock();
                                }
                            }}
                            className="w-20 px-2 py-1 text-sm border border-input rounded focus:ring-2 focus:ring-primary text-foreground bg-background"
                            min="0"
                            autoFocus
                            onFocus={(e) => e.target.select()}
                        />
                        <button
                            onClick={() => saveMinimumStock(item.id)}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Guardar"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                        <button
                            onClick={cancelEditingMinStock}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Cancelar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => startEditingMinStock(item)}
                        className="text-sm text-muted-foreground hover:text-primary hover:underline flex items-center gap-1"
                        title="Click para editar"
                    >
                        {item.minimumStock}
                        <Edit2 className="w-3 h-3" />
                    </button>
                )
            )
        },
        {
            key: 'unitCost',
            header: 'Costo Unit.',
            sortable: true,
            render: (item) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                        S/ {(item.unitCost || 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Total: S/ {((item.unitCost || 0) * item.currentStock).toFixed(2)}
                    </span>
                </div>
            )
        },
        {
            key: 'status',
            header: 'Estado',
            render: (item) => {
                const isLow = item.currentStock <= item.minimumStock;
                return isLow ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        Stock Bajo
                    </span>
                ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        Normal
                    </span>
                );
            }
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (item) => (
                <button
                    onClick={() => openTransferDialog(item)}
                    className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                >
                    <TrendingUp className="w-4 h-4" />
                    Transferir
                </button>
            )
        }
    ];

    // Adjustment View Columns
    const adjustmentColumns: Column<StoreInventoryItem>[] = [
        {
            key: 'productCode',
            header: 'Código',
            sortable: true,
            render: (item) => (
                <span className="font-mono text-sm font-medium text-foreground">
                    {item.productCode}
                </span>
            )
        },
        {
            key: 'productName',
            header: 'Producto',
            sortable: true,
            render: (item) => (
                <span className="text-sm font-medium text-foreground">{item.productName}</span>
            )
        },
        {
            key: 'currentStock',
            header: 'Stock Actual',
            sortable: true,
            render: (item) => (
                <span className="text-sm font-semibold text-foreground">{item.currentStock}</span>
            )
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (item) => (
                <button
                    onClick={() => openAdjustmentDialog(item)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Registrar Ajuste
                </button>
            )
        }
    ];

    // Movements Columns
    const movementColumns: Column<any>[] = [
        {
            key: 'movementDate',
            header: 'Fecha/Hora',
            sortable: true,
            render: (movement) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(movement.movementDate).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </span>
            )
        },
        {
            key: 'productName',
            header: 'Producto',
            sortable: true,
            render: (movement) => (
                <div>
                    <p className="text-sm font-medium text-foreground">{movement.productName}</p>
                    <p className="text-xs text-muted-foreground">{movement.productCode}</p>
                </div>
            )
        },
        {
            key: 'movementType',
            header: 'Tipo',
            sortable: true,
            render: (movement) => {
                const isPositive = movement.quantity > 0;
                return (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {movement.movementType}
                    </span>
                );
            }
        },
        {
            key: 'uomCode',
            header: 'UOM',
            render: (movement) => (
                <span className="text-sm text-muted-foreground">{movement.uomCode || '-'}</span>
            )
        },
        {
            key: 'quantity',
            header: 'Cantidad',
            sortable: true,
            render: (movement) => {
                const isPositive = movement.quantity > 0;
                const detail = movement.originalQuantity && movement.conversionFactor && movement.conversionFactor > 1
                    ? ` (${movement.originalQuantity} x ${movement.conversionFactor})`
                    : '';
                return (
                    <div>
                        <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{movement.quantity}
                        </span>
                        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
                    </div>
                );
            }
        },
        {
            key: 'reason',
            header: 'Motivo',
            render: (movement) => {
                // Check for Venta pattern (Venta #number)
                const ventaMatch = movement.reason && movement.reason.match(/Venta #([A-Za-z0-9-]+)/);

                if (ventaMatch) {
                    const saleNumber = ventaMatch[1];
                    return (
                        <div className="flex flex-col">
                            <span className="text-sm text-foreground max-w-xs truncate block" title={movement.reason}>
                                {movement.reason}
                            </span>
                            <Link
                                href={`/sales?q=${saleNumber}`}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5 font-medium"
                                target="_blank"
                            >
                                Ver Detalle
                            </Link>
                        </div>
                    );
                }

                // Check for Transfer pattern
                if (movement.movementType === 'Transferencia' || movement.reason?.includes('Transferencia')) {
                    // Extract the core reason if possible
                    // Format: "Transferencia Recibida de Origen: Reason"
                    const parts = movement.reason.split(': ');
                    const title = parts[0];
                    const detail = parts.length > 1 ? parts.slice(1).join(': ') : '';

                    return (
                        <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{title}</span>
                            {detail && (
                                <span className="text-xs text-muted-foreground mt-0.5" title={detail}>
                                    {detail}
                                </span>
                            )}
                        </div>
                    );
                }

                return (
                    <span className="text-sm text-muted-foreground max-w-xs truncate block" title={movement.reason}>
                        {movement.reason || '-'}
                    </span>
                );
            }
        },
        {
            key: 'actions',
            header: 'Acciones',
            render: (movement) => {
                // Check Batch Adjustment
                const adjMatch = movement.reason?.match(/\((ADJ-[A-Z0-9-]+)\)/);
                if (adjMatch && movement.movementType !== 'Transferencia') {
                    return (
                        <button
                            onClick={() => handleReprintAdjustment(adjMatch[1], movement)}
                            className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                            title="Imprimir Comprobante de Lote"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                    );
                }

                // Check Transfer
                const trfMatch = movement.reason?.match(/\((TRF-[A-Z0-9-]+)\)/);
                if (trfMatch) {
                    return (
                        <button
                            onClick={() => handleReprintTransfer(trfMatch[1], movement)}
                            className="p-1 text-slate-500 hover:text-purple-600 transition-colors"
                            title="Imprimir Guía de Transferencia"
                        >
                            <Printer className="w-4 h-4" />
                        </button>
                    );
                }

                return null;
            }
        }
    ];

    const handleReprintTransfer = async (code: string, currentMovement: any) => {
        try {
            // Attempt to fetch fresh transfer data using the code
            const response = await apiClient.get<any>(`/api/inventory/transfers/number/${code}`);
            const foundTransfer = response.data;

            if (foundTransfer) {
                // If found, use the official full data which includes status and names
                const items = foundTransfer.details?.map((d: any) => {
                    const productInfo = mergedInventory?.find(i => i.productId === d.productId);
                    const product = products?.find(p => p.id === d.productId);
                    return {
                        productName: d.productName || productInfo?.productName || 'Producto sin nombre',
                        productCode: d.productCode || productInfo?.productCode || 'S/C',
                        quantity: d.quantity,
                        uom: product?.baseUOMName || 'Unidades',
                        isPositive: true
                    };
                }) || [];

                generateTransferPDF({
                    code: foundTransfer.transferNumber,
                    date: new Date(foundTransfer.createdAt),
                    sourceStore: foundTransfer.originStoreName || 'Almacén Origen',
                    destinationStore: foundTransfer.destinationStoreName || 'Almacén Destino',
                    reason: foundTransfer.notes || '',
                    items: items.length > 0 ? items : [{ // Fallback if details empty
                        productName: currentMovement.productName,
                        productCode: currentMovement.productCode,
                        quantity: Math.abs(currentMovement.quantity),
                        uom: products?.find(p => p.id === currentMovement.storeInventoryId || p.code === currentMovement.productCode)?.baseUOMName || 'Unidades', // Try to find product
                        isPositive: true
                    }],
                    requesterName: foundTransfer.requestedByUserName || (users?.find(u => u.id === foundTransfer.requestedByUserId)?.firstName + ' ' + users?.find(u => u.id === foundTransfer.requestedByUserId)?.lastName) || 'Usuario Desconocido',
                    receiverName: foundTransfer.receivedByUserName || (foundTransfer.receivedByUserId ? (users?.find(u => u.id === foundTransfer.receivedByUserId)?.firstName + ' ' + users?.find(u => u.id === foundTransfer.receivedByUserId)?.lastName) : undefined),
                    isPending: foundTransfer.status === 0
                });
                return;
            }
        } catch (e) {
            console.error("Could not fetch transfer details, using local data", e);
        }

        // FALLBACK: Local data from movement row (Original logic)
        const batchMovements = movements?.filter(m => m.reason?.includes(code)) || [currentMovement];

        // Try to guess context from reason text
        // Format: "Transferencia Enviada (CODE): Reason"
        // Format: "Transferencia Recibida (CODE): Reason"

        const isSent = currentMovement.reason?.includes('Enviada');
        const currentStoreName = stores?.find(s => s.id === user?.currentStoreId)?.name || 'Mi Tienda';

        const reasonMatch = currentMovement.reason?.match(/\): (.*)/);
        const reasonText = reasonMatch ? reasonMatch[1] : 'Transferencia';

        // Use the user name from the movement log as the person who performed the action.
        // If sent ("Enviada"), the user is the requester.
        // If received ("Recibida"), the user is the receiver.
        const actionUser = currentMovement.userName || user?.fullName || 'Usuario Desconocido';

        const items = batchMovements.map(m => ({
            productName: m.productName,
            productCode: m.productCode,
            quantity: Math.abs(m.quantity),
            isPositive: m.quantity > 0
        }));

        generateTransferPDF({
            code: code,
            date: new Date(currentMovement.movementDate),
            sourceStore: isSent ? currentStoreName : 'Almacén Origen',
            destinationStore: isSent ? 'Almacén Destino' : currentStoreName,
            reason: reasonText,
            items: items,
            requesterName: isSent ? actionUser : undefined,
            receiverName: !isSent ? actionUser : undefined,
            isPending: isSent // Sent = In Transit/Pending; Recibida = Completed.
        });
    };

    const handleReprintAdjustment = (code: string, currentMovement: any) => {
        // Find all movements from the same batch currently loaded
        // Note: This only finds loaded movements. If filtered by date, might miss some.
        // Ideally we fetch by code, but for now this is better than nothing.
        const batchMovements = movements?.filter(m => m.reason?.includes(code)) || [currentMovement];

        const typeMatch = currentMovement.reason?.split(' - ')[1] || 'Ajuste';
        const reasonMatch = currentMovement.reason?.match(/Lote: (.*?) \(/);
        const reasonText = reasonMatch ? reasonMatch[1] : 'Sin referencia';

        const items = batchMovements.map(m => ({
            productName: m.productName,
            productCode: m.productCode,
            quantity: m.quantity,
            isPositive: m.quantity > 0
        }));

        generateAdjustmentPDF({
            code: code,
            date: new Date(currentMovement.movementDate),
            type: typeMatch,
            reason: reasonText,
            items: items
        });
    };

    return (
        <AppLayout>
            <div className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Gestión de Inventario</h1>
                        <p className="text-muted-foreground mt-1">Control y administración de stock</p>
                    </div>
                    <Link
                        href="/inventario/carga-inicial"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-sm"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Carga Inicial de Stock
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Productos</p>
                                <p className="text-2xl font-bold text-foreground">{getTotalProducts()}</p>
                            </div>
                            <Package className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                                <p className="text-2xl font-bold text-yellow-600">{getLowStockCount()}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-yellow-600" />
                        </div>
                    </div>
                    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Sin Stock</p>
                                <p className="text-2xl font-bold text-red-600">{getOutOfStockCount()}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                    </div>
                    <div className="bg-emerald-600 rounded-xl p-4 shadow-sm border border-emerald-500 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm opacity-90">Valor Total Almacén</p>
                                <p className="text-2xl font-bold">S/ {getTotalValue().toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <Coins className="w-8 h-8 opacity-80" />
                        </div>
                    </div>
                </div>

                {/* Low Stock Alert */}
                {lowStockProducts && lowStockProducts.length > 0 && (
                    <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                                <h3 className="text-sm font-semibold text-yellow-800">
                                    Stock Bajo - {lowStockProducts.length} producto(s)
                                </h3>
                                <ul className="mt-2 text-sm text-yellow-700 list-disc pl-5 space-y-1">
                                    {lowStockProducts.slice(0, 3).map((item) => (
                                        <li key={item.id}>
                                            {item.productName} - Stock actual: {item.currentStock} (Mínimo: {item.minimumStock})
                                        </li>
                                    ))}
                                    {lowStockProducts.length > 3 && (
                                        <li>Y {lowStockProducts.length - 3} producto(s) más...</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="border-b border-border">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('stock')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stock' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            Vista de Stock
                        </button>
                        <button
                            onClick={() => setActiveTab('adjustments')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'adjustments' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            Ajustes de Inventario
                        </button>
                        <button
                            onClick={() => setActiveTab('movements')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'movements' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            Historial de Movimientos
                        </button>
                        <button
                            onClick={() => setActiveTab('transfers')}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transfers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            Transferencias
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    {/* Transfers Tab */}
                    {activeTab === 'transfers' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Gestión de Transferencias</h2>
                                <p className="text-sm text-muted-foreground">Administre el envío y recepción de mercadería entre tiendas.</p>
                            </div>
                            <TransferList products={products || []} />
                        </div>
                    )}
                    {/* Stock Tab */}
                    {activeTab === 'stock' && (
                        <>
                            {selectedItems.length > 0 && (
                                <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                            {selectedItems.length}
                                        </div>
                                        <span className="text-sm font-medium text-foreground">
                                            Productos seleccionados
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedItems([])}
                                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => setShowBatchTransferDialog(true)}
                                            className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                            Transferir Seleccionados
                                        </button>
                                    </div>
                                </div>
                            )}

                            <DataTable
                                data={mergedInventory}
                                columns={stockColumns}
                                keyExtractor={(item) => item.id}
                                loading={isLoading}
                                emptyMessage="No hay productos en el inventario"
                                searchable={true}
                                searchPlaceholder="Buscar por código o nombre..."
                                searchKeys={['productCode', 'productName', 'categoryName', 'barcode', 'shortScanCode']}
                                defaultRowsPerPage={25}
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                selectedItems={selectedItems}
                                onSelectionChange={setSelectedItems}
                            />
                        </>
                    )}

                    {/* Adjustments Tab */}
                    {activeTab === 'adjustments' && (
                        <>
                            {selectedAdjustmentItems.length > 0 && (
                                <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                            {selectedAdjustmentItems.length}
                                        </div>
                                        <span className="text-sm font-medium text-foreground">
                                            Productos seleccionados
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedAdjustmentItems([])}
                                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={() => setShowBatchAdjustmentDialog(true)}
                                            className="px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                            Ajustar Seleccionados
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <h3 className="text-sm font-semibold text-blue-900">
                                            Ajustes de Inventario
                                        </h3>
                                        <p className="mt-1 text-sm text-blue-700">
                                            Use esta sección solo para ajustes por: merma, productos dañados, correcciones de conteo físico o productos vencidos.
                                            El stock aumenta con Compras y disminuye con Ventas automáticamente.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <DataTable
                                data={mergedInventory}
                                columns={adjustmentColumns}
                                keyExtractor={(item) => item.id}
                                loading={isLoading}
                                emptyMessage="No hay productos en el inventario"
                                searchable={true}
                                searchPlaceholder="Buscar producto para ajustar..."
                                searchKeys={['productCode', 'productName', 'barcode', 'shortScanCode']}
                                defaultRowsPerPage={10}
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                selectedItems={selectedAdjustmentItems}
                                onSelectionChange={setSelectedAdjustmentItems}
                            />

                            <div className="mt-8 pt-8 border-t border-border">
                                <AdjustmentList />
                            </div>
                        </>
                    )}

                    {/* Movements Tab */}
                    {activeTab === 'movements' && (
                        <>
                            <div className="mb-6 flex flex-wrap gap-4 items-end bg-card p-4 rounded-lg border border-border">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Filtrar por Tienda</label>
                                    <select
                                        value={movementsFilter.storeId || ''}
                                        onChange={(e) => setMovementsFilter(f => ({ ...f, storeId: e.target.value || undefined }))}
                                        className="h-10 px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground min-w-[200px]"
                                    >
                                        <option value="">Todas las tiendas</option>
                                        {stores?.map((store) => (
                                            <option key={store.id} value={store.id}>
                                                {store.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Desde</label>
                                    <input
                                        type="date"
                                        value={movementsFilter.fromDate || ''}
                                        onChange={(e) => setMovementsFilter(f => ({ ...f, fromDate: e.target.value || undefined }))}
                                        className="h-10 px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Hasta</label>
                                    <input
                                        type="date"
                                        value={movementsFilter.toDate || ''}
                                        onChange={(e) => setMovementsFilter(f => ({ ...f, toDate: e.target.value || undefined }))}
                                        className="h-10 px-3 py-2 bg-background border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setMovementsFilter({ storeId: user?.currentStoreId })} // Reset to current store
                                        className="h-10 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                                        title="Restablecer a mi tienda actual"
                                    >
                                        Restablecer
                                    </button>
                                    <button
                                        onClick={() => setMovementsFilter({})} // Clear all filters (All stores)
                                        className="h-10 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                                        title="Ver todo (Todas las tiendas)"
                                    >
                                        Ver Todo
                                    </button>
                                </div>
                            </div>

                            <DataTable
                                data={movements || []}
                                columns={movementColumns}
                                keyExtractor={(movement) => movement.id}
                                loading={isLoadingMovements}
                                emptyMessage="No se encontraron movimientos de inventario"
                                searchable={true}
                                searchPlaceholder="Buscar por producto..."
                                searchKeys={['productName', 'productCode', 'barcode', 'shortScanCode']}
                                defaultRowsPerPage={25}
                                rowsPerPageOptions={[10, 25, 50, 100]}
                            />
                        </>
                    )}
                </div>
            </div>


            {/* Adjustment Dialog */}
            {
                showAdjustmentDialog && selectedProduct && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
                            <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
                                <h2 className="text-xl font-bold text-primary">Registrar Ajuste de Inventario</h2>
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="font-semibold">Producto:</span> {selectedProduct.productName}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Código:</span> {selectedProduct.productCode}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Stock Actual:</span> {selectedProduct.currentStock} unidades
                                        </div>
                                        <div>
                                            <span className="font-semibold">Stock Mínimo:</span> {selectedProduct.minimumStock} unidades
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleAdjustmentSubmit} className="p-6 space-y-4">
                                {isLoadingProduct ? (
                                    <div className="flex justify-center py-4">
                                        <span className="text-blue-600">Cargando unidades de medida...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Tipo de Ajuste *
                                            </label>
                                            <select
                                                value={adjustmentType}
                                                onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
                                                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground bg-background"
                                            >
                                                {ADJUSTMENT_TYPES.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {ADJUSTMENT_TYPES.find(t => t.value === adjustmentType)?.description}
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Tipo de Movimiento *
                                            </label>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={!isPositive}
                                                        onChange={() => setIsPositive(false)}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-sm text-foreground">Disminuir Stock (Negativo)</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        checked={isPositive}
                                                        onChange={() => setIsPositive(true)}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <span className="text-sm text-foreground">Aumentar Stock (Positivo)</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Unidad de Medida *
                                                </label>
                                                <select
                                                    value={selectedUomId}
                                                    onChange={(e) => setSelectedUomId(e.target.value)}
                                                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground bg-background"
                                                    required
                                                >
                                                    {availableUOMs.map((uom) => (
                                                        <option key={uom.id} value={uom.id}>
                                                            {uom.name} ({uom.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Cantidad *
                                                </label>
                                                <input
                                                    type="number"
                                                    value={adjustmentQuantity}
                                                    onChange={(e) => setAdjustmentQuantity(e.target.value)}
                                                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground bg-background"
                                                    min="0.01"
                                                    step="0.01"
                                                    required
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        {conversionFactor > 1 && adjustmentQuantity && (
                                            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                                                <strong>Conversión:</strong> {adjustmentQuantity} {currentUOM?.code} = {Math.round(parseFloat(adjustmentQuantity) * conversionFactor)} unidades base
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                                Justificación * (mínimo 20 caracteres)
                                            </label>
                                            <textarea
                                                value={adjustmentReason}
                                                onChange={(e) => setAdjustmentReason(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                                        e.preventDefault();
                                                        handleAdjustmentSubmit(e as any);
                                                    }
                                                }}
                                                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary text-foreground bg-background"
                                                rows={3}
                                                required
                                                minLength={20}
                                            />
                                            <div className="flex justify-between items-start mt-1 text-xs text-muted-foreground">
                                                <span>{adjustmentReason.length}/20 caracteres</span>
                                                <span className="text-blue-600 font-medium">Ctrl + Enter para guardar</span>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-3 pt-4 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={closeAdjustmentDialog}
                                        className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createAdjustmentMutation.isPending || isLoadingProduct}
                                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {createAdjustmentMutation.isPending ? 'Guardando...' : 'Registrar Ajuste'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Transfer Dialog */}
            {
                showTransferDialog && selectedProduct && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border">
                            <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
                                <h2 className="text-xl font-bold text-purple-700">Transferir Mercadería</h2>
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="font-semibold">Producto:</span> {selectedProduct.productName}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Código:</span> {selectedProduct.productCode}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Origen:</span> {stores?.find(s => s.id === selectedProduct.storeId)?.name || 'Tienda Actual'}
                                        </div>
                                        <div>
                                            <span className="font-semibold">Disponible:</span> {selectedProduct.currentStock} unidades
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
                                {isLoadingProduct ? (
                                    <div className="flex justify-center py-4">
                                        <span className="text-blue-600">Cargando unidades de medida...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Tienda de Destino *
                                            </label>
                                            <select
                                                value={destinationStoreId}
                                                onChange={(e) => setDestinationStoreId(e.target.value)}
                                                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-purple-500 text-foreground bg-background"
                                                required
                                                disabled={availableStores.length === 0}
                                            >
                                                <option value="">Seleccione destino...</option>
                                                {availableStores.map((store) => (
                                                    <option key={store.id} value={store.id}>
                                                        {store.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {availableStores.length === 0 && (
                                                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                                                    <p className="flex items-center gap-2">
                                                        <span className="text-xl">⚠️</span>
                                                        <strong>No hay otras sucursales disponibles.</strong>
                                                    </p>
                                                    <p className="mt-1 ml-7">
                                                        Para realizar una transferencia necesita al menos dos sucursales.
                                                        <Link href="/stores" className="text-blue-600 hover:underline font-medium ml-1">
                                                            Haga clic aquí para crear una nueva sucursal.
                                                        </Link>
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Unidad de Medida *
                                                </label>
                                                <select
                                                    value={selectedUomId}
                                                    onChange={(e) => setSelectedUomId(e.target.value)}
                                                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-purple-500 text-foreground bg-background"
                                                    required
                                                >
                                                    {availableUOMs.map((uom) => (
                                                        <option key={uom.id} value={uom.id}>
                                                            {uom.name} ({uom.code})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Cantidad a Transferir *
                                                </label>
                                                <input
                                                    type="number"
                                                    value={transferQuantity}
                                                    onChange={(e) => setTransferQuantity(e.target.value)}
                                                    className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-purple-500 text-foreground bg-background"
                                                    min="0.01"
                                                    step="0.01"
                                                    required
                                                    autoFocus
                                                />
                                            </div>
                                        </div>

                                        {conversionFactor > 1 && transferQuantity && (
                                            <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-700">
                                                <strong>Conversión:</strong> {transferQuantity} {currentUOM?.code} = {Math.round(parseFloat(transferQuantity) * conversionFactor)} unidades base
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Solicitado Por *
                                            </label>
                                            <select
                                                value={requestedByUserId}
                                                onChange={(e) => setRequestedByUserId(e.target.value)}
                                                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-purple-500 text-foreground bg-background"
                                                required
                                            >
                                                <option value="">Seleccione empleado...</option>
                                                {users?.filter(u => u.isActive).map((u) => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.firstName} {u.lastName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Motivo / Nota *
                                            </label>
                                            <textarea
                                                value={transferReason}
                                                onChange={(e) => setTransferReason(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleTransferSubmit(e as unknown as React.FormEvent);
                                                    }
                                                }}
                                                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-purple-500 text-foreground bg-background"
                                                rows={3}
                                                required
                                                placeholder="Ej: Reabastecimiento de sucursal centro"
                                            />
                                            <p className="mt-1 text-xs text-muted-foreground flex justify-end">
                                                Tip: Presiona <kbd className="mx-1 px-1 py-0.5 bg-muted rounded border border-border font-mono text-xs">Ctrl</kbd> + <kbd className="mx-1 px-1 py-0.5 bg-muted rounded border border-border font-mono text-xs">Enter</kbd> para guardar
                                            </p>
                                        </div>
                                    </>
                                )}

                                <div className="flex gap-3 pt-4 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={closeTransferDialog}
                                        className="flex-1 px-4 py-2 border border-input text-foreground rounded-lg hover:bg-muted transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createTransferMutation.isPending || isLoadingProduct}
                                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                                    >
                                        {createTransferMutation.isPending ? 'Procesando...' : 'Transferir Stock'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {showBatchTransferDialog && (
                <BatchTransferDialog
                    isOpen={showBatchTransferDialog}
                    onClose={() => setShowBatchTransferDialog(false)}
                    selectedItems={selectedItems}
                    onClearSelection={() => setSelectedItems([])}
                    products={products || []}
                />
            )}

            <BatchAdjustmentDialog
                isOpen={showBatchAdjustmentDialog}
                onClose={() => setShowBatchAdjustmentDialog(false)}
                selectedItems={selectedAdjustmentItems}
                onClearSelection={() => setSelectedAdjustmentItems([])}
                products={products || []}
            />

        </AppLayout>
    );
}

