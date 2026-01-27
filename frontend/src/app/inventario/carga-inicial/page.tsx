'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useProducts } from '@/hooks/useInventory';
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers';
import { useCreatePurchase, useMarkPurchaseAsReceived } from '@/hooks/usePurchases';
import { useStoreInventory } from '@/hooks/useInventoryMovements';
import AppLayout from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { Search, Save, Trash2, Plus, ArrowLeft, Package, DollarSign, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { CreatePurchaseDetailRequest } from '@/types/inventory';

interface AdjustmentItem {
    id: string; // Product ID
    productCode: string;
    productName: string;
    currentStock: number;
    quantityToAdd: number;
    unitCost: number;
    uomId: string;
    uomCode: string;
    availableUOMs: { uomId: string; uomCode: string; uomName: string; conversionToBase: number }[];
}

export default function InitialStockLoadPage() {
    const router = useRouter();
    const { isAuthenticated, _hasHydrated, user } = useAuthStore();

    // Data Hooks
    const { data: products, isLoading: isLoadingProducts } = useProducts(user?.currentStoreId);
    const { data: suppliers } = useSuppliers();
    const { data: inventory } = useStoreInventory(); // To show current stock context

    // Mutation Hooks
    const createSupplierMutation = useCreateSupplier();
    const createPurchaseMutation = useCreatePurchase();
    const markReceivedMutation = useMarkPurchaseAsReceived();

    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState<AdjustmentItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Initial checks
    useEffect(() => {
        if (_hasHydrated && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, _hasHydrated, router]);

    // Helpers to get current stock from StoreInventory
    const getCurrentStock = (productId: string) => {
        const item = inventory?.find(i => i.productId === productId);
        return item ? item.currentStock : 0;
    };

    // Filter Logic
    const filteredProducts = useMemo(() => {
        if (!searchTerm || !products) return [];
        const term = searchTerm.toLowerCase();
        return products.filter(product =>
            product.name.toLowerCase().includes(term) ||
            product.code.toLowerCase().includes(term) ||
            product.barcode?.toLowerCase().includes(term) ||
            product.shortScanCode?.toLowerCase().includes(term)
        ).slice(0, 10);
    }, [searchTerm, products]);

    const [selectedIndex, setSelectedIndex] = useState(0);

    // Reset selected index when search changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchTerm]);

    // Keyboard Navigation for Search Results
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!searchTerm || filteredProducts.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => {
                const newIndex = prev < filteredProducts.length - 1 ? prev + 1 : prev;
                // Scroll into view logic
                const element = document.getElementById(`product-result-${newIndex}`);
                if (element) {
                    element.scrollIntoView({ block: 'nearest' });
                }
                return newIndex;
            });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => {
                const newIndex = prev > 0 ? prev - 1 : prev;
                const element = document.getElementById(`product-result-${newIndex}`);
                if (element) {
                    element.scrollIntoView({ block: 'nearest' });
                }
                return newIndex;
            });
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredProducts[selectedIndex]) {
                addToBatch(filteredProducts[selectedIndex]);
            }
        }
    };

    // Global Shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // F9 to Save (Standard across forms)
            if (e.key === 'F9') {
                e.preventDefault();
                handleSaveClick();
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [items]); // Re-bind when items change so handleSaveClick has fresh state

    // Item Input Validations & Navigation
    const handleItemKeyDown = (e: React.KeyboardEvent, itemId: string, field: 'uom' | 'quantity' | 'cost') => {
        // Allow F9 to bubble up
        if (e.key === 'F9') return;

        if (e.key === 'Enter' || e.key === 'ArrowRight') {
            e.preventDefault();

            // Define focus flow: UOM -> Quantity -> Cost -> Next Item UOM (or New Search)
            if (field === 'uom') {
                // Focus Quantity
                const qtyInput = document.getElementById(`qty-${itemId}`);
                qtyInput?.focus();
            } else if (field === 'quantity') {
                // Focus Cost
                const costInput = document.getElementById(`cost-${itemId}`);
                costInput?.focus();
            } else if (field === 'cost') {
                // Try to focus next item's UOM, or back to search input
                const currentIndex = items.findIndex(i => i.id === itemId);
                if (currentIndex < items.length - 1) {
                    const nextItem = items[currentIndex + 1];
                    const nextUom = document.getElementById(`uom-${nextItem.id}`);
                    nextUom?.focus();
                } else {
                    // Focus back to search for rapid entry
                    searchInputRef.current?.focus();
                }
            }
        } else if (e.key === 'ArrowLeft') {
            // Optional: Backwards navigation
            if (field === 'cost') {
                document.getElementById(`qty-${itemId}`)?.focus();
            } else if (field === 'quantity') {
                document.getElementById(`uom-${itemId}`)?.focus();
            }
        }
    };

    const addToBatch = (product: any) => {
        if (items.find(i => i.id === product.id)) {
            toast.info('El producto ya está en la lista');
            setSearchTerm('');
            searchInputRef.current?.focus();
            return;
        }

        const currentQty = getCurrentStock(product.id);

        if (currentQty > 0) {
            toast.error(`El producto '${product.name}' ya tiene stock (${currentQty}). Use el módulo de Compras para reposición.`);
            setSearchTerm('');
            searchInputRef.current?.focus();
            return;
        }

        if (product.purchasePrice && product.purchasePrice > 0) {
            toast.warning(`El producto '${product.name}' ya tiene un costo registrado (S/ ${product.purchasePrice}). Puede consultarlo en el Catálogo de Productos o usar Compras para reponer.`);
            setSearchTerm('');
            searchInputRef.current?.focus();
            return;
        }

        const uoms: AdjustmentItem['availableUOMs'] = [];
        if (product.baseUOMId) {
            uoms.push({
                uomId: product.baseUOMId,
                uomCode: product.baseUOMCode || 'UND',
                uomName: product.baseUOMName || 'Unidad',
                conversionToBase: 1
            });
        }
        product.purchaseUOMs?.forEach((u: any) => {
            if (!uoms.find(x => x.uomId === u.uomId)) {
                uoms.push({
                    uomId: u.uomId,
                    uomCode: u.uomCode,
                    uomName: u.uomName,
                    conversionToBase: u.conversionToBase
                });
            }
        });

        const defaultPurchaseUOM = product.purchaseUOMs?.find((u: any) => u.isDefault);

        const purchaseUOMById = product.purchaseUOMId ? uoms.find(u => u.uomId === product.purchaseUOMId) : undefined;

        const targetDefaultUOM = defaultPurchaseUOM
            ? uoms.find(u => u.uomId === defaultPurchaseUOM.uomId)
            : (purchaseUOMById || uoms[0]);

        const defaultUOM = targetDefaultUOM || uoms[0];

        const newItem: AdjustmentItem = {
            id: product.id,
            productCode: product.code,
            productName: product.name,
            currentStock: currentQty,
            quantityToAdd: 0,
            unitCost: product.purchasePrice || 0,
            uomId: defaultUOM?.uomId || '',
            uomCode: defaultUOM?.uomCode || 'UND',
            availableUOMs: uoms
        };

        setItems([newItem, ...items]);
        setSearchTerm('');
        searchInputRef.current?.focus();
    };

    const removeFromBatch = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: 'quantityToAdd' | 'unitCost' | 'uomId', value: string) => {
        setItems(items.map(i => {
            if (i.id !== id) return i;

            if (field === 'uomId') {
                const selectedUOM = i.availableUOMs.find(u => u.uomId === value);
                return {
                    ...i,
                    uomId: value,
                    uomCode: selectedUOM?.uomCode || i.uomCode
                };
            }

            const val = parseFloat(value);
            return {
                ...i,
                [field]: isNaN(val) ? 0 : val
            };
        }));
    };

    const totalCapital = items.reduce((sum, item) => sum + (item.quantityToAdd * item.unitCost), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantityToAdd, 0);

    const handleSaveClick = () => {
        if (items.length === 0) return;

        const invalidItems = items.filter(i => i.quantityToAdd <= 0);
        if (invalidItems.length > 0) {
            toast.warning(`Hay ${invalidItems.length} productos con cantidad 0 o inválida.`);
            return;
        }

        setShowConfirmDialog(true);
    };

    const processLoad = async () => {
        setIsSubmitting(true);
        setShowConfirmDialog(false);

        try {
            // 1. Get or Create "Initial Inventory" Supplier
            let supplierId = suppliers?.find(s =>
                s.name.toUpperCase() === 'INVENTARIO INICIAL' ||
                s.code === 'SUP-INIT'
            )?.id;

            if (!supplierId) {
                const newSupplier = await createSupplierMutation.mutateAsync({
                    name: 'INVENTARIO INICIAL',
                    contactName: 'Sistema',
                    email: 'noreply@system.com',
                    address: 'Interno',
                    taxId: '00000000000' // Generic placeholder
                });
                supplierId = newSupplier.id;
            }

            // 2. Prepare Purchase Details
            const details: CreatePurchaseDetailRequest[] = items.map(item => ({
                productId: item.id,
                uomId: item.uomId,
                quantity: item.quantityToAdd,
                unitCost: item.unitCost, // Using unitCost logic if supported by PurchaseDetailRequest
                unitPrice: item.unitCost, // The API expects unitPrice likely
                bonusQuantity: 0
            }));

            // 3. Create Purchase
            // Generate a unique invoice number for this load
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '');

            const purchase = await createPurchaseMutation.mutateAsync({
                supplierId: supplierId!,
                documentType: 'GUIA', // Using Guia as it's internal movement usually
                purchaseDate: new Date().toISOString(),
                invoiceNumber: `INI-${dateStr}-${timeStr}`,
                notes: 'Carga Inicial de Inventario (Capitalización)',
                details: details
            });

            // 4. Mark as Received (This updates stock and costs)
            await markReceivedMutation.mutateAsync(purchase.id);

            toast.success('Carga inicial procesada y capitalizada correctamente.');
            setItems([]);
            router.push('/inventario');

        } catch (error: any) {
            console.error('Error in initial load:', error);
            toast.error(error.response?.data?.message || 'Error al procesar la carga inicial.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!_hasHydrated || !isAuthenticated) return null;

    return (
        <AppLayout>
            <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="text-2xl font-bold">Carga Inicial de Capital</h1>
                        </div>
                        <p className="text-muted-foreground ml-11">
                            Registre sus existencias actuales y su costo unitario para capitalizar su inventario.
                        </p>
                    </div>
                </div>

                {/* Capital Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">Productos</p>
                            <p className="text-2xl font-bold text-foreground">{items.length}</p>
                        </div>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full text-primary">
                            <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">Total Unidades</p>
                            <p className="text-2xl font-bold text-foreground">{totalItems}</p>
                        </div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-4">
                        <div className="p-3 bg-green-500/20 rounded-full text-green-600 dark:text-green-400">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-green-700 dark:text-green-300 font-medium">Capital Total</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-300">S/ {totalCapital.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Search Area */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-4 mb-6 sticky top-20 z-20">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                            ref={searchInputRef}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Buscar producto para agregar (nombre o código)..."
                            className="pl-10 text-lg py-6 shadow-sm"
                            autoComplete="off"
                        />
                    </div>

                    {searchTerm && filteredProducts.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-popover border border-border rounded-lg shadow-xl z-30 max-h-[300px] overflow-y-auto mx-4">
                            {filteredProducts.map((product, index) => {
                                const stock = getCurrentStock(product.id);
                                const isSelected = index === selectedIndex;
                                return (
                                    <div
                                        key={product.id}
                                        id={`product-result-${index}`}
                                        onClick={() => addToBatch(product)}
                                        className={`p-3 cursor-pointer border-b border-border/50 last:border-0 flex justify-between items-center ${isSelected ? 'bg-primary/10' : 'hover:bg-accent'}`}
                                    >
                                        <div>
                                            <p className="font-medium text-foreground">{product.name}</p>
                                            <p className="text-xs text-muted-foreground">SKU: {product.code}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-xs px-2 py-1 rounded-full ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                En Stock: {stock}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Items List */}
                <div className="space-y-4">
                    {items.length === 0 ? (
                        <div className="text-center py-16 bg-muted/20 rounded-xl border-2 border-dashed border-border">
                            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground">Lista de carga vacía</h3>
                            <p className="text-sm text-muted-foreground/70">Busca y agrega productos para definir su stock inicial y costo.</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="bg-card rounded-lg border border-border p-3 shadow-sm flex flex-col items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                                <div className="w-full flex flex-col md:flex-row md:items-center gap-3">
                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-sm text-foreground truncate" title={item.productName}>{item.productName}</h3>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive h-6 w-6 -mr-2 md:hidden"
                                                onClick={() => removeFromBatch(item.id)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                        <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                                            <span>SKU: {item.productCode}</span>
                                            <span>Stock: {item.currentStock}</span>
                                        </div>
                                    </div>

                                    {/* Inputs Container */}
                                    <div className="flex items-end gap-2 w-full md:w-auto mt-1 md:mt-0 bg-muted/20 p-2 rounded-md">
                                        {/* UOM SELECTOR (First) */}
                                        <div className="min-w-[80px] w-24">
                                            <label className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                                                Unidad
                                            </label>
                                            <select
                                                id={`uom-${item.id}`}
                                                value={item.uomId}
                                                onChange={(e) => updateItem(item.id, 'uomId', e.target.value)}
                                                onKeyDown={(e) => handleItemKeyDown(e, item.id, 'uom')}
                                                className="w-full h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors font-medium border-r-8 border-transparent outline-none ring-offset-background focus-visible:ring-1 focus-visible:ring-ring"
                                            >
                                                {item.availableUOMs.map(u => (
                                                    <option key={u.uomId} value={u.uomId}>
                                                        {u.uomCode}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* QUANTITY */}
                                        <div className="w-24">
                                            <label className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                                                Cantidad
                                            </label>
                                            <Input
                                                id={`qty-${item.id}`}
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={item.quantityToAdd || ''}
                                                onChange={(e) => updateItem(item.id, 'quantityToAdd', e.target.value)}
                                                onKeyDown={(e) => handleItemKeyDown(e, item.id, 'quantity')}
                                                className="w-full text-right font-bold h-8 text-sm"
                                            />
                                        </div>

                                        {/* COST */}
                                        <div className="w-28">
                                            <label className="text-[9px] font-bold uppercase text-muted-foreground block mb-1">
                                                Costo (S/)
                                            </label>
                                            <Input
                                                id={`cost-${item.id}`}
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={item.unitCost || ''}
                                                onChange={(e) => updateItem(item.id, 'unitCost', e.target.value)}
                                                onKeyDown={(e) => handleItemKeyDown(e, item.id, 'cost')}
                                                className="w-full text-right font-bold h-8 text-sm text-green-700"
                                            />
                                        </div>

                                        {/* SUBTOTAL (Only Desktop) */}
                                        <div className="hidden md:flex flex-col items-end justify-center min-w-[90px] px-2 self-center h-8">
                                            <span className="text-[9px] font-bold uppercase text-muted-foreground">Subtotal</span>
                                            <span className="font-bold text-green-700 text-sm">
                                                S/ {(item.quantityToAdd * item.unitCost).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Desktop Delete Action */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive hidden md:flex h-8 w-8"
                                        onClick={() => removeFromBatch(item.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Mobile Sticky Footer */}
                <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 shadow-lg z-30">
                    <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                        <div className="hidden md:block">
                            <p className="text-sm text-foreground font-medium">Capital Total a Cargar</p>
                            <p className="text-2xl font-bold text-green-600">S/ {totalCapital.toFixed(2)}</p>
                        </div>
                        {/* Mobile Summary */}
                        <div className="block md:hidden">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-xl font-bold text-green-600">S/ {totalCapital.toFixed(2)}</p>
                        </div>

                        <Button
                            onClick={handleSaveClick}
                            disabled={isSubmitting || items.length === 0}
                            className="h-12 px-8 text-lg font-bold shadow-md min-w-[150px]"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                    Procesando...
                                </span>
                            ) : `Guardar Carga`}
                        </Button>
                    </div>
                </div>

                <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Carga Inicial</AlertDialogTitle>
                            <AlertDialogDescription>
                                ¿Estás seguro de que deseas guardar esta carga inicial?
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
                                    <div className="flex justify-between">
                                        <span>Productos:</span>
                                        <span className="font-bold text-foreground">{items.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Total Unidades:</span>
                                        <span className="font-bold text-foreground">{totalItems}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-border mt-2">
                                        <span className="font-bold">Capital Total:</span>
                                        <span className="font-bold text-green-600">S/ {totalCapital.toFixed(2)}</span>
                                    </div>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={processLoad} className="bg-green-600 hover:bg-green-700">
                                Confirmar y Guardar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
