'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { usePurchases, useCreatePurchase, useMarkPurchaseAsReceived } from '@/hooks/usePurchases';
import { useSuppliers, useCreateSupplier } from '@/hooks/useSuppliers';
import { useStores } from '@/hooks/useStores';
import { useUnitsOfMeasure } from '@/hooks/useUOM';
import { useMasterDataValues, useCreateMasterDataValue } from '@/hooks/useMasterData';
import ProductAutocomplete, { type ProductAutocompleteRef } from '@/components/ProductAutocomplete';
import { SortableTable } from '@/components/SortableTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { FormattedDateInput } from '@/components/ui/formatted-date-input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Printer } from 'lucide-react';
import { generatePurchasePDF } from '@/utils/pdfGenerator';
import type { CreatePurchaseDetailRequest, ProductSearchResult, PurchaseStatus } from '@/types/inventory';
import AppLayout from '@/components/layout/AppLayout';

export default function PurchasesPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  // usePurchases call moved down to use filterStoreId
  const { data: stores } = useStores();
  const { data: suppliers } = useSuppliers();
  const { data: uoms } = useUnitsOfMeasure();
  const { data: documentTypes } = useMasterDataValues('DOC_TYPE_PURCHASE');
  const createPurchase = useCreatePurchase();
  const markAsReceived = useMarkPurchaseAsReceived();
  const createSupplier = useCreateSupplier();
  const createDocumentType = useCreateMasterDataValue();
  const queryClient = useQueryClient();
  const productAutocompleteRef = useRef<ProductAutocompleteRef>(null);
  const uomSelectRef = useRef<HTMLSelectElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const unitPriceInputRef = useRef<HTMLInputElement>(null);

  const [filterStoreId, setFilterStoreId] = useState(''); // Initialized later with user.currentStoreId

  const { data: purchases, isLoading, refetch } = usePurchases(filterStoreId);

  useEffect(() => {
    if (user?.currentStoreId && !filterStoreId) {
      setFilterStoreId(user.currentStoreId);
    }
  }, [user?.currentStoreId, filterStoreId]);
  const [formData, setFormData] = useState({
    storeId: user?.currentStoreId || '', // Added
    supplierId: '',
    documentType: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    notes: '',
  });
  const [details, setDetails] = useState<CreatePurchaseDetailRequest[]>([]);
  const [currentDetail, setCurrentDetail] = useState({
    productId: '',
    productName: '',
    uomId: '',
    quantity: 1,
    unitPrice: 0,
    bonusQuantity: 0,
    bonusUOMId: '',
  });
  const [selectedProducts, setSelectedProducts] = useState<Map<string, ProductSearchResult>>(new Map());
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    taxId: ''
  });
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [showDocTypeModal, setShowDocTypeModal] = useState(false);
  const [newDocTypeData, setNewDocTypeData] = useState({
    code: '',
    name: '',
    description: ''
  });
  const [isCreatingDocType, setIsCreatingDocType] = useState(false);
  const [receivingPurchaseId, setReceivingPurchaseId] = useState<string | null>(null);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (suppliers && suppliers.length > 0 && !formData.supplierId) {
      const activeSuppliers = suppliers.filter(s => s.isActive);
      if (activeSuppliers.length > 0) {
        setFormData(prev => ({ ...prev, supplierId: activeSuppliers[0].id }));
      }
    }
  }, [suppliers, formData.supplierId]);

  useEffect(() => {
    if (documentTypes && documentTypes.length > 0 && !formData.documentType) {
      const activeDocTypes = documentTypes.filter(dt => dt.isActive);
      if (activeDocTypes.length > 0) {
        setFormData(prev => ({ ...prev, documentType: activeDocTypes[0].code }));
      }
    }
  }, [documentTypes, formData.documentType]);

  if (!_hasHydrated || !isAuthenticated) {
    return null;
  }

  const getStatusBadge = (status: PurchaseStatus) => {
    const badges = {
      0: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      1: { label: 'Recibida', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      2: { label: 'Completada', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      3: { label: 'Cancelada', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' }
    };
    const badge = badges[status as keyof typeof badges] || badges[0];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.className}`}>
        {badge.label}
      </span>
    );
  };

  const handleMarkAsReceived = async (purchaseId: string) => {
    setReceivingPurchaseId(purchaseId);
    try {
      await markAsReceived.mutateAsync(purchaseId);
      toast.success('Compra marcada como recibida. Stock actualizado.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al marcar como recibida');
    } finally {
      setReceivingPurchaseId(null);
    }
  };

  const handlePrint = (purchase: any) => {
    const statusLabels = {
      0: 'Pendiente',
      1: 'Recibida',
      2: 'Completada',
      3: 'Cancelada'
    };

    const storeName = stores?.find(s => s.id === purchase.storeId)?.name;

    generatePurchasePDF({
      purchaseNumber: purchase.purchaseNumber,
      date: new Date(purchase.purchaseDate),
      storeName: storeName,
      supplierName: purchase.supplierName,
      invoiceNumber: purchase.invoiceNumber,
      status: statusLabels[purchase.status as keyof typeof statusLabels] || 'Desconocido',
      notes: purchase.notes,
      totalAmount: purchase.totalAmount,
      items: purchase.details.map((d: any) => ({
        productName: d.productName,
        productCode: d.productCode,
        barcode: d.barcode,
        quantity: d.quantity,
        uom: d.uomName || d.uomCode,
        unitPrice: d.unitPrice,
        subtotal: d.subtotal,
        bonusQuantity: d.bonusQuantity,
        bonusUOM: d.bonusUOMName || d.bonusUOMCode
      }))
    });
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSupplierData.name.trim()) {
      toast.error('El nombre del proveedor es obligatorio');
      return;
    }

    setIsCreatingSupplier(true);

    try {
      const newSupplier = await createSupplier.mutateAsync(newSupplierData);

      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      await new Promise(resolve => setTimeout(resolve, 100));

      setFormData({ ...formData, supplierId: newSupplier.id });
      setNewSupplierData({
        name: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        taxId: ''
      });
      setShowSupplierModal(false);
      toast.success('Proveedor creado exitosamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear el proveedor');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const handleCreateDocumentType = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDocTypeData.code.trim() || !newDocTypeData.name.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }

    setIsCreatingDocType(true);

    try {
      const newDocType = await createDocumentType.mutateAsync({
        typeCode: 'DOC_TYPE_PURCHASE',
        code: newDocTypeData.code,
        name: newDocTypeData.name,
        description: newDocTypeData.description,
        displayOrder: 0
      });

      await queryClient.invalidateQueries({ queryKey: ['masterdata-values', 'DOC_TYPE_PURCHASE'] });
      await new Promise(resolve => setTimeout(resolve, 100));

      setFormData({ ...formData, documentType: newDocType.code });
      setNewDocTypeData({
        code: '',
        name: '',
        description: ''
      });
      setShowDocTypeModal(false);
      toast.success('Tipo de documento creado exitosamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear el tipo de documento');
    } finally {
      setIsCreatingDocType(false);
    }
  };

  const handleProductSelect = (product: ProductSearchResult) => {
    console.log('Product selected:', product);
    console.log('Purchase UOMs:', product.purchaseUOMs);

    const newProducts = new Map(selectedProducts);
    newProducts.set(product.id, product);
    setSelectedProducts(newProducts);

    const defaultPurchaseUOM = product.purchaseUOMs?.find(u => u.isDefault) || product.purchaseUOMs?.[0];
    console.log('Default purchase UOM:', defaultPurchaseUOM);

    setCurrentDetail({
      productId: product.id,
      productName: product.name,
      uomId: defaultPurchaseUOM?.uomId || product.baseUOMId || '',
      quantity: 1,
      unitPrice: product.purchasePrice,
      bonusQuantity: 0,
      bonusUOMId: '',
    });
  };

  const handleAddDetail = () => {
    if (!currentDetail.productId) {
      toast.error('Debe seleccionar un producto');
      setTimeout(() => productAutocompleteRef.current?.focus(), 100);
      return;
    }

    if (!currentDetail.uomId) {
      toast.error('Debe seleccionar una unidad de medida');
      setTimeout(() => uomSelectRef.current?.focus(), 100);
      return;
    }

    if (currentDetail.quantity <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      setTimeout(() => quantityInputRef.current?.focus(), 100);
      return;
    }

    if (currentDetail.unitPrice <= 0) {
      toast.error('El precio unitario debe ser mayor a 0');
      setTimeout(() => unitPriceInputRef.current?.focus(), 100);
      return;
    }

    if (currentDetail.bonusQuantity && currentDetail.bonusQuantity > 0 && !currentDetail.bonusUOMId) {
      toast.error('Si ingresa cantidad de bono, debe seleccionar la unidad del bono');
      return;
    }

    setDetails([...details, {
      productId: currentDetail.productId,
      uomId: currentDetail.uomId,
      quantity: currentDetail.quantity,
      unitPrice: currentDetail.unitPrice,
      bonusQuantity: currentDetail.bonusQuantity > 0 ? currentDetail.bonusQuantity : undefined,
      bonusUOMId: currentDetail.bonusQuantity > 0 ? currentDetail.bonusUOMId : undefined
    }]);
    setCurrentDetail({
      productId: '',
      productName: '',
      uomId: '',
      quantity: 1,
      unitPrice: 0,
      bonusQuantity: 0,
      bonusUOMId: ''
    });

    setTimeout(() => productAutocompleteRef.current?.focus(), 0);
  };

  const handleUOMKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      unitPriceInputRef.current?.focus();
      unitPriceInputRef.current?.select();
    }
  };

  const handleUnitPriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddDetail();
    }
  };

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return details.reduce((sum, detail) => sum + (detail.quantity * detail.unitPrice), 0);
  };

  const validateInvoiceNumber = (invoiceNumber: string, documentType: string): boolean => {
    const facturaPattern = /^F\d{3}-\d{8}$/;
    const boletaPattern = /^B\d{3}-\d{8}$/;

    if (documentType === '01') {
      return facturaPattern.test(invoiceNumber);
    } else if (documentType === '03') {
      return boletaPattern.test(invoiceNumber);
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId) {
      toast.error('Debe seleccionar un proveedor');
      return;
    }

    if (!formData.documentType) {
      toast.error('Debe seleccionar el tipo de documento');
      return;
    }

    if (details.length === 0) {
      toast.error('Debe agregar al menos un producto a la compra');
      return;
    }

    if ((formData.documentType === '01' || formData.documentType === '03') && !formData.invoiceNumber?.trim()) {
      toast.error('Debe ingresar el número de ' +
        (formData.documentType === '01' ? 'factura' : 'boleta') + ' del proveedor');
      return;
    }

    if (formData.invoiceNumber?.trim() && !validateInvoiceNumber(formData.invoiceNumber.trim(), formData.documentType)) {
      const expectedFormat = formData.documentType === '01' ? 'F001-00012345' : 'B001-00012345';
      toast.error(`Formato inválido. El número de ${formData.documentType === '01' ? 'factura' : 'boleta'} debe tener el formato: ${expectedFormat}`);
      return;
    }

    try {
      const now = new Date();
      const [year, month, day] = formData.purchaseDate.split('-').map(Number);
      const purchaseDateTime = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

      await createPurchase.mutateAsync({
        storeId: formData.storeId,
        supplierId: formData.supplierId,
        documentType: formData.documentType,
        purchaseDate: purchaseDateTime.toISOString(),
        invoiceNumber: formData.invoiceNumber?.trim() || '',
        notes: formData.notes || undefined,
        details,
      });

      setFormData({
        storeId: user?.currentStoreId || '',
        supplierId: '',
        documentType: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        notes: '',
      });
      setDetails([]);
      setSelectedProducts(new Map());
      toast.success('Compra registrada exitosamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al registrar la compra');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    // Use UTC to avoid timezone shifts
    const date = new Date(dateString);
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const getUOMName = (uomId: string) => {
    const uom = uoms?.find(u => u.id === uomId);
    return uom ? `${uom.name} (${uom.code})` : '-';
  };

  const getProductUOMs = (productId: string) => {
    const product = selectedProducts.get(productId);
    return product?.purchaseUOMs || [];
  };

  return (
    <AppLayout>
      <div className="bg-card rounded-lg shadow border border-border p-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">
          Gestión de Compras
        </h2>

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="new">Nueva Compra</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-muted/30 border border-border p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Información del Comprobante</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* STORE SELECTOR */}
                  <div className="space-y-2">
                    <Label htmlFor="store">Tienda de Destino</Label>
                    <select
                      id="store"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.storeId}
                      onChange={(e) => setFormData(prev => ({ ...prev, storeId: e.target.value }))}
                    >
                      {stores?.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="supplier" className="text-foreground">Proveedor</Label>
                      <button
                        type="button"
                        onClick={() => setShowSupplierModal(true)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Nuevo
                      </button>
                    </div>
                    <select
                      id="supplier"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData.supplierId}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                      required
                    >
                      <option value="">Seleccione un proveedor</option>
                      {suppliers?.filter(s => s.isActive).map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.code} - {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Fecha de Compra *</Label>
                    <FormattedDateInput
                      value={formData.purchaseDate}
                      onChange={(val) => setFormData({ ...formData, purchaseDate: val })}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="documentType">Tipo de Documento *</Label>
                      <button
                        type="button"
                        onClick={() => setShowDocTypeModal(true)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        + Crear Tipo
                      </button>
                    </div>
                    <select
                      id="documentType"
                      value={formData.documentType}
                      onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Seleccione tipo</option>
                      {documentTypes?.filter(dt => dt.isActive).map(docType => (
                        <option key={docType.id} value={docType.code}>
                          {docType.code} - {docType.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">
                      Número de Comprobante {(formData.documentType === '01' || formData.documentType === '03') && '*'}
                    </Label>
                    <Input
                      type="text"
                      id="invoiceNumber"
                      value={formData.invoiceNumber}
                      onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                      placeholder={
                        formData.documentType === '01' ? 'Ej: F001-00012345' :
                          formData.documentType === '03' ? 'Ej: B001-00012345' :
                            'Opcional'
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.documentType === '01' || formData.documentType === '03'
                        ? 'Número del comprobante del proveedor (obligatorio)'
                        : 'Número del comprobante del proveedor (opcional)'}
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="notes">Notas</Label>
                    <Input
                      type="text"
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Observaciones adicionales"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-muted/30 border border-border p-6 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Productos</h3>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Buscar Producto *</Label>
                    <ProductAutocomplete
                      ref={productAutocompleteRef}
                      onSelect={handleProductSelect}
                      placeholder="Buscar por código o nombre..."
                      onNextField={() => uomSelectRef.current?.focus()}
                    />
                    {currentDetail.productId && (
                      <div className="flex items-center justify-between text-xs bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded px-2 py-1">
                        <span className="text-green-700 dark:text-green-400 font-medium">
                          ✓ {currentDetail.productName}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentDetail({
                              ...currentDetail,
                              productId: '',
                              productName: '',
                              uomId: '',
                              unitPrice: 0
                            });
                            setTimeout(() => productAutocompleteRef.current?.focus(), 0);
                          }}
                          className="text-green-600 hover:text-green-800 ml-2"
                          title="Limpiar selección"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uomId">Unidad *</Label>
                    <select
                      ref={uomSelectRef}
                      id="uomId"
                      value={currentDetail.uomId}
                      onChange={(e) => setCurrentDetail({ ...currentDetail, uomId: e.target.value })}
                      onKeyDown={handleUOMKeyDown}
                      disabled={!currentDetail.productId}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <option value="">Seleccionar</option>
                      {currentDetail.productId && getProductUOMs(currentDetail.productId).map(uom => (
                        <option key={uom.id} value={uom.uomId}>
                          {uom.uomName} ({uom.uomCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad *</Label>
                    <NumberInput
                      ref={quantityInputRef}
                      id="quantity"
                      value={currentDetail.quantity}
                      onChange={(val) => setCurrentDetail({ ...currentDetail, quantity: val })}
                      onKeyDown={handleQuantityKeyDown}
                      min={0.01}
                      step={0.01}
                      decimals={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Precio Unit. *</Label>
                    <NumberInput
                      ref={unitPriceInputRef}
                      id="unitPrice"
                      value={currentDetail.unitPrice}
                      onChange={(val) => setCurrentDetail({ ...currentDetail, unitPrice: val })}
                      onKeyDown={handleUnitPriceKeyDown}
                      min={0}
                      step={0.01}
                      decimals={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="invisible">Acción</Label>
                    <button
                      type="button"
                      onClick={handleAddDetail}
                      className="w-full h-10 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>

                {currentDetail.productId && (
                  <div className="border-t border-border pt-4 mt-4">
                    <h4 className="text-sm font-medium text-foreground mb-3">Bonificación (Opcional)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bonusQuantity">Cantidad Bono</Label>
                        <NumberInput
                          id="bonusQuantity"
                          value={currentDetail.bonusQuantity}
                          onChange={(val) => setCurrentDetail({ ...currentDetail, bonusQuantity: val })}
                          min={0}
                          step={0.01}
                          decimals={2}
                        />
                        <p className="text-xs text-muted-foreground">
                          Productos adicionales gratis
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bonusUOMId">Unidad del Bono</Label>
                        <select
                          id="bonusUOMId"
                          value={currentDetail.bonusUOMId}
                          onChange={(e) => setCurrentDetail({ ...currentDetail, bonusUOMId: e.target.value })}
                          disabled={!currentDetail.bonusQuantity || currentDetail.bonusQuantity === 0}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                        >
                          <option value="">Seleccionar</option>
                          {getProductUOMs(currentDetail.productId).map(uom => (
                            <option key={uom.id} value={uom.uomId}>
                              {uom.uomName} ({uom.uomCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 w-full">
                          <p className="text-xs text-blue-800 dark:text-blue-300">
                            Ejemplo: Compra 10 cajas + 2 paquetes gratis
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {details.length > 0 && (
                  <div className="mt-6 border border-border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Producto</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">UOM</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Cant.</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Bono</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">P. Unit.</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Subtotal</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase w-24">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {details.map((detail, index) => {
                          const product = selectedProducts.get(detail.productId);
                          return (
                            <tr key={index} className="hover:bg-muted/50">
                              <td className="px-4 py-3 text-sm text-foreground">{product?.name || 'Producto'}</td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{getUOMName(detail.uomId)}</td>
                              <td className="px-4 py-3 text-sm text-foreground text-right">{detail.quantity}</td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">
                                {detail.bonusQuantity && detail.bonusQuantity > 0
                                  ? `+${detail.bonusQuantity} ${getUOMName(detail.bonusUOMId || '')}`
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground text-right">{formatCurrency(detail.unitPrice)}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">
                                {formatCurrency(detail.quantity * detail.unitPrice)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDetail(index)}
                                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-muted">
                          <td colSpan={5} className="px-4 py-4 text-right text-sm font-bold text-foreground">
                            Total:
                          </td>
                          <td className="px-4 py-4 text-right text-lg font-bold text-foreground">
                            {formatCurrency(calculateTotal())}
                          </td>
                          <td></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={createPurchase.isPending || details.length === 0}
                className="w-full py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 font-semibold text-lg"
              >
                {createPurchase.isPending ? 'Registrando...' : 'Registrar Compra'}
              </button>
            </form>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-end items-center mb-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="historyStoreFilter">Filtrar por Tienda:</Label>
                <select
                  id="historyStoreFilter"
                  className="h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={filterStoreId}
                  onChange={(e) => setFilterStoreId(e.target.value)}
                >
                  {stores?.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isLoading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Cargando historial...</p>
              </div>
            )}

            {!isLoading && purchases && purchases.length === 0 && (
              <div className="text-center py-12 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">No hay compras registradas</p>
              </div>
            )}

            {!isLoading && purchases && purchases.length > 0 && (
              <SortableTable
                data={purchases}
                defaultSortKey="purchaseDate"
                defaultSortDirection="desc"
                getSortValue={(purchase, key) => {
                  if (key === 'purchaseNumber') return purchase.purchaseNumber.toLowerCase();
                  if (key === 'purchaseDate') return new Date(purchase.purchaseDate).getTime();
                  if (key === 'supplier') return purchase.supplierName.toLowerCase();
                  if (key === 'invoiceNumber') return purchase.invoiceNumber?.toLowerCase() || '';
                  if (key === 'status') return purchase.status;
                  if (key === 'totalAmount') return purchase.totalAmount;
                  return '';
                }}
                columns={[
                  {
                    key: 'purchaseNumber',
                    label: 'Número',
                    className: 'font-medium text-foreground',
                    render: (purchase) => purchase.purchaseNumber
                  },
                  {
                    key: 'purchaseDate',
                    label: 'Fecha Compra',
                    className: 'text-muted-foreground',
                    render: (purchase) => new Date(purchase.purchaseDate).toLocaleString('es-PE', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })
                  },
                  {
                    key: 'receivedDate',
                    label: 'Fecha Recepción',
                    className: 'text-muted-foreground',
                    render: (purchase) => purchase.receivedDate ? new Date(purchase.receivedDate).toLocaleString('es-PE', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'
                  },
                  {
                    key: 'supplier',
                    label: 'Proveedor',
                    className: 'text-foreground',
                    render: (purchase) => purchase.supplierName
                  },
                  {
                    key: 'invoiceNumber',
                    label: 'Factura',
                    className: 'text-muted-foreground',
                    render: (purchase) => purchase.invoiceNumber || '-'
                  },
                  {
                    key: 'status',
                    label: 'Estado',
                    render: (purchase) => getStatusBadge(purchase.status)
                  },
                  {
                    key: 'totalAmount',
                    label: 'Total',
                    className: 'text-right text-foreground font-semibold',
                    render: (purchase) => formatCurrency(purchase.totalAmount)
                  },
                  {
                    key: 'items',
                    label: 'Items',
                    sortable: false,
                    className: 'text-muted-foreground',
                    render: (purchase) => `${purchase.details.length} producto${purchase.details.length !== 1 ? 's' : ''}`
                  },
                  {
                    key: 'actions',
                    label: 'Acciones',
                    sortable: false,
                    className: 'text-center',
                    render: (purchase) => (
                      <div className="flex gap-2 justify-center">
                        {purchase.status === 0 && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleMarkAsReceived(purchase.id)}
                            disabled={receivingPurchaseId === purchase.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white dark:text-emerald-50 shadow-sm"
                          >
                            {receivingPurchaseId === purchase.id ? 'Recibiendo...' : 'Recibir'}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPurchase(purchase);
                            setDetailDialogOpen(true);
                          }}
                          className="border-input hover:bg-accent hover:text-accent-foreground"
                        >
                          Ver Detalle
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrint(purchase)}
                          title="Imprimir PDF"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  }
                ]}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="mt-4">
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
          ← Volver al dashboard
        </Link>
      </div>

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl bg-card border-border shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Detalle de Compra</DialogTitle>
            <DialogDescription className="text-muted-foreground hidden">
              Detalle de la compra seleccionada
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="bg-muted/40 p-4 rounded-lg border border-border grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="md:col-span-4 border-b border-border pb-2 mb-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wide">
                    {stores?.find(s => s.id === selectedPurchase.storeId)?.name || 'Tienda Desconocida'}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Número</label>
                  <p className="text-sm font-semibold text-foreground mt-1">{selectedPurchase.purchaseNumber}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha</label>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {new Date(selectedPurchase.purchaseDate).toLocaleString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Proveedor</label>
                  <p className="text-sm font-semibold text-foreground mt-1">{selectedPurchase.supplierName}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedPurchase.status)}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Factura</label>
                  <p className="text-sm font-semibold text-foreground mt-1">{selectedPurchase.invoiceNumber || '-'}</p>
                </div>
                {selectedPurchase.receivedDate && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recibida</label>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {new Date(selectedPurchase.receivedDate).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
                {selectedPurchase.notes && (
                  <div className="col-span-2 md:col-span-4">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas</label>
                    <p className="text-sm text-foreground mt-1 italic">{selectedPurchase.notes}</p>
                  </div>
                )}
              </div>

              {/* Products Table */}
              <div>
                <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22v-9" /></svg>
                  Productos
                </h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Producto</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Unidad</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Cantidad</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Bono</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">P. Unit.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border text-card-foreground">
                      {selectedPurchase.details.map((detail: any, index: number) => (
                        <tr key={index} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium">{detail.productName}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {detail.uomCode ? `${detail.uomCode} - ${detail.uomName}` : (detail.uomName || '-')}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono">{detail.quantity}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {detail.bonusQuantity && detail.bonusQuantity > 0
                              ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">+{detail.bonusQuantity} {detail.bonusUOMCode || ''}</span>
                              : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono text-muted-foreground">{formatCurrency(detail.unitPrice)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right font-mono">
                            {formatCurrency(detail.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 border-t-2 border-border">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-sm font-bold text-foreground text-right uppercase tracking-wider">
                          Total General:
                        </td>
                        <td className="px-4 py-3 text-base font-bold text-primary text-right font-mono">
                          {formatCurrency(selectedPurchase.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)} className="border-border hover:bg-muted text-foreground">
              Cerrar
            </Button>
            <Button
              variant="default"
              onClick={() => handlePrint(selectedPurchase)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSupplierModal} onOpenChange={setShowSupplierModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Proveedor</DialogTitle>
            <DialogDescription>
              Ingrese los datos del nuevo proveedor
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supplierName">Nombre *</Label>
              <Input
                id="supplierName"
                value={newSupplierData.name}
                onChange={(e) => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                placeholder="Nombre del proveedor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Persona de Contacto</Label>
              <Input
                id="contactName"
                value={newSupplierData.contactName}
                onChange={(e) => setNewSupplierData({ ...newSupplierData, contactName: e.target.value })}
                placeholder="Nombre de contacto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={newSupplierData.phone}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                  placeholder="999 999 999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newSupplierData.email}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                  placeholder="email@ejemplo.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={newSupplierData.address}
                onChange={(e) => setNewSupplierData({ ...newSupplierData, address: e.target.value })}
                placeholder="Dirección completa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">RUC</Label>
              <Input
                id="taxId"
                value={newSupplierData.taxId}
                onChange={(e) => setNewSupplierData({ ...newSupplierData, taxId: e.target.value })}
                placeholder="20123456789"
                maxLength={11}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSupplierModal(false);
                  setNewSupplierData({
                    name: '',
                    contactName: '',
                    phone: '',
                    email: '',
                    address: '',
                    taxId: ''
                  });
                }}
                disabled={isCreatingSupplier}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingSupplier}>
                {isCreatingSupplier ? 'Creando...' : 'Crear Proveedor'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDocTypeModal} onOpenChange={setShowDocTypeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Tipo de Documento</DialogTitle>
            <DialogDescription>
              Ingrese los datos del nuevo tipo de documento de compra
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateDocumentType} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="docTypeCode">Código *</Label>
              <Input
                id="docTypeCode"
                value={newDocTypeData.code}
                onChange={(e) => setNewDocTypeData({ ...newDocTypeData, code: e.target.value.toUpperCase() })}
                placeholder="Ej: 01, 03, 99"
                maxLength={10}
              />
              <p className="text-xs text-gray-500">
                Código del tipo de documento (Ej: 01=Factura, 03=Boleta, 99=Sin comprobante)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="docTypeName">Nombre *</Label>
              <Input
                id="docTypeName"
                value={newDocTypeData.name}
                onChange={(e) => setNewDocTypeData({ ...newDocTypeData, name: e.target.value })}
                placeholder="Ej: Factura, Boleta de Venta"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="docTypeDescription">Descripción</Label>
              <Input
                id="docTypeDescription"
                value={newDocTypeData.description}
                onChange={(e) => setNewDocTypeData({ ...newDocTypeData, description: e.target.value })}
                placeholder="Descripción opcional"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDocTypeModal(false);
                  setNewDocTypeData({
                    code: '',
                    name: '',
                    description: ''
                  });
                }}
                disabled={isCreatingDocType}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreatingDocType}>
                {isCreatingDocType ? 'Creando...' : 'Crear Tipo de Documento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
