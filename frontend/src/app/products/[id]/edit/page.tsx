'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useMasterDataValues, useCreateMasterDataValue } from '@/hooks/useMasterData';
import { useUnitsOfMeasure } from '@/hooks/useUOM';
import { usePriceLists } from '@/hooks/usePriceLists';
import { Autocomplete } from '@/components/ui/autocomplete';
import { FormError } from '@/components/ui/form-error';
import { PriceInput } from '@/components/PriceInput';
import { SortableTable } from '@/components/SortableTable';
import { productSchema, type ProductFormData } from '../../new/validation';
import apiClient from '@/lib/axios';
import type { Product } from '@/types/inventory';
import AppLayout from '@/components/layout/AppLayout';

interface PriceByList {
  priceListId: string;
  price: number;
}

interface UOMOption {
  uomId: string;
  conversionToBase: number;
  isDefault: boolean;
  price?: number;
  pricesByList?: PriceByList[];
  order?: number;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const queryClient = useQueryClient();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const { data: categories, isLoading: loadingCategories } = useMasterDataValues('CATEGORY');
  const { data: uoms, isLoading: loadingUOMs, refetch: refetchUOMs } = useUnitsOfMeasure();
  const { data: priceLists, isLoading: loadingPriceLists } = usePriceLists();
  const createCategory = useCreateMasterDataValue();
  const createUOM = useCreateMasterDataValue();

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({ name: '', description: '' });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [showUOMModal, setShowUOMModal] = useState(false);
  const [newUOMData, setNewUOMData] = useState({ name: '', description: '', type: 'Discrete' });
  const [isCreatingUOM, setIsCreatingUOM] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    trigger,
    getValues,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    mode: 'onBlur',
    defaultValues: {
      code: '',
      barcode: '',
      shortScanCode: '',
      name: '',
      description: '',
      categoryId: '',
      baseUOMId: '',
      allowFractional: false,
      purchaseConversionMethod: 'base',
      isActive: true,
    },
  });

  const formData = watch();

  const [purchaseUOMs, setPurchaseUOMs] = useState<UOMOption[]>([]);
  const [saleUOMs, setSaleUOMs] = useState<UOMOption[]>([]);
  const [currentPurchaseUOM, setCurrentPurchaseUOM] = useState({
    uomId: '',
    conversionToBase: '1',
    conversionQuantity: '1',
    conversionRelativeTo: 'base' as 'base' | 'previous'
  });
  const [currentSaleUOM, setCurrentSaleUOM] = useState<{
    uomId: string;
    conversionToBase: string;
    conversionQuantity: string;
    conversionRelativeTo: 'base' | 'previous';
    pricesByList: PriceByList[];
  }>({
    uomId: '',
    conversionToBase: '1',
    conversionQuantity: '1',
    conversionRelativeTo: 'base',
    pricesByList: []
  });

  const [purchaseUOMError, setPurchaseUOMError] = useState<{ field: 'uom' | 'conversion' | null }>({ field: null });
  const [saleUOMError, setSaleUOMError] = useState<{ field: 'uom' | 'conversion' | 'prices' | null }>({ field: null });
  const [submitErrors, setSubmitErrors] = useState<{
    purchaseUOMs: boolean;
    saleUOMs: boolean;
  }>({ purchaseUOMs: false, saleUOMs: false });

  const purchaseConversionRef = useRef<HTMLInputElement>(null);
  const saleConversionRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, nextAction?: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextAction) {
        nextAction();
      }
    }
  };

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (isAuthenticated && productId && priceLists) {
      loadProduct();
    }
  }, [isAuthenticated, productId, priceLists]);

  const loadProduct = async () => {
    try {
      setIsLoadingProduct(true);
      const response = await apiClient.get(`/api/products/${productId}`);
      const productData: Product = response.data;

      setProduct(productData);
      setValue('name', productData.name);
      setValue('code', productData.code || '');
      setValue('barcode', productData.barcode || '');
      setValue('shortScanCode', productData.shortScanCode || '');
      setValue('description', productData.description || '');
      setValue('categoryId', productData.categoryId);
      setValue('baseUOMId', productData.baseUOMId);
      setValue('allowFractional', productData.allowFractional);
      setValue('purchaseConversionMethod', productData.purchaseConversionMethod || 'base');

      if (productData.purchaseConversionMethod) {
        setCurrentPurchaseUOM(prev => ({
          ...prev,
          conversionRelativeTo: productData.purchaseConversionMethod as 'base' | 'previous'
        }));
      }

      const purchaseUOMsData = (productData.purchaseUOMs || []).map((pu, index) => ({
        uomId: pu.uomId,
        conversionToBase: pu.conversionToBase,
        isDefault: pu.isDefault,
        order: index
      }));
      setPurchaseUOMs(purchaseUOMsData);

      const saleUOMsData = (productData.saleUOMs || []).map((su, index) => {
        const pricesByList: PriceByList[] = priceLists?.filter(pl => pl.isActive).map(pl => {
          const existingPrice = su.prices?.find(p => p.priceListId === pl.id);
          return {
            priceListId: pl.id,
            price: existingPrice?.price || (pl.isDefault ? su.price : 0),
          };
        }) || [];

        return {
          uomId: su.uomId,
          conversionToBase: su.conversionToBase,
          isDefault: su.isDefault,
          pricesByList,
          order: index
        };
      });
      setSaleUOMs(saleUOMsData);
    } catch (error: any) {
      console.error('Error loading product:', error);
      toast.error(error.response?.data?.message || 'Error al cargar el producto');
      router.push('/products');
    } finally {
      setIsLoadingProduct(false);
    }
  };

  useEffect(() => {
    if (priceLists && priceLists.length > 0) {
      const initialPrices: PriceByList[] = priceLists.filter(pl => pl.isActive).map(pl => ({
        priceListId: pl.id,
        price: 0
      }));
      setCurrentSaleUOM(prev => ({
        ...prev,
        pricesByList: prev.pricesByList.length === 0 ? initialPrices : prev.pricesByList
      }));
    }
  }, [priceLists]);

  // Auto-fill Short Code from Barcode (Last 6 characters)
  useEffect(() => {
    if (formData.barcode && formData.barcode.length >= 6) {
      const currentShortCode = getValues('shortScanCode');
      // Only auto-fill if empty
      if (!currentShortCode) {
        const shortCode = formData.barcode.slice(-6);
        setValue('shortScanCode', shortCode, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [formData.barcode, setValue, getValues]);

  if (!_hasHydrated || !isAuthenticated) {
    return null;
  }

  if (isLoadingProduct) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando producto...</div>
      </div>
    );
  }

  const handleSubmitClick = async () => {
    const validationErrors: string[] = [];
    let firstErrorElement: string | null = null;

    // Reset submit errors
    setSubmitErrors({ purchaseUOMs: false, saleUOMs: false });

    // Obtener valores actuales del formulario
    const currentFormData = watch();

    // Validar en el orden del formulario (de arriba hacia abajo)

    // 1. Categoría (primera fila)
    if (!currentFormData.categoryId || currentFormData.categoryId === '') {
      validationErrors.push('Debe seleccionar una categoría');
      if (!firstErrorElement) firstErrorElement = 'categoryId';
    }

    // 2. Nombre (segunda fila)
    if (!currentFormData.name || currentFormData.name.trim() === '') {
      validationErrors.push('El nombre es requerido');
      if (!firstErrorElement) firstErrorElement = 'name';
    }

    // 3. Unidad de medida base
    if (!currentFormData.baseUOMId || currentFormData.baseUOMId === '') {
      validationErrors.push('Debe seleccionar una unidad de medida base');
      if (!firstErrorElement) firstErrorElement = 'baseUOMId';
    }

    // 4. Unidades de compra
    if (purchaseUOMs.length === 0) {
      validationErrors.push('Debe agregar al menos una unidad de compra');
      setSubmitErrors(prev => ({ ...prev, purchaseUOMs: true }));
      if (!firstErrorElement) firstErrorElement = 'purchaseUOMsSection';
    }

    // 5. Unidades de venta
    if (saleUOMs.length === 0) {
      validationErrors.push('Debe agregar al menos una unidad de venta');
      setSubmitErrors(prev => ({ ...prev, saleUOMs: true }));
      if (!firstErrorElement) firstErrorElement = 'saleUOMsSection';
    }

    // 6. Validar que todas las unidades de venta tengan precios válidos para todas las listas
    const activePriceLists = priceLists?.filter(pl => pl.isActive) || [];
    if (activePriceLists.length === 0) {
      validationErrors.push('No hay listas de precios activas. Configure las listas de precios antes de crear productos.');
    } else {
      for (const saleUOM of saleUOMs) {
        if (!saleUOM.pricesByList || saleUOM.pricesByList.length === 0) {
          validationErrors.push('Todas las unidades de venta deben tener precios configurados');
          setSubmitErrors(prev => ({ ...prev, saleUOMs: true }));
          if (!firstErrorElement) firstErrorElement = 'saleUOMsSection';
          break;
        }

        // Verificar que cada lista activa tenga un precio
        for (const priceList of activePriceLists) {
          const priceForList = saleUOM.pricesByList.find(p => p.priceListId === priceList.id);
          if (!priceForList || priceForList.price <= 0) {
            validationErrors.push(`Debe ingresar precios para todas las listas (${priceList.name})`);
            setSubmitErrors(prev => ({ ...prev, saleUOMs: true }));
            if (!firstErrorElement) firstErrorElement = 'saleUOMsSection';
            break;
          }
        }
        if (validationErrors.length > 0) break;
      }
    }

    // Si hay errores de validación, mostrarlos todos y hacer trigger para mostrar errores inline
    if (validationErrors.length > 0) {
      await trigger(); // Trigger para mostrar errores inline en los campos
      validationErrors.forEach(error => toast.error(error));

      // Scroll al primer error
      if (firstErrorElement) {
        setTimeout(() => {
          const element = document.getElementById(firstErrorElement);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const focusable = element.querySelector('input, select, textarea') as HTMLElement;
            if (focusable) {
              focusable.focus();
            } else {
              element.focus();
            }
          }
        }, 100);
      }
      return;
    }

    // Si todo está válido, hacer submit
    handleFormSubmit(onSubmit)();
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      const payload = {
        code: data.code || '',
        barcode: data.barcode || undefined,
        shortScanCode: data.shortScanCode || undefined,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        isActive: true,
        salePrice: 0,
        purchasePrice: 0,
        wholesalePrice: 0,
        baseUOMId: data.baseUOMId || undefined,
        allowFractional: data.allowFractional,
        purchaseConversionMethod: data.purchaseConversionMethod,
        purchaseUOMs: purchaseUOMs.map(pu => ({
          uomId: pu.uomId,
          conversionToBase: pu.conversionToBase,
          isDefault: pu.isDefault
        })),
        saleUOMs: saleUOMs.map(su => ({
          uomId: su.uomId,
          conversionToBase: su.conversionToBase,
          isDefault: su.isDefault,
          pricesByList: su.pricesByList || []
        }))
      };

      console.log('Payload being sent:', JSON.stringify(payload, null, 2));

      await apiClient.put(`/api/products/${productId}`, payload);

      queryClient.invalidateQueries({ queryKey: ['products'] });

      toast.success('Producto actualizado exitosamente');
      router.push('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al actualizar el producto');
    }
  };


  const addPurchaseUOM = () => {
    setPurchaseUOMError({ field: null });
    setSubmitErrors(prev => ({ ...prev, purchaseUOMs: false }));

    if (!currentPurchaseUOM.uomId) {
      setPurchaseUOMError({ field: 'uom' });
      setSubmitErrors(prev => ({ ...prev, purchaseUOMs: true }));
      toast.error('Debe seleccionar una unidad de medida');
      setTimeout(() => {
        const element = document.getElementById('purchaseUOMsSection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        document.getElementById('purchaseUOMAutocomplete')?.focus();
      }, 100);
      return;
    }

    const conversionValue = parseFloat(currentPurchaseUOM.conversionQuantity);
    if (!conversionValue || conversionValue <= 0) {
      setPurchaseUOMError({ field: 'conversion' });
      setSubmitErrors(prev => ({ ...prev, purchaseUOMs: true }));
      toast.error('El factor de conversión debe ser mayor a 0');
      setTimeout(() => {
        const element = document.getElementById('purchaseUOMsSection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        purchaseConversionRef.current?.focus();
      }, 100);
      return;
    }

    const uom = uoms?.find(u => u.id === currentPurchaseUOM.uomId);
    if (!uom) {
      setPurchaseUOMError({ field: 'uom' });
      setSubmitErrors(prev => ({ ...prev, purchaseUOMs: true }));
      toast.error('Unidad de medida no encontrada');
      return;
    }

    const existingUOM = purchaseUOMs.find(pu => pu.uomId === currentPurchaseUOM.uomId);
    if (existingUOM) {
      setPurchaseUOMError({ field: 'uom' });
      setSubmitErrors(prev => ({ ...prev, purchaseUOMs: true }));
      toast.error(`La unidad "${uom.name}" ya fue agregada`);
      setTimeout(() => {
        const element = document.getElementById('purchaseUOMsSection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        document.getElementById('purchaseUOMAutocomplete')?.focus();
      }, 100);
      return;
    }

    let conversionToBase: number;
    if (currentPurchaseUOM.conversionRelativeTo === 'previous' && purchaseUOMs.length > 0) {
      const previousUOM = purchaseUOMs[purchaseUOMs.length - 1];
      conversionToBase = conversionValue * previousUOM.conversionToBase;
    } else {
      conversionToBase = conversionValue;
    }

    setPurchaseUOMs([...purchaseUOMs, {
      uomId: currentPurchaseUOM.uomId,
      conversionToBase: conversionToBase,
      isDefault: purchaseUOMs.length === 0,
      order: purchaseUOMs.length
    }]);

    setCurrentPurchaseUOM({
      uomId: '',
      conversionToBase: '1',
      conversionQuantity: '1',
      conversionRelativeTo: purchaseUOMs.length === 0 ? 'base' : 'previous'
    });

    // Recuperar foco para seguir agregando
    setTimeout(() => {
      document.getElementById('purchaseUOMAutocomplete')?.focus();
    }, 100);
  };

  const removePurchaseUOM = (index: number) => {
    const newUOMs = purchaseUOMs.filter((_, i) => i !== index);
    if (newUOMs.length > 0 && purchaseUOMs[index].isDefault) {
      newUOMs[0].isDefault = true;
    }
    setPurchaseUOMs(newUOMs);
  };

  const setDefaultPurchaseUOM = (index: number) => {
    setPurchaseUOMs(purchaseUOMs.map((uom, i) => ({
      ...uom,
      isDefault: i === index
    })));
  };

  const addSaleUOM = () => {
    setSaleUOMError({ field: null });
    setSubmitErrors(prev => ({ ...prev, saleUOMs: false }));

    if (!currentSaleUOM.uomId) {
      setSaleUOMError({ field: 'uom' });
      setSubmitErrors(prev => ({ ...prev, saleUOMs: true }));
      toast.error('Debe seleccionar una unidad de medida');
      setTimeout(() => {
        const element = document.getElementById('saleUOMsSection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        document.getElementById('saleUOMAutocomplete')?.focus();
      }, 100);
      return;
    }

    if (!currentSaleUOM.conversionToBase || parseFloat(currentSaleUOM.conversionToBase) <= 0) {
      setSaleUOMError({ field: 'conversion' });
      setSubmitErrors(prev => ({ ...prev, saleUOMs: true }));
      toast.error('El factor de conversión debe ser mayor a 0');
      setTimeout(() => {
        const element = document.getElementById('saleUOMsSection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        saleConversionRef.current?.focus();
      }, 100);
      return;
    }

    if (!currentSaleUOM.pricesByList || currentSaleUOM.pricesByList.length === 0) {
      setSaleUOMError({ field: 'prices' });
      setSubmitErrors(prev => ({ ...prev, saleUOMs: true }));
      toast.error('Debe ingresar precios para todas las listas');
      setTimeout(() => {
        const element = document.getElementById('saleUOMsSection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      return;
    }

    const invalidPrice = currentSaleUOM.pricesByList.find(p => !p.price || p.price <= 0);
    if (invalidPrice) {
      setSaleUOMError({ field: 'prices' });
      setSubmitErrors(prev => ({ ...prev, saleUOMs: true }));
      const priceList = priceLists?.find(pl => pl.id === invalidPrice.priceListId);
      toast.error(`Debe ingresar un precio válido para la lista "${priceList?.name}"`);
      setTimeout(() => {
        const element = document.getElementById('saleUOMsSection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        document.getElementById(`salePrice-${invalidPrice.priceListId}`)?.focus();
      }, 100);
      return;
    }

    const uom = uoms?.find(u => u.id === currentSaleUOM.uomId);
    if (!uom) {
      setSaleUOMError({ field: 'uom' });
      setSubmitErrors(prev => ({ ...prev, saleUOMs: true }));
      toast.error('Unidad de medida no encontrada');
      return;
    }

    const existingUOM = saleUOMs.find(su => su.uomId === currentSaleUOM.uomId);
    if (existingUOM) {
      setSaleUOMError({ field: 'uom' });
      setSubmitErrors(prev => ({ ...prev, saleUOMs: true }));
      toast.error(`La unidad "${uom.name}" ya fue agregada`);
      setTimeout(() => {
        const element = document.getElementById('saleUOMsSection');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        document.getElementById('saleUOMAutocomplete')?.focus();
      }, 100);
      return;
    }

    setSaleUOMs([...saleUOMs, {
      uomId: currentSaleUOM.uomId,
      conversionToBase: parseFloat(currentSaleUOM.conversionToBase),
      isDefault: saleUOMs.length === 0,
      pricesByList: currentSaleUOM.pricesByList.map(p => ({ ...p }))
    }]);

    const initialPrices: PriceByList[] = priceLists?.filter(pl => pl.isActive).map(pl => ({
      priceListId: pl.id,
      price: 0
    })) || [];

    setCurrentSaleUOM({
      uomId: '',
      conversionToBase: '1',
      conversionQuantity: '1',
      conversionRelativeTo: 'base',
      pricesByList: initialPrices
    });

    // Recuperar foco para seguir agregando
    setTimeout(() => {
      document.getElementById('saleUOMAutocomplete')?.focus();
    }, 100);
  };

  const removeSaleUOM = (index: number) => {
    const newUOMs = saleUOMs.filter((_, i) => i !== index);
    if (newUOMs.length > 0 && saleUOMs[index].isDefault) {
      newUOMs[0].isDefault = true;
    }
    setSaleUOMs(newUOMs);
  };

  const setDefaultSaleUOM = (index: number) => {
    setSaleUOMs(saleUOMs.map((uom, i) => ({
      ...uom,
      isDefault: i === index
    })));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingCategory(true);

    try {
      const newCategory = await createCategory.mutateAsync({
        typeCode: 'CATEGORY',
        code: '',
        name: newCategoryData.name,
        description: newCategoryData.description,
        displayOrder: 0
      });

      await queryClient.invalidateQueries({ queryKey: ['categories'] });

      // Pequeño delay para asegurar que el query se refetch antes de setValue
      await new Promise(resolve => setTimeout(resolve, 100));

      setValue('categoryId', newCategory.id);
      setNewCategoryData({ name: '', description: '' });
      setShowCategoryModal(false);
      toast.success('Categoría creada exitosamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear la categoría');
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleCreateUOM = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingUOM(true);

    try {
      await createUOM.mutateAsync({
        typeCode: 'UOM',
        code: '',
        name: newUOMData.name,
        description: newUOMData.description,
        metadata: JSON.stringify({ type: newUOMData.type }),
        displayOrder: 0
      });

      await refetchUOMs();
      setNewUOMData({ name: '', description: '', type: 'Discrete' });
      setShowUOMModal(false);
      toast.success('Unidad de medida creada exitosamente');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al crear la unidad de medida');
    } finally {
      setIsCreatingUOM(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link href="/products" className="text-primary hover:text-primary/80">
              ← Volver a productos
            </Link>
          </div>


          <div className="bg-card rounded-lg shadow p-6 border border-border">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Editar Producto
            </h2>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitClick(); }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-foreground mb-2">
                    Código
                  </label>
                  <input
                    type="text"
                    id="code"
                    {...register('code')}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 bg-muted text-foreground border-input cursor-not-allowed opacity-80"
                    placeholder="Código del producto"
                    readOnly
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    El código no puede modificarse
                  </p>
                  <FormError message={errors.code?.message} />
                </div>

                <div>
                  <label htmlFor="barcode" className="block text-sm font-medium text-foreground mb-2">
                    Código de Barras
                  </label>
                  <input
                    type="text"
                    id="barcode"
                    {...register('barcode')}
                    onKeyDown={(e) => handleKeyDown(e, () => document.getElementById('shortScanCode')?.focus())}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 bg-background text-foreground ${errors.barcode ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'
                      }`}
                    placeholder="EAN13, UPC"
                  />
                  <FormError message={errors.barcode?.message} />
                </div>

                <div>
                  <label htmlFor="shortScanCode" className="block text-sm font-medium text-foreground mb-2">
                    Código Corto (Manual)
                  </label>
                  <input
                    type="text"
                    id="shortScanCode"
                    {...register('shortScanCode')}
                    onKeyDown={(e) => handleKeyDown(e, () => document.getElementById('categoryId')?.focus())}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 bg-background text-foreground ${errors.shortScanCode ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'
                      }`}
                    placeholder="Ej: 567890"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Para búsqueda rápida en POS
                  </p>
                  <FormError message={errors.shortScanCode?.message} />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="categoryId" className="block text-sm font-medium text-foreground">
                      Categoría *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryModal(true)}
                      className="text-sm text-primary hover:text-primary/80 font-medium"
                    >
                      + Nueva Categoría
                    </button>
                  </div>
                  <select
                    id="categoryId"
                    {...register('categoryId')}
                    onKeyDown={(e) => handleKeyDown(e, () => document.getElementById('name')?.focus())}
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 bg-background text-foreground ${errors.categoryId ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'
                      }`}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categories?.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {loadingCategories && (
                    <p className="text-sm text-muted-foreground mt-1">Cargando categorías...</p>
                  )}
                  <FormError message={errors.categoryId?.message} />
                </div>
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Nombre *
                </label>
                <input
                  type="text"
                  id="name"
                  {...register('name')}
                  onKeyDown={(e) => handleKeyDown(e, () => document.getElementById('description')?.focus())}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 bg-background text-foreground ${errors.name ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'
                    }`}
                  placeholder="Nombre del producto"
                />
                <FormError message={errors.name?.message} />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                  Descripción
                </label>
                <textarea
                  id="description"
                  rows={3}
                  {...register('description')}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 bg-background text-foreground ${errors.description ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'
                    }`}
                  placeholder="Descripción del producto (opcional)"
                />
                <FormError message={errors.description?.message} />
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-lg font-medium text-foreground mb-4">
                  Unidad de Medida Base
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="baseUOMId" className="block text-sm font-medium text-foreground mb-2">
                      Unidad Base (Stock)
                    </label>
                    <Autocomplete
                      options={uoms?.map(uom => ({ id: uom.id, code: uom.code, name: uom.name })) || []}
                      value={formData.baseUOMId || ''}
                      onChange={(value) => setValue('baseUOMId', value)}
                      placeholder="Buscar unidad base..."
                      emptyMessage="No se encontraron unidades"
                      onCreateNew={() => setShowUOMModal(true)}
                      createNewLabel="+ Crear nueva unidad"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Unidad mínima para control de inventario
                    </p>
                    <FormError message={errors.baseUOMId?.message} />
                  </div>

                  <div>
                    <label className="flex items-center space-x-2 mt-8">
                      <input
                        type="checkbox"
                        id="allowFractional"
                        {...register('allowFractional')}
                        className="w-4 h-4 text-primary border-input rounded focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">
                        Permitir cantidades fraccionarias
                      </span>
                    </label>
                    <p className="text-xs text-muted-foreground ml-6 mt-1">
                      Para productos por peso o volumen
                    </p>
                  </div>
                </div>
              </div>

              <div id="purchaseUOMsSection" className={`border-t border-border pt-6 ${submitErrors.purchaseUOMs ? 'bg-destructive/10 -mx-6 px-6 py-6' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className={`text-lg font-medium ${submitErrors.purchaseUOMs ? 'text-destructive' : 'text-foreground'}`}>
                      Unidades de Compra {submitErrors.purchaseUOMs && <span className="text-destructive">*</span>}
                    </h3>
                    <p className={`text-sm mt-1 ${submitErrors.purchaseUOMs ? 'text-destructive' : 'text-muted-foreground'}`}>
                      Define las diferentes formas en las que puedes comprar este producto
                    </p>
                  </div>
                  {formData.baseUOMId && !purchaseUOMs.some(u => u.uomId === formData.baseUOMId) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.baseUOMId) {
                          setPurchaseUOMs([{
                            uomId: formData.baseUOMId,
                            conversionToBase: 1,
                            isDefault: purchaseUOMs.length === 0
                          }, ...purchaseUOMs]);
                        }
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-md hover:bg-emerald-700 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Agregar Unidad Base
                    </button>
                  )}
                </div>

                <div className="space-y-4 mb-4">
                  {purchaseUOMs.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <p className="text-sm font-medium text-foreground">¿Cómo quieres definir la equivalencia?</p>
                        <div className="group relative">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Esto determina cómo se calcula el stock. La opción "Cascada" es más común para cajas y paquetes, mientras que "Directa" es más precisa para productos pesables o líquidos.
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Option 1: Direct to Base */}
                        <div
                          onClick={() => {
                            setCurrentPurchaseUOM({ ...currentPurchaseUOM, conversionRelativeTo: 'base' });
                            setValue('purchaseConversionMethod', 'base', { shouldDirty: true });
                          }}
                          className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${currentPurchaseUOM.conversionRelativeTo === 'base'
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-border bg-card hover:bg-muted/50'
                            }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full ${currentPurchaseUOM.conversionRelativeTo === 'base' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className={`font-semibold ${currentPurchaseUOM.conversionRelativeTo === 'base' ? 'text-primary' : 'text-foreground'}`}>
                                  Directa (Independiente)
                                </h4>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  Recomendado para Pesos/Líquidos
                                </span>
                                {currentPurchaseUOM.conversionRelativeTo === 'base' && (
                                  <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Cada formato se define por sí solo indicando cuánta base contiene. Evita errores si cambias un tamaño intermedio.
                              </p>
                              <div className="mt-3 text-xs bg-background/50 p-2 rounded border border-border">
                                <span className="font-medium text-foreground italic">Ejemplo:</span> 1 Balde = 20 Litros, 1 Galón = 4 Litros.
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Option 2: Relative to Previous */}
                        <div
                          onClick={() => {
                            setCurrentPurchaseUOM({ ...currentPurchaseUOM, conversionRelativeTo: 'previous' });
                            setValue('purchaseConversionMethod', 'previous', { shouldDirty: true });
                          }}
                          className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 ${currentPurchaseUOM.conversionRelativeTo === 'previous'
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-border bg-card hover:bg-muted/50'
                            }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-full ${currentPurchaseUOM.conversionRelativeTo === 'previous' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className={`font-semibold ${currentPurchaseUOM.conversionRelativeTo === 'previous' ? 'text-primary' : 'text-foreground'}`}>
                                  Cascada (Jerarquía)
                                </h4>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                  Ideal para Cajas/Paquetes
                                </span>
                                {currentPurchaseUOM.conversionRelativeTo === 'previous' && (
                                  <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Basado en la unidad anterior. Muy rápido de configurar para empaques que van uno dentro de otro.
                              </p>
                              <div className="mt-3 text-xs bg-background/50 p-2 rounded border border-border">
                                <span className="font-medium text-foreground italic">Ejemplo:</span> 1 Caja = 10 Paquetes, 1 Paquete = 6 Unidades.
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Unidad
                        </label>
                        <div id="purchaseUOMAutocomplete">
                          <Autocomplete
                            options={uoms?.map(uom => ({ id: uom.id, code: uom.code, name: uom.name })) || []}
                            value={currentPurchaseUOM.uomId}
                            onChange={(value) => {
                              setCurrentPurchaseUOM({ ...currentPurchaseUOM, uomId: value });
                              setPurchaseUOMError({ field: null });
                            }}
                            placeholder="Buscar unidad de medida..."
                            emptyMessage="No se encontraron unidades"
                            onCreateNew={() => setShowUOMModal(true)}
                            createNewLabel="+ Crear nueva unidad"
                            className={purchaseUOMError.field === 'uom' ? 'border-destructive' : ''}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Conversión
                      </label>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground whitespace-nowrap">
                            1 {currentPurchaseUOM.uomId ? (
                              <span className="font-semibold text-foreground">{uoms?.find(u => u.id === currentPurchaseUOM.uomId)?.code}</span>
                            ) : (
                              <span className="text-gray-400">___</span>
                            )} =
                          </span>
                          <input
                            id="purchaseConversionInput"
                            ref={purchaseConversionRef}
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={currentPurchaseUOM.conversionQuantity}
                            onChange={(e) => {
                              setCurrentPurchaseUOM({ ...currentPurchaseUOM, conversionQuantity: e.target.value });
                              setPurchaseUOMError({ field: null });
                            }}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => handleKeyDown(e, addPurchaseUOM)}
                            className={`w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 bg-background text-foreground text-center font-semibold ${purchaseUOMError.field === 'conversion'
                              ? 'border-destructive focus:ring-destructive'
                              : 'border-input focus:ring-primary'
                              }`}
                            placeholder="1"
                          />
                          <span className="text-muted-foreground whitespace-nowrap font-semibold">
                            {currentPurchaseUOM.conversionRelativeTo === 'previous' && purchaseUOMs.length > 0
                              ? uoms?.find(u => u.id === purchaseUOMs[purchaseUOMs.length - 1].uomId)?.code || 'UND'
                              : uoms?.find(u => u.id === formData.baseUOMId)?.code || 'UND'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2 opacity-0">
                        &nbsp;
                      </label>
                      <button
                        type="button"
                        onClick={addPurchaseUOM}
                        className="w-full px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>

                {purchaseUOMs.length > 0 && (
                  <SortableTable
                    data={purchaseUOMs}
                    defaultSortKey="order"
                    defaultSortDirection="asc"
                    getSortValue={(uom, key) => {
                      const uomData = uoms?.find(u => u.id === uom.uomId);
                      if (key === 'uomName') return uomData?.name?.toLowerCase() || '';
                      if (key === 'conversionToBase') return Number(uom.conversionToBase);
                      if (key === 'order') return uom.order ?? 0;
                      return '';
                    }}
                    columns={[
                      {
                        key: 'uomName',
                        label: 'Unidad',
                        className: 'text-foreground font-medium',
                        render: (uom) => {
                          const uomData = uoms?.find(u => u.id === uom.uomId);
                          return `${uomData?.name} (${uomData?.code})`;
                        }
                      },
                      {
                        key: 'conversionToBase',
                        label: 'Factor',
                        className: 'text-foreground',
                        render: (uom) => uom.conversionToBase
                      },
                      {
                        key: 'isDefault',
                        label: 'Predeterminado',
                        sortable: false,
                        headerClassName: 'text-center',
                        className: 'text-center',
                        render: (uom, index) => (
                          <input
                            type="radio"
                            checked={uom.isDefault}
                            onChange={() => setDefaultPurchaseUOM(index)}
                            className="w-4 h-4 text-primary focus:ring-primary"
                          />
                        )
                      },
                      {
                        key: 'actions',
                        label: '',
                        sortable: false,
                        className: 'text-right',
                        render: (_uom, index) => (
                          <button
                            type="button"
                            onClick={() => removePurchaseUOM(index)}
                            className="text-destructive hover:text-destructive/80 text-sm font-medium"
                          >
                            Eliminar
                          </button>
                        )
                      }
                    ]}
                  />
                )}
              </div>

              <div id="saleUOMsSection" className={`border-t border-border pt-6 ${submitErrors.saleUOMs ? 'bg-destructive/10 -mx-6 px-6 py-6' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className={`text-lg font-medium ${submitErrors.saleUOMs ? 'text-destructive' : 'text-foreground'}`}>
                      Unidades de Venta {submitErrors.saleUOMs && <span className="text-destructive">*</span>}
                    </h3>
                    <p className={`text-sm mt-1 ${submitErrors.saleUOMs ? 'text-destructive' : 'text-muted-foreground'}`}>
                      Define las diferentes formas en las que puedes vender este producto con sus precios
                    </p>
                  </div>
                  {purchaseUOMs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const initialPrices: PriceByList[] = priceLists?.filter(pl => pl.isActive).map(pl => ({
                          priceListId: pl.id,
                          price: 0
                        })) || [];

                        const copiedUOMs = purchaseUOMs.map(pu => ({
                          uomId: pu.uomId,
                          conversionToBase: pu.conversionToBase,
                          isDefault: pu.isDefault,
                          pricesByList: [...initialPrices]
                        }));

                        // Add base UOM if not already in the list and baseUOMId is set
                        if (formData.baseUOMId && !copiedUOMs.some(u => u.uomId === formData.baseUOMId)) {
                          copiedUOMs.unshift({
                            uomId: formData.baseUOMId,
                            conversionToBase: 1,
                            isDefault: false,
                            pricesByList: [...initialPrices]
                          });
                        }

                        setSaleUOMs(copiedUOMs);
                      }}
                      className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                      Copiar desde Compras
                    </button>
                  )}
                </div>

                <div className={`border rounded-lg p-4 mb-4 ${saleUOMError.field ? 'border-destructive/50 bg-destructive/10' : 'border-border bg-muted/20'
                  }`}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Unidad
                      </label>
                      <div id="saleUOMAutocomplete">
                        <Autocomplete
                          options={uoms?.map(uom => ({ id: uom.id, code: uom.code, name: uom.name })) || []}
                          value={currentSaleUOM.uomId}
                          onChange={(value) => {
                            setCurrentSaleUOM({ ...currentSaleUOM, uomId: value });
                            setSaleUOMError({ field: null });
                          }}
                          placeholder="Buscar unidad de medida..."
                          emptyMessage="No se encontraron unidades"
                          onCreateNew={() => setShowUOMModal(true)}
                          createNewLabel="+ Crear nueva unidad"
                          className={saleUOMError.field === 'uom' ? 'border-destructive' : ''}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Factor de conversión
                      </label>
                      <input
                        id="saleConversionInput"
                        ref={saleConversionRef}
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={currentSaleUOM.conversionToBase}
                        onChange={(e) => {
                          setCurrentSaleUOM({ ...currentSaleUOM, conversionToBase: e.target.value });
                          setSaleUOMError({ field: null });
                        }}
                        onFocus={(e) => e.target.select()}
                        className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 bg-background text-foreground ${saleUOMError.field === 'conversion'
                          ? 'border-destructive focus:ring-destructive'
                          : 'border-input focus:ring-primary'
                          }`}
                        placeholder="1.0"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Precios por Lista <span className="text-destructive">*</span>
                    </label>
                    {loadingPriceLists ? (
                      <div className="text-muted-foreground text-sm">Cargando listas de precios...</div>
                    ) : !priceLists || priceLists.length === 0 ? (
                      <div className="text-destructive text-sm p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        No hay listas de precios disponibles. Por favor, configure las listas de precios primero.
                      </div>
                    ) : priceLists.filter(pl => pl.isActive).length === 0 ? (
                      <div className="text-amber-600 dark:text-amber-400 text-sm p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                        No hay listas de precios activas. Por favor, active al menos una lista de precios.
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mb-2">Ingrese el precio para cada lista de precios (debe ser mayor a 0)</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {priceLists.filter(pl => pl.isActive).map((priceList, index) => {
                            const priceByList = currentSaleUOM.pricesByList?.find(p => p.priceListId === priceList.id);
                            const hasValue = priceByList && priceByList.price > 0;
                            return (
                              <div key={priceList.id}>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">
                                  {priceList.name}
                                  {priceList.isDefault && <span className="ml-1 text-primary">(Predeterminada)</span>}
                                  <span className="text-destructive ml-1">*</span>
                                </label>
                                <input
                                  id={`salePrice-${priceList.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={priceByList?.price || ''}
                                  onChange={(e) => {
                                    const newPricesByList = [...(currentSaleUOM.pricesByList || [])];
                                    const priceIndex = newPricesByList.findIndex(p => p.priceListId === priceList.id);
                                    const value = parseFloat(e.target.value) || 0;
                                    if (priceIndex !== -1) {
                                      newPricesByList[priceIndex].price = value;
                                    } else {
                                      newPricesByList.push({
                                        priceListId: priceList.id,
                                        price: value
                                      });
                                    }
                                    setCurrentSaleUOM({ ...currentSaleUOM, pricesByList: newPricesByList });
                                    setSaleUOMError({ field: null });
                                  }}
                                  onFocus={(e) => e.target.select()}
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${saleUOMError.field === 'prices' && !hasValue
                                    ? 'border-destructive focus:ring-destructive text-foreground bg-destructive/5'
                                    : hasValue
                                      ? 'border-input focus:ring-primary text-foreground bg-background'
                                      : 'border-amber-300 dark:border-amber-700 focus:ring-amber-500 text-foreground bg-amber-50 dark:bg-amber-900/10'
                                    }`}
                                  placeholder="Ingrese precio"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addSaleUOM}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Agregar Unidad de Venta
                    </button>
                  </div>
                </div>

                {saleUOMs.length > 0 && (
                  <div className="overflow-x-auto">
                    <SortableTable
                      data={saleUOMs}
                      defaultSortKey="order"
                      defaultSortDirection="asc"
                      getSortValue={(uom, key) => {
                        const uomData = uoms?.find(u => u.id === uom.uomId);
                        if (key === 'uomName') return uomData?.name?.toLowerCase() || '';
                        if (key === 'conversionToBase') return Number(uom.conversionToBase);
                        if (key === 'order') return uom.order ?? 0;
                        return '';
                      }}
                      columns={[
                        {
                          key: 'uomName',
                          label: 'Unidad',
                          className: 'text-foreground font-medium',
                          render: (uom) => {
                            const uomData = uoms?.find(u => u.id === uom.uomId);
                            return `${uomData?.name} (${uomData?.code})`;
                          }
                        },
                        {
                          key: 'conversionToBase',
                          label: 'Factor',
                          className: 'text-foreground',
                          render: (uom) => uom.conversionToBase
                        },
                        {
                          key: 'isDefault',
                          label: 'Predeterminado',
                          sortable: false,
                          headerClassName: 'text-center',
                          className: 'text-center',
                          render: (uom, index) => (
                            <input
                              type="radio"
                              checked={uom.isDefault}
                              onChange={() => setDefaultSaleUOM(index)}
                              className="w-4 h-4 text-primary focus:ring-primary"
                            />
                          )
                        },
                        ...(priceLists?.filter(pl => pl.isActive).map(priceList => ({
                          key: `price-${priceList.id}`,
                          label: (
                            <>
                              {priceList.name}
                              {priceList.isDefault && <span className="ml-1 text-primary text-xs">(Def)</span>}
                            </>
                          ) as any,
                          sortable: false,
                          render: (uom: UOMOption, uomIndex: number) => {
                            const priceByList = uom.pricesByList?.find(p => p.priceListId === priceList.id);
                            return (
                              <PriceInput
                                value={priceByList?.price || 0}
                                onChange={(newPrice) => {
                                  const newSaleUOMs = saleUOMs.map((su, idx) => {
                                    if (idx !== uomIndex) return su;

                                    const newPricesByList = su.pricesByList ? [...su.pricesByList] : [];
                                    const priceIndex = newPricesByList.findIndex(
                                      p => p.priceListId === priceList.id
                                    );

                                    if (priceIndex !== -1) {
                                      newPricesByList[priceIndex] = { ...newPricesByList[priceIndex], price: newPrice };
                                    } else {
                                      newPricesByList.push({
                                        priceListId: priceList.id,
                                        price: newPrice
                                      });
                                    }

                                    return { ...su, pricesByList: newPricesByList };
                                  });
                                  setSaleUOMs(newSaleUOMs);
                                }}
                                className="w-28 px-2 py-1 border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground font-semibold"
                                placeholder="0.00"
                              />
                            );
                          }
                        })) || []),
                        {
                          key: 'actions',
                          label: '',
                          sortable: false,
                          className: 'text-right',
                          render: (_uom, index) => (
                            <button
                              type="button"
                              onClick={() => removeSaleUOM(index)}
                              className="text-destructive hover:text-destructive/80 text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          )
                        }
                      ]}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <Link
                  href="/products"
                  className="px-6 py-2 border border-input text-foreground rounded-md hover:bg-muted"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>

            {showCategoryModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 border border-border">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">Nueva Categoría</h3>
                  </div>

                  <form onSubmit={handleCreateCategory} className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      El código se generará automáticamente basándose en el nombre
                    </p>

                    <div>
                      <label htmlFor="categoryName" className="block text-sm font-medium text-foreground mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        id="categoryName"
                        required
                        value={newCategoryData.name}
                        onChange={(e) => setNewCategoryData({ ...newCategoryData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        placeholder="Bebidas"
                      />
                    </div>

                    <div>
                      <label htmlFor="categoryDescription" className="block text-sm font-medium text-foreground mb-2">
                        Descripción
                      </label>
                      <textarea
                        id="categoryDescription"
                        rows={2}
                        value={newCategoryData.description}
                        onChange={(e) => setNewCategoryData({ ...newCategoryData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        placeholder="Descripción opcional"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryModal(false);
                          setNewCategoryData({ name: '', description: '' });
                        }}
                        className="px-4 py-2 border border-input text-foreground rounded-md hover:bg-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingCategory}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingCategory ? 'Creando...' : 'Crear Categoría'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showUOMModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 border border-border">
                  <div className="px-6 py-4 border-b border-border">
                    <h3 className="text-lg font-semibold text-foreground">Nueva Unidad de Medida</h3>
                  </div>

                  <form onSubmit={handleCreateUOM} className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      El código se generará automáticamente basándose en el nombre
                    </p>

                    <div>
                      <label htmlFor="uomName" className="block text-sm font-medium text-foreground mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        id="uomName"
                        required
                        value={newUOMData.name}
                        onChange={(e) => setNewUOMData({ ...newUOMData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        placeholder="Caja Grande"
                      />
                    </div>

                    <div>
                      <label htmlFor="uomType" className="block text-sm font-medium text-foreground mb-2">
                        Tipo de Unidad *
                      </label>
                      <select
                        id="uomType"
                        required
                        value={newUOMData.type}
                        onChange={(e) => setNewUOMData({ ...newUOMData, type: e.target.value })}
                        className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                      >
                        <option value="Discrete">Discreta (unidades, cajas, paquetes)</option>
                        <option value="Weight">Peso (kg, gr, lb)</option>
                        <option value="Volume">Volumen (litros, ml, galones)</option>
                        <option value="Length">Longitud (metros, cm, pulgadas)</option>
                        <option value="Area">Área (m²)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="uomDescription" className="block text-sm font-medium text-foreground mb-2">
                        Descripción
                      </label>
                      <textarea
                        id="uomDescription"
                        rows={2}
                        value={newUOMData.description}
                        onChange={(e) => setNewUOMData({ ...newUOMData, description: e.target.value })}
                        className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                        placeholder="Descripción opcional"
                      />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUOMModal(false);
                          setNewUOMData({ name: '', description: '', type: 'Discrete' });
                        }}
                        className="px-4 py-2 border border-input text-foreground rounded-md hover:bg-muted"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isCreatingUOM}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingUOM ? 'Creando...' : 'Crear Unidad'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
