'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useProducts } from '@/hooks/useInventory';
import { usePriceLists, type PriceList } from '@/hooks/usePriceLists';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import apiClient from '@/lib/axios';
import type { CartItem, SaleRequest } from '@/types/sales';
import type { Product } from '@/types/inventory';
import { BusinessConfig } from '@/config/business.config';
import { usePaymentMethods, calculateChangeLocal, calculateChangeServer, type CalculateChangeResponse, type PaymentMethodConfig as PMConfig } from '@/hooks/usePaymentMethods';
const printTicketFromBackend = async (
  saleId: string,
  settings: {
    storeName: string;
    storeAddress: string;
    [key: string]: any
  }
) => {
  try {
    const response = await apiClient.post(`/api/sales/${saleId}/ticket`, settings, {
      responseType: 'blob'
    });

    const blob = response.data;
    const url = window.URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');

    if (!printWindow) {
      toast.error('Por favor habilita las ventanas emergentes para imprimir');
      return;
    }

    printWindow.focus();

  } catch (error) {
    console.error('Error printing ticket:', error);
    toast.error('Hubo un error al generar el ticket de venta.');
  }
};


import { Autocomplete } from '@/components/ui/autocomplete'; // Add Autocomplete import
import { useCustomers, createCustomer } from '@/hooks/useCustomers'; // Add createCustomer
import { CreateCustomerRequest, DocumentType } from '@/types/customer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import AppLayout from '@/components/layout/AppLayout';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useCashShift } from '@/hooks/useCashShift';
import { CashControl } from '@/components/CashControl/CashControl';
import { Lock, AlertTriangle } from 'lucide-react';

import type { ProductSaleUOM } from '@/types/inventory';


const getDefaultSaleUOM = (product: Product): ProductSaleUOM | undefined => {
  return product.saleUOMs?.find(uom => uom.isDefault) || product.saleUOMs?.[0];
};


const getProductPrice = (product: Product, priceListCode: string, uomId?: string): number => {
  const saleUOM = uomId
    ? product.saleUOMs?.find(uom => uom.uomId === uomId)
    : getDefaultSaleUOM(product);

  if (!saleUOM) {
    return product.salePrice || 0;
  }

  const priceEntry = saleUOM.prices?.find(p => p.priceListCode === priceListCode);

  if (priceEntry) {
    return priceEntry.price;
  }

  return saleUOM.price || product.salePrice || 0;
};


const getDefaultUOMName = (product: Product): string => {
  const defaultSaleUOM = getDefaultSaleUOM(product);
  return defaultSaleUOM?.uomName || 'UND';
};

// Get the conversion to base for the default sale UOM
const getDefaultUOMConversion = (product: Product): number => {
  const defaultSaleUOM = getDefaultSaleUOM(product);
  return defaultSaleUOM?.conversionToBase || 1;
};

export default function POSPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const { data: products, isLoading } = useProducts(user?.currentStoreId);
  const { customers, isLoading: isLoadingCustomers, refresh: refreshCustomers } = useCustomers(); // Use customers hook
  const { data: priceLists, isLoading: isLoadingPriceLists } = usePriceLists();
  const { data: companySettings } = useCompanySettings();
  const { data: paymentMethods } = usePaymentMethods();

  // Cash Shift Status
  const { data: openShift, isLoading: isLoadingShift } = useCashShift(user?.currentStoreId);
  const isShiftOpen = !!openShift;

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(''); // Customer State
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showProductGrid, setShowProductGrid] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [selectedPriceList, setSelectedPriceList] = useState('');
  const [isScaleConnecting, setIsScaleConnecting] = useState(false);
  const [scaleWeight, setScaleWeight] = useState<number | null>(null);

  // Diagnostic Status (Transactor 999 style)
  const [hwStatus, setHwStatus] = useState({
    scale: { connected: false, required: true, loading: true },
    printer: { connected: false, required: true, loading: false, lastTest: null as string | null },
    internet: { connected: true, loading: false }
  });

  // Keyboard navigation states
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  const [focusMode, setFocusMode] = useState<'search' | 'products' | 'cart' | 'payment'>('search');

  // Local states for inputs to allow decimals (0.5, 0.75)
  const [rawAmountReceived, setRawAmountReceived] = useState('0.00');
  const [rawQuantities, setRawQuantities] = useState<Record<string, string>>({});
  const [changeResult, setChangeResult] = useState<CalculateChangeResponse | null>(null);

  // Old shift warning
  const [showOldShiftWarning, setShowOldShiftWarning] = useState(false);

  // Weight Entry Modal States
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightModalProduct, setWeightModalProduct] = useState<Product | null>(null);
  const [modalWeight, setModalWeight] = useState<string>('');
  const [modalUomId, setModalUomId] = useState<string>('');
  const weightInputRef = useRef<HTMLInputElement>(null);

  const openWeightModal = (product: Product, uomId?: string) => {
    setWeightModalProduct(product);
    setModalUomId(uomId || getDefaultSaleUOM(product)?.uomId || '');
    setModalWeight('');
    setIsWeightModalOpen(true);
    // Focus after dialog animation
    setTimeout(() => weightInputRef.current?.focus(), 200);
  };

  const parseModalWeight = (val: string): number => {
    let clean = val.replace(',', '.').toLowerCase().trim();
    let num = parseFloat(clean);
    if (isNaN(num)) return 0;
    // Gram support: if it's explicitly grams, divide by 1000
    if (clean.endsWith('g') || clean.endsWith('gr')) return num / 1000;
    return num;
  };

  const handleAddWeightToCart = () => {
    if (!weightModalProduct || !modalWeight) return;

    let parsed = parseModalWeight(modalWeight);

    if (parsed > 0) {
      addToCart(weightModalProduct.id, parsed, modalUomId);
      setIsWeightModalOpen(false);
      setWeightModalProduct(null);
      setModalWeight('');
      setSearchTerm('');
    } else {
      toast.error('Ingrese un peso válido');
    }
  };

  // Real-time authoritative change calculation from 'Medios' service
  useEffect(() => {
    const fetchChange = async () => {
      const received = parseFloat(amountReceived);
      const total = calculateTotal();
      const selectedMethodConfig = paymentMethods?.find(m => m.name === paymentMethod);

      if (isNaN(received) || total <= 0) {
        setChangeResult(null);
        return;
      }

      try {
        const result = await calculateChangeServer({
          totalAmount: total,
          amountReceived: received,
          appliesRounding: selectedMethodConfig?.appliesRounding ?? false
        });
        setChangeResult(result);
      } catch (err) {
        // Fallback to local if server fails (silent)
        setChangeResult(calculateChangeLocal(total, received, selectedMethodConfig?.appliesRounding ?? false));
      }
    };

    const timeout = setTimeout(fetchChange, 150); // Small debounce
    return () => clearTimeout(timeout);
  }, [amountReceived, cart, paymentMethod, paymentMethods]);

  // Reset selection index when search term changes
  useEffect(() => {
    setSelectedProductIndex(0);
  }, [searchTerm]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const paymentMethodRef = useRef<HTMLSelectElement>(null);
  const amountReceivedRef = useRef<HTMLInputElement>(null);
  const processButtonRef = useRef<HTMLButtonElement>(null);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cartItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const productsContainerRef = useRef<HTMLDivElement>(null);

  // Quick Create Customer State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [documentType, setDocumentType] = useState('03'); // Default 03=Boleta

  const [newCustomerData, setNewCustomerData] = useState<CreateCustomerRequest>({
    documentType: DocumentType.DNI,
    documentNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    creditLimit: 0
  });

  // Check for shifts from previous days
  useEffect(() => {
    if (openShift && openShift.startTime) {
      const shiftDate = new Date(openShift.startTime);
      const today = new Date();

      // Compare dates (ignoring time)
      const isDifferentDay =
        shiftDate.getDate() !== today.getDate() ||
        shiftDate.getMonth() !== today.getMonth() ||
        shiftDate.getFullYear() !== today.getFullYear();

      if (isDifferentDay) {
        setShowOldShiftWarning(true);
      } else {
        setShowOldShiftWarning(false);
      }
    }
  }, [openShift]);

  // Set default price list when data loads
  useEffect(() => {
    if (priceLists && priceLists.length > 0 && !selectedPriceList) {
      const defaultList = priceLists.find(pl => pl.isDefault) || priceLists[0];
      setSelectedPriceList(defaultList.code);
    }
  }, [priceLists, selectedPriceList]);

  useEffect(() => {
    const runDiagnostics = async () => {
      console.log('--- SYSTEM CHECK 999 ---');

      // Check Scale
      if ('serial' in navigator) {
        // @ts-ignore
        const ports = await navigator.serial.getPorts();
        setHwStatus(prev => ({
          ...prev,
          scale: { ...prev.scale, connected: ports.length > 0, loading: false }
        }));
      } else {
        setHwStatus(prev => ({
          ...prev,
          scale: { ...prev.scale, connected: false, loading: false }
        }));
      }

      // Check Internet
      const isOnline = navigator.onLine;
      setHwStatus(prev => ({
        ...prev,
        internet: { connected: isOnline, loading: false }
      }));

      try {
        // @ts-ignore
        const ports = 'serial' in navigator ? await navigator.serial.getPorts() : [];
        await apiClient.post('/api/sales/diagnostics', {
          deviceName: 'Balanza',
          isConnected: ports.length > 0,
          errorMessage: ports.length === 0 ? 'No se detectaron puertos seriales activos' : null
        });

        await apiClient.post('/api/sales/diagnostics', {
          deviceName: 'Internet',
          isConnected: isOnline
        });
      } catch (err) {
        console.warn('No se pudo enviar el reporte de diagnóstico al backend.');
      }
    };

    runDiagnostics();
    window.addEventListener('online', () => setHwStatus(p => ({ ...p, internet: { ...p.internet, connected: true } })));
    window.addEventListener('offline', () => setHwStatus(p => ({ ...p, internet: { ...p.internet, connected: false } })));
  }, []);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  useEffect(() => {
    if (selectedCustomerId) {
      refreshCustomers();
    }
  }, [selectedCustomerId]);

  const { searchTermToFilter, quantityToAddFromSearch } = useMemo(() => {
    if (!searchTerm.trim()) return { searchTermToFilter: '', quantityToAddFromSearch: 1 };

    let quantityToAdd = 1;
    let actualSearchTerm = searchTerm;

    if (searchTerm.includes('*')) {
      const parts = searchTerm.split('*');
      let qtyPart = parts[0].trim().toLowerCase();
      let qty = parseFloat(qtyPart);

      if (qtyPart.endsWith('g') || qtyPart.endsWith('gr')) {
        qty = qty / 1000;
      }

      if (!isNaN(qty) && qty > 0) {
        quantityToAdd = qty;
        actualSearchTerm = parts[1]?.trim() || '';
      }
    } else if (searchTerm.toLowerCase().includes('x')) {
      const parts = searchTerm.split(/x/i);
      const qty = parseFloat(parts[0]);
      if (!isNaN(qty) && qty > 0 && parts[1] !== undefined) {
        quantityToAdd = qty;
        actualSearchTerm = parts[1]?.trim() || '';
      }
    }
    return { searchTermToFilter: actualSearchTerm, quantityToAddFromSearch: quantityToAdd };
  }, [searchTerm]);

  const filteredProducts = products?.filter((product) =>
    product.isActive && (
      product.name.toLowerCase().includes(searchTermToFilter.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTermToFilter.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchTermToFilter.toLowerCase())) ||
      (product.shortScanCode && product.shortScanCode.toLowerCase().includes(searchTermToFilter.toLowerCase())) ||
      product.saleUOMs?.some(u => u.barcode && u.barcode.toLowerCase().includes(searchTermToFilter.toLowerCase()))
    )
  );

  // Comprehensive keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Global shortcuts
      if (e.key === 'F2') {
        e.preventDefault();
        setFocusMode('search');
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === 'F9' && cart.length > 0) {
        e.preventDefault();
        if (isPaymentValid()) {
          handleProcessSale();
        } else {
          setFocusMode('payment');
          paymentMethodRef.current?.focus();
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setSearchTerm('');
        setShowProductGrid(false);
        setFocusMode('search');
        searchInputRef.current?.focus();
        return;
      }

      // Navigation based on focus mode
      if (focusMode === 'search') {
        // Only handle arrow down if we're NOT in the input field
        // (input field has its own handler)
        const isInInput = document.activeElement === searchInputRef.current;
        if (!isInInput && e.key === 'ArrowDown' && filteredProducts && filteredProducts.length > 0) {
          e.preventDefault();
          setFocusMode('products');
          setSelectedProductIndex(0);
          setShowProductGrid(true);
        }
      }

      if (focusMode === 'products') {
        const COLUMNS = 2; // Grid has 2 columns

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedProductIndex(prev => {
            // Move down in the same column (add COLUMNS to index)
            const newIndex = Math.min(prev + COLUMNS, (filteredProducts?.length || 1) - 1);
            productRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return newIndex;
          });
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedProductIndex(prev => {
            // Move up in the same column (subtract COLUMNS from index)
            const newIndex = Math.max(prev - COLUMNS, 0);
            productRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return newIndex;
          });
        }

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setSelectedProductIndex(prev => {
            // Move to the right (next item in row)
            const newIndex = Math.min(prev + 1, (filteredProducts?.length || 1) - 1);
            productRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return newIndex;
          });
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setSelectedProductIndex(prev => {
            // Move to the left (previous item in row)
            const newIndex = Math.max(prev - 1, 0);
            productRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return newIndex;
          });
        }

        if (e.key === 'Enter' && filteredProducts && filteredProducts[selectedProductIndex]) {
          // If we are in the search input, let its local handler deal with it (Priority 1: exact match)
          if (document.activeElement === searchInputRef.current) return;

          e.preventDefault();
          if (!searchTerm.trim()) return;

          const p = filteredProducts[selectedProductIndex];
          if (p.allowFractional && quantityToAddFromSearch === 1) {
            openWeightModal(p);
          } else {
            addToCart(p.id, quantityToAddFromSearch);
          }
          setSelectedProductIndex(0);
        }

        if (e.key === 'Tab') {
          e.preventDefault();
          if (cart.length > 0) {
            setFocusMode('cart');
            setSelectedCartIndex(0);
          }
        }

        if (e.key === 'Escape') {
          e.preventDefault();
          setFocusMode('search');
          searchInputRef.current?.focus();
        }
      }

      if (focusMode === 'cart') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedCartIndex(prev => {
            const newIndex = Math.min(prev + 1, cart.length - 1);
            cartItemRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return newIndex;
          });
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedCartIndex(prev => {
            const newIndex = Math.max(prev - 1, 0);
            cartItemRefs.current[newIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return newIndex;
          });
        }

        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          const item = cart[selectedCartIndex];
          if (item) {
            updateQuantity(item.productId, item.uomId, item.quantity + 1);
          }
        }

        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          const item = cart[selectedCartIndex];
          if (item) {
            updateQuantity(item.productId, item.uomId, item.quantity - 1);
          }
        }

        if (e.key === 'Delete' || (e.key === 'Backspace' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          const item = cart[selectedCartIndex];
          if (item) {
            removeFromCart(item.productId, item.uomId);
            setSelectedCartIndex(Math.max(0, selectedCartIndex - 1));
          }
        }

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setFocusMode('products');
          setShowProductGrid(true);
        }

        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          setFocusMode('payment');
          paymentMethodRef.current?.focus();
        }
      }

      if (focusMode === 'payment') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setFocusMode('cart');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, selectedProductIndex, selectedCartIndex, cart, filteredProducts]);

  // Reset selected product index when search changes
  useEffect(() => {
    setSelectedProductIndex(0);
    if (searchTerm && filteredProducts && filteredProducts.length > 0) {
      setShowProductGrid(true);
      setFocusMode('products');
    }
  }, [searchTerm]);

  if (!_hasHydrated || !isAuthenticated) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return `${BusinessConfig.currency.symbol} ${value.toFixed(2)}`;
  };

  // Customer Options for Autocomplete
  const customerOptions = customers?.map(c => ({
    id: c.id,
    code: c.documentNumber,
    name: c.fullName
  })) || [];

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  const addToCart = (productId: string, requestedQuantity: number = 1, forceUomId?: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    // 1. Initial choice: Forced UOM or Default UOM
    let targetUOM = forceUomId
      ? product.saleUOMs?.find(u => u.uomId === forceUomId)
      : getDefaultSaleUOM(product);

    let conversionToBase = targetUOM?.conversionToBase || 1;
    const currentStock = product.currentStock || 0;

    // 2. Calculate available stock considering items already in cart
    const stockUsedByOthers = cart.reduce((acc, item) => {
      if (item.productId === productId) {
        return acc + (item.quantity * item.conversionToBase);
      }
      return acc;
    }, 0);

    const availableStockBase = currentStock - stockUsedByOthers;

    if (availableStockBase <= 0) {
      toast.error(`Sin stock disponible para ${product.name}.`);
      return;
    }

    // 3. SMART FALLBACK: If default UOM is not enough for even 1 unit, find the largest UOM that DOES have stock
    // If fractional is allowed, we don't floor for the base units check
    let availableInSelected = (product.allowFractional || conversionToBase > 1)
      ? availableStockBase / conversionToBase
      : Math.floor(availableStockBase / conversionToBase);

    if (availableInSelected <= 0.001) { // Use small epsilon for decimal precision
      const betterUOM = product.saleUOMs
        ?.filter(u => u.isActive !== false)
        .sort((a, b) => b.conversionToBase - a.conversionToBase)
        .find(u => {
          const avail = availableStockBase / (u.conversionToBase || 1);
          return product.allowFractional ? avail > 0.001 : Math.floor(avail) > 0;
        });

      if (betterUOM) {
        targetUOM = betterUOM;
        conversionToBase = targetUOM.conversionToBase || 1;
        availableInSelected = availableStockBase / conversionToBase;
        toast.info(`Se cambió a ${targetUOM.uomName} por disponibilidad de stock.`);
      } else {
        toast.error(`No hay stock suficiente para la unidad de medida disponible.`);
        return;
      }
    }

    // 4. Quantity Adjustment: Don't exceed available stock
    let finalQuantityToAdd = requestedQuantity;
    const requestedBaseQty = finalQuantityToAdd * conversionToBase;

    if (availableStockBase < requestedBaseQty - 0.0001) {
      // If it's a fractional sale (like grams/scale), we allow precision
      const possibleQty = availableStockBase / conversionToBase;
      finalQuantityToAdd = product.allowFractional ? possibleQty : Math.floor(possibleQty);

      if (finalQuantityToAdd > 0) {
        toast.warning(`Stock insuficiente. Solo se agregaron ${finalQuantityToAdd.toFixed(3)} ${targetUOM?.uomName}.`);
      }
    }

    if (finalQuantityToAdd <= 0) return;

    // 5. Finalize adding to cart
    const price = getProductPrice(product, selectedPriceList, targetUOM?.uomId);

    // Add logic for Scale Connection
    const connectToScale = async (pId: string, uId: string) => {
      if (!('serial' in navigator)) {
        toast.error('Tu navegador no soporta conexión con balanzas. Usa Chrome o Edge.');
        return;
      }
      try {
        setIsScaleConnecting(true);
        // @ts-ignore
        const port = await (navigator as any).serial.requestPort();
        await port.open({ baudRate: 9600 });
        const decoder = new TextDecoderStream();
        port.readable.pipeTo(decoder.writable);
        const reader = decoder.readable.getReader();
        let rawData = '';
        const timeout = setTimeout(() => reader.cancel(), 3000);
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          rawData += value;
          const weightMatch = rawData.match(/[-+]?[0-9]*\.?[0-9]+/);
          if (weightMatch) {
            const weight = parseFloat(weightMatch[0]);
            if (!isNaN(weight) && weight > 0) {
              addToCart(pId, weight, uId);
              break;
            }
          }
        }
        await reader.releaseLock();
        await port.close();
        clearTimeout(timeout);
      } catch (err) {
        console.error(err);
      } finally { setIsScaleConnecting(false); }
    };
    (window as any).connectToScale = connectToScale;


    const existingItemIndex = cart.findIndex(item => item.productId === productId && item.uomId === targetUOM?.uomId);
    const existingItem = existingItemIndex !== -1 ? cart[existingItemIndex] : undefined;

    if (existingItem) {
      const newQuantity = existingItem.quantity + finalQuantityToAdd;
      setCart(cart.map((item, idx) =>
        idx === existingItemIndex
          ? { ...item, quantity: newQuantity, subtotal: Math.round(newQuantity * item.price * 100) / 100 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: finalQuantityToAdd,
        price: price,
        subtotal: Math.round(price * finalQuantityToAdd * 100) / 100,
        conversionToBase: conversionToBase,
        uomId: targetUOM?.uomId || '',
        uomCode: targetUOM?.uomCode || 'UND',
        uomName: targetUOM?.uomName || 'Unidad',
      }]);
    }

    // 6. Focus Management
    const targetIndex = existingItemIndex !== -1 ? existingItemIndex : cart.length;
    setFocusMode('cart');
    setSelectedCartIndex(targetIndex);

    setTimeout(() => {
      quantityInputRefs.current[targetIndex]?.focus();
      quantityInputRefs.current[targetIndex]?.select();
    }, 50);
  };

  const updateCartItemUOM = (productId: string, currentUomId: string, newUomId: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    const newUOM = product.saleUOMs?.find(uom => uom.uomId === newUomId);
    if (!newUOM) return;

    const itemIndex = cart.findIndex(i => i.productId === productId && i.uomId === currentUomId);
    if (itemIndex === -1) return;
    const item = cart[itemIndex];

    const newPrice = getProductPrice(product, selectedPriceList, newUomId);

    // STOCK CHECK
    // Calculate stock used by ALL OTHER items of this product
    const stockUsedByOthers = cart.reduce((acc, cItem, idx) => {
      if (cItem.productId === productId && idx !== itemIndex) {
        return acc + (cItem.quantity * cItem.conversionToBase);
      }
      return acc;
    }, 0);

    const thisItemStockNeeded = item.quantity * newUOM.conversionToBase;
    const totalStockNeeded = stockUsedByOthers + thisItemStockNeeded;
    const currentStock = product.currentStock || 0;

    if (currentStock < totalStockNeeded) {
      toast.warning(`Stock insuficiente para cambiar a ${newUOM.uomName}. Total requerido: ${totalStockNeeded}. Stock disponible: ${currentStock}.`);
      return;
    }

    setCart(cart.map((cartItem, idx) =>
      idx === itemIndex
        ? {
          ...cartItem,
          uomId: newUOM.uomId,
          uomCode: newUOM.uomCode,
          uomName: newUOM.uomName,
          conversionToBase: newUOM.conversionToBase,
          price: newPrice,
          subtotal: cartItem.quantity * newPrice,
        }
        : cartItem
    ));
  };

  const updateQuantity = (productId: string, uomId: string, newQuantity: number, isBlur = false) => {
    // We allow 0 quantity to support the "empty input" state in the UI
    if (newQuantity < 0) return;

    const product = products?.find(p => p.id === productId);
    if (!product) return;

    const itemIndex = cart.findIndex(i => i.productId === productId && i.uomId === uomId);
    if (itemIndex === -1) return;
    const item = cart[itemIndex];

    // STOCK CHECK
    const stockUsedByOthers = cart.reduce((acc, cItem, idx) => {
      if (cItem.productId === productId && idx !== itemIndex) {
        return acc + (cItem.quantity * cItem.conversionToBase);
      }
      return acc;
    }, 0);

    const thisItemStockNeeded = newQuantity * item.conversionToBase;
    const totalStockNeeded = stockUsedByOthers + thisItemStockNeeded;
    const currentStock = product.currentStock || 0;

    const isExceeded = currentStock < totalStockNeeded - 0.0001;
    // Lenicencia temporal si es fraccionario y parece que están escribiendo gramos (ej: escribieron 200 pero falta la 'g')
    const isTypingGrams = !isBlur && product.allowFractional && isExceeded && (newQuantity / 1000 <= currentStock + 0.01);

    if (isExceeded && !isTypingGrams) {
      const availableInThisUOM = (product.allowFractional)
        ? (currentStock - stockUsedByOthers) / item.conversionToBase
        : Math.floor((currentStock - stockUsedByOthers) / item.conversionToBase);

      const displayQty = (product.allowFractional || availableInThisUOM % 1 !== 0)
        ? availableInThisUOM.toFixed(3)
        : availableInThisUOM.toString();

      toast.warning(`Stock insuficiente. Solo quedan ${displayQty} ${item.uomName} disponibles.`);
      return;
    }

    setCart(cart.map((cartItem, idx) =>
      idx === itemIndex
        ? { ...cartItem, quantity: newQuantity, subtotal: Math.round(newQuantity * cartItem.price * 100) / 100 }
        : cartItem
    ));
  };

  const removeFromCart = (productId: string, uomId: string) => {
    setCart(cart.filter(item => !(item.productId === productId && item.uomId === uomId)));
  };

  // El total es la suma de los precios de venta (que ya incluyen IGV)
  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // Calcular el valor de venta (base gravable) - precio sin IGV
  const calculateBaseAmount = () => {
    if (BusinessConfig.tax.pricesIncludeTax) {
      // Si los precios incluyen IGV, extraemos la base: total / (1 + tasa)
      return calculateTotal() / (1 + BusinessConfig.tax.igvRate);
    }
    return calculateTotal();
  };

  // Calcular el IGV incluido en el precio
  const calculateIGV = () => {
    if (BusinessConfig.tax.pricesIncludeTax) {
      // IGV = Total - Base gravable
      return calculateTotal() - calculateBaseAmount();
    }
    return calculateTotal() * BusinessConfig.tax.igvRate;
  };



  const isPaymentValid = () => {
    const selectedMethodConfig = paymentMethods?.find(m => m.name === paymentMethod);

    if (selectedMethodConfig?.generatesDebt) {
      if (!selectedCustomer) return false;
      const total = calculateTotal();
      return selectedCustomer.availableCredit >= total;
    }
    if (!selectedMethodConfig?.requiresAmountReceived) return true;
    return changeResult?.isPaymentSufficient ?? false;
  };

  // Keyboard navigation handlers
  const handlePaymentMethodKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const selectedMethodConfig = paymentMethods?.find(m => m.name === paymentMethod);
      if (selectedMethodConfig?.requiresAmountReceived) {
        amountReceivedRef.current?.focus();
        amountReceivedRef.current?.select();
      } else {
        processButtonRef.current?.focus();
      }
    }
  };

  const handleAmountReceivedKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isPaymentValid()) {
        handleProcessSale();
      }
    }
  };

  const handleProcessSale = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'Crédito') {
      if (!selectedCustomer) {
        toast.warning('Debe seleccionar un cliente para ventas a crédito.');
        return;
      }
      if (calculateTotal() > selectedCustomer.availableCredit) {
        toast.warning(`Crédito insuficiente. Disponible: ${formatCurrency(selectedCustomer.availableCredit)}`);
        return;
      }
    } else if (!isPaymentValid()) {
      toast.warning('El monto recibido es insuficiente. Por favor ingrese un monto mayor o igual al total.');
      return;
    }

    // Validate Factura requirements
    if (documentType === '01') {
      if (!selectedCustomer) {
        toast.warning('Para emitir una Factura, es obligatorio seleccionar un cliente.');
        return;
      }
      // Check for RUC (11 digits)
      const docNum = selectedCustomer.documentNumber?.replace(/\D/g, '') || '';
      if (docNum.length !== 11) {
        toast.warning('Para emitir una Factura, el cliente debe tener un RUC válido (11 dígitos).');
        return;
      }
    }

    setIsProcessing(true);
    setSuccessMessage('');

    try {
      // ATOMIC OPERATION: Create full sale with items and payments in one go
      const selectedMethod = BusinessConfig.payment.methods.find(m => m.name === paymentMethod);

      const payload = {
        customerId: selectedCustomerId || null,
        notes: null,
        cashierName: user?.fullName || 'Usuario',
        documentType: documentType,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          quantity: item.quantity,
          unitPrice: item.price,
          discountAmount: 0,
          conversionToBase: item.conversionToBase,
          uomId: item.uomId || null,
          uomCode: item.uomCode || null
        })),
        payments: [{
          method: selectedMethod?.id || 1,
          amount: calculateTotal(),
          reference: null
        }]
      };

      const createResponse = await apiClient.post('/api/sales', payload);
      const saleWithId = createResponse.data;

      // NEW: Call Medios to calculate everything and get cacheKey
      const calculationPayload = {
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          quantity: item.quantity,
          unitPrice: item.price,
          discountAmount: 0,
          conversionToBase: item.conversionToBase,
          uomId: item.uomId || null,
          uomCode: item.uomCode || null
        })),
        amountReceived: parseFloat(rawAmountReceived),
        paymentMethodId: (selectedMethod?.id || '').toString()
      };

      const calculationResponse = await apiClient.post('/api/paymentmethods/calculate-sale', calculationPayload);
      const calculation = calculationResponse.data;

      console.log('✅ Medios calculation:', calculation);

      // Complete sale using the cacheKey from Medios
      console.log('📤 Completing sale with cacheKey:', calculation.cacheKey);
      const completedSale = await apiClient.post(`/api/sales/${saleWithId.id}/complete`, {
        cacheKey: calculation.cacheKey,
        amountReceived: calculation.amountReceived,
        roundingAdjustment: calculation.roundingAdjustment
      });

      console.log('✅ Sale completed:', completedSale.data.id);

      const saleData = {
        ...completedSale.data,
        items: cart,
        subtotal: calculateBaseAmount(),
        tax: calculateIGV(),
        paymentMethod: paymentMethod
      };

      setLastSale(saleData);

      console.log('🖨️ Printing ticket...');
      await printTicketFromBackend(completedSale.data.id, {
        storeName: companySettings?.tradeName || companySettings?.companyName || "Mi Tienda",
        storeAddress: companySettings?.address || "Av. Principal 123, Lima",
        storePhone: companySettings?.phone || "(01) 123-4567",
        storeRuc: companySettings?.ruc || "20123456789",
        headerText: companySettings?.ticketHeader || '',
        footerText: companySettings?.ticketFooter || '¡Gracias por su compra!\\nVuelva pronto',
        logoUrl: companySettings?.logoUrl,
        showLogo: companySettings?.showLogo ?? true,
        ticketWidth: companySettings?.ticketWidth || 80,
        cashierName: user?.fullName || user?.email || 'Usuario'
      });

      console.log('🧹 STARTING CLEANUP...');

      setSuccessMessage(`¡Venta procesada exitosamente! #${completedSale.data.saleNumber}`);

      // Clear all states
      setCart([]);
      setSelectedCustomerId('');
      setSearchTerm('');

      // Clear payment fields
      setAmountReceived('0');
      setRawAmountReceived('0.00');
      setChangeResult(null);
      setPaymentMethod('Efectivo');
      setDocumentType('80');

      // IMPORTANT: Force clear the input field directly via ref
      // This ensures it clears even if React state updates are delayed
      if (amountReceivedRef.current) {
        amountReceivedRef.current.value = '0.00';
      }

      setFocusMode('search');
      setShowProductGrid(false);
      setTimeout(() => { searchInputRef.current?.focus(); }, 150);

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['cash-shift'] });

      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      console.error('Error processing sale:', error);

      let errorMessage = 'Error al procesar la venta';

      if (error.response?.data?.message) {
        if (error.response.data.message.includes("saving the entity changes")) {
          errorMessage = "Error interno al guardar la venta. (Detalle técnico: posible conflicto de datos)";
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (typeof error.response?.data === 'string') {
        errorMessage = error.response.data;
      }

      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const handlePrintTicket = async () => {
    if (!lastSale) return;

    await printTicketFromBackend(lastSale.id, {
      storeName: companySettings?.tradeName || companySettings?.companyName || "Mi Tienda",
      storeAddress: companySettings?.address || "Av. Principal 123, Lima",
      storePhone: companySettings?.phone || "(01) 123-4567",
      storeRuc: companySettings?.ruc || "20123456789",
      headerText: companySettings?.ticketHeader || '',
      footerText: companySettings?.ticketFooter || '¡Gracias por su compra!\nVuelva pronto',
      logoUrl: companySettings?.logoUrl,
      showLogo: companySettings?.showLogo ?? true,
      ticketWidth: companySettings?.ticketWidth || 80,
      cashierName: user?.fullName || user?.email || 'Usuario'
    });
  };

  return (
    <AppLayout>

      {/* Keyboard Shortcuts Help */}
      <div className="bg-gradient-to-r from-card to-muted/50 border-b border-border">
        <div className="max-w-[1800px] mx-auto px-6 py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-primary">⌨️ Atajos:</span>
              <kbd className="px-2 py-1 bg-background border border-border rounded shadow-sm font-mono text-primary">F2</kbd>
              <span className="text-muted-foreground">Buscar</span>
              <kbd className="px-2 py-1 bg-background border border-border rounded shadow-sm font-mono text-primary">↑↓</kbd>
              <span className="text-muted-foreground">Arriba/Abajo</span>
              <kbd className="px-2 py-1 bg-background border border-border rounded shadow-sm font-mono text-primary">←→</kbd>
              <span className="text-muted-foreground">Izq/Der</span>
              <kbd className="px-2 py-1 bg-background border border-border rounded shadow-sm font-mono text-primary">Enter</kbd>
              <span className="text-muted-foreground">Seleccionar</span>
              <kbd className="px-2 py-1 bg-background border border-border rounded shadow-sm font-mono text-primary">Tab</kbd>
              <span className="text-muted-foreground">Carrito</span>
              <kbd className="px-2 py-1 bg-background border border-border rounded shadow-sm font-mono text-primary">+/-</kbd>
              <span className="text-muted-foreground">Cantidad</span>
              <kbd className="px-2 py-1 bg-background border border-border rounded shadow-sm font-mono text-primary">F9</kbd>
              <span className="text-muted-foreground">Procesar</span>
              <kbd className="px-2 py-1 bg-background border border-border rounded shadow-sm font-mono text-primary">ESC</kbd>
              <span className="text-muted-foreground">Limpiar</span>
            </div>
            <div className="flex items-center gap-6">
              {/* Hardware Health Monitor (999) */}
              <Link href="/settings/hardware" className="flex items-center gap-3 px-4 py-2 bg-background/50 border border-border rounded-xl hover:bg-slate-900 transition-colors cursor-pointer group">
                <div className="flex items-center gap-2" title={hwStatus.scale.connected ? 'Balanza Conectada' : 'Balanza NO Detectada'}>
                  <div className={`w-2 h-2 rounded-full ${hwStatus.scale.loading ? 'bg-amber-400 animate-pulse' : hwStatus.scale.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">⚖️ Balanza</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2" title={hwStatus.printer.connected ? 'Ticketera Activa' : 'Ticketera Pendiente de Prueba'}>
                  <div className={`w-2 h-2 rounded-full ${hwStatus.printer.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">🖨️ Ticket</span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2" title={hwStatus.internet.connected ? 'Conexión Cloud OK' : 'Modo Offline'}>
                  <div className={`w-2 h-2 rounded-full ${hwStatus.internet.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">🌐 Red</span>
                </div>
              </Link>

              <div className="flex items-center gap-4">
                <CashControl />
                <div className="text-primary font-semibold hidden md:block">
                  Modo: <span className="px-2 py-1 bg-primary/10 rounded border border-primary/20">{focusMode === 'search' ? '🔍 Búsqueda' : focusMode === 'products' ? '📦 Productos' : focusMode === 'cart' ? '🛒 Carrito' : '💳 Pago'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1800px] mx-auto py-6 px-6 relative min-h-[calc(100vh-140px)]">

        {/* Cash Shift Blocking Overlay */}
        {!isShiftOpen && (
          <div className="absolute inset-0 z-[40] bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-xl border border-dashed border-border transition-all duration-500">
            {isLoadingShift ? (
              <div className="text-center p-8 animate-in fade-in zoom-in duration-300">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-6"></div>
                <h2 className="text-2xl font-bold mb-2">Verificando estado de caja...</h2>
                <p className="text-muted-foreground">Por favor espere un momento.</p>
              </div>
            ) : (
              <div className="text-center p-10 bg-card shadow-2xl rounded-3xl border-2 border-primary/20 max-w-lg animate-in zoom-in duration-300">
                <div className="bg-red-100 dark:bg-red-900/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Lock className="w-12 h-12 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-3xl font-black mb-4 text-foreground">¡Caja Cerrada!</h2>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Para poder realizar ventas, es necesario <strong>Abrir Caja</strong>.
                  <br />
                  Esto nos permite llevar un control seguro del dinero.
                </p>
                <div className="flex justify-center scale-125 transform transition-transform hover:scale-130">
                  <CashControl className="w-full justify-center shadow-xl" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Old Shift Warning Overlay */}
        {isShiftOpen && showOldShiftWarning && (
          <div className="absolute inset-0 z-[45] bg-background/90 backdrop-blur-md flex items-center justify-center rounded-xl border-2 border-amber-500/50 transition-all duration-500">
            <div className="text-center p-12 bg-card shadow-2xl rounded-[3rem] border-t-8 border-amber-500 max-w-xl animate-in fade-in zoom-in duration-500">
              <div className="bg-amber-100 dark:bg-amber-900/40 w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-lg">
                <AlertTriangle className="w-16 h-16 text-amber-600 dark:text-amber-400" />
              </div>

              <h2 className="text-4xl font-black mb-6 text-foreground tracking-tight">Caja del Día Anterior</h2>

              <div className="space-y-4 mb-10 text-left bg-secondary/50 p-6 rounded-2xl border border-border">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium uppercase tracking-wider">Apertura</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {new Date(openShift.startTime).toLocaleDateString()} {new Date(openShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="w-full h-px bg-border/50" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium uppercase tracking-wider">Estado Actual</span>
                  <span className="font-bold text-red-500">PENDIENTE DE CIERRE</span>
                </div>
              </div>

              <p className="text-lg text-muted-foreground mb-10 leading-relaxed font-medium">
                Por seguridad y control financiero, es obligatorio <strong className="text-foreground underline decoration-amber-500 decoration-2 underline-offset-4">cerrar la caja del día anterior</strong> antes de comenzar a vender hoy.
              </p>

              <div className="flex flex-col gap-4 items-center">
                <CashControl className="w-full py-6 text-xl justify-center font-black rounded-2xl shadow-xl hover:shadow-amber-500/20 transition-all active:scale-95" />
                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground/40 mt-2">
                  Verifica tu efectivo antes de cerrar
                </p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/15 border-l-4 border-green-500 text-green-700 dark:text-green-400 px-6 py-4 rounded-lg mb-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{successMessage}</span>
            </div>
            {lastSale && (
              <button
                onClick={handlePrintTicket}
                className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Imprimir Ticket</span>
              </button>
            )}
          </div>
        )}

        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-300 ${!isShiftOpen && !isLoadingShift ? 'opacity-40 pointer-events-none filter blur-[2px]' : ''}`}>
          {/* Búsqueda y productos - 2 columnas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Búsqueda */}
            <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-foreground">Buscar Productos</h3>
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-muted-foreground">Lista de Precios:</label>
                  <select
                    value={selectedPriceList}
                    onChange={(e) => setSelectedPriceList(e.target.value)}
                    className="px-4 py-2 border border-input rounded-lg text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background cursor-pointer hover:border-primary/50 transition min-w-[150px]"
                    disabled={isLoadingPriceLists || !priceLists?.length}
                  >
                    {isLoadingPriceLists ? (
                      <option value="">Cargando...</option>
                    ) : priceLists && priceLists.length > 0 ? (
                      priceLists.filter(pl => pl.isActive).map(priceList => (
                        <option key={priceList.id} value={priceList.code}>
                          {priceList.name}
                        </option>
                      ))
                    ) : (
                      <option value="">Sin listas</option>
                    )}
                  </select>
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">Atajos: F2 para Buscar • ESC para Limpiar</span>
                </div>
              </div>

              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Busque un producto aquí o escanee el código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => {
                    setShowProductGrid(true);
                    setFocusMode('search');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && filteredProducts && filteredProducts.length > 0) {
                      e.preventDefault();
                      setFocusMode('products');
                      setSelectedProductIndex(0);
                      setShowProductGrid(true);
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!searchTerm.trim()) return;

                      if (filteredProducts && filteredProducts.length > 0) {
                        // Priority 1: If there is an exact match in code or name
                        let matchedUomId: string | undefined;
                        const exactMatch = filteredProducts.find(p => {
                          if (p.code.toLowerCase() === searchTermToFilter.toLowerCase() ||
                            p.name.toLowerCase() === searchTermToFilter.toLowerCase() ||
                            (p.barcode && p.barcode.toLowerCase() === searchTermToFilter.toLowerCase()) ||
                            (p.shortScanCode && p.shortScanCode.toLowerCase() === searchTermToFilter.toLowerCase())) {
                            return true;
                          }
                          const uomMatch = p.saleUOMs?.find(u => u.barcode && u.barcode.toLowerCase() === searchTermToFilter.toLowerCase());
                          if (uomMatch) {
                            matchedUomId = uomMatch.uomId;
                            return true;
                          }
                          return false;
                        });

                        if (exactMatch) {
                          if (exactMatch.allowFractional && quantityToAddFromSearch === 1) {
                            openWeightModal(exactMatch, matchedUomId);
                          } else {
                            addToCart(exactMatch.id, quantityToAddFromSearch, matchedUomId);
                            setSearchTerm('');
                          }
                        } else if (filteredProducts.length === 1) {
                          // Priority 2: If only one result, add it
                          const p = filteredProducts[0];
                          if (p.allowFractional && quantityToAddFromSearch === 1) {
                            openWeightModal(p);
                          } else {
                            addToCart(p.id, quantityToAddFromSearch);
                            setSearchTerm('');
                          }
                        } else {
                          // Priority 3: Use the CURRENTLY SELECTED product (navigation with arrows)
                          const currentSelected = filteredProducts[selectedProductIndex];
                          if (currentSelected) {
                            if (currentSelected.allowFractional && quantityToAddFromSearch === 1) {
                              openWeightModal(currentSelected);
                            } else {
                              addToCart(currentSelected.id, quantityToAddFromSearch);
                              setSearchTerm('');
                            }
                          }
                        }
                      }
                    }
                  }}
                  className={`w-full px-5 py-5 text-xl font-bold border-2 rounded-2xl focus:outline-none transition-all ${focusMode === 'search'
                    ? 'border-primary ring-4 ring-primary/10 bg-background shadow-xl'
                    : 'border-input bg-muted/5'
                    }`}
                  autoFocus
                />
                <div className="flex justify-end mt-2 px-2">
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        searchInputRef.current?.focus();
                      }}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest">Limpiar</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {isLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-4">Cargando productos...</p>
                </div>
              )}

              {!isLoading && searchTerm && (
                <div
                  ref={productsContainerRef}
                  tabIndex={-1}
                  className="mt-4 max-h-[520px] overflow-y-auto overflow-x-hidden focus:outline-none pr-1 custom-scrollbar"
                >
                  <div className="flex justify-between items-center mb-2 px-1">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-2">
                      <span className="bg-primary/20 text-primary px-1 rounded font-bold">↵ Enter</span> para unidad pdt.
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-2">
                      <span className="bg-primary/20 text-primary px-1 rounded font-bold">Click</span> en etiqueta para unidad específica
                    </p>
                  </div>
                  {filteredProducts && filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredProducts.map((product, index) => {
                        const stock = product.currentStock || 0;
                        const inCartBase = cart.filter(item => item.productId === product.id)
                          .reduce((acc, item) => acc + (item.quantity * item.conversionToBase), 0);
                        const effectiveStock = Math.max(0, stock - inCartBase);
                        const isOutOfStock = effectiveStock <= 0;
                        const isLowStock = effectiveStock > 0 && effectiveStock <= (product.minimumStock || 10);
                        const isSelected = (focusMode === 'products' || (focusMode === 'search' && searchTerm)) && index === selectedProductIndex;

                        return (
                          <div
                            key={product.id}
                            ref={(el) => { productRefs.current[index] = el; }}
                            onClick={() => {
                              if (!isOutOfStock) {
                                if (product.allowFractional) {
                                  openWeightModal(product);
                                } else {
                                  addToCart(product.id, 1);
                                }
                                setFocusMode('products');
                                setSelectedProductIndex(index);
                              }
                            }}
                            className={`group p-4 border rounded-xl transition-all ${isSelected
                              ? 'border-primary bg-primary/10 shadow-lg ring-2 ring-primary/20'
                              : isOutOfStock
                                ? 'border-destructive/30 bg-destructive/10 opacity-60 cursor-not-allowed'
                                : 'border-border hover:border-primary/50 hover:shadow-md cursor-pointer bg-card'
                              }`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className={`font-black tracking-tight text-lg leading-tight truncate ${isOutOfStock ? 'text-muted-foreground' : isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                                    {product.name}
                                  </p>
                                  {product.allowFractional && (
                                    <span className="text-[9px] bg-indigo-500/20 text-indigo-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter border border-indigo-500/30">
                                      ⚖️ Peso
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Código: {product.code}</p>
                                <div className="mt-1 space-y-1">
                                  <div className="flex justify-between items-center">
                                    <p className={`text-xs font-bold ${isOutOfStock ? 'text-red-500' : isLowStock ? 'text-orange-500' : 'text-primary'}`}>
                                      Stock Disponible:
                                    </p>
                                    {isSelected && !isOutOfStock && (
                                      <span className="text-[9px] text-primary animate-pulse font-bold uppercase tracking-wider bg-primary/20 px-1.5 py-0.5 rounded">
                                        Click para seleccionar unidad ↓
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-x-2 gap-y-1.5">
                                    {product.saleUOMs?.filter(uom => uom.isActive !== false).map(uom => {
                                      const convertedStock = effectiveStock / (uom.conversionToBase || 1);
                                      const hasStockInUOM = product.allowFractional ? convertedStock > 0.001 : convertedStock >= 1;
                                      const isKg = uom.uomCode?.toUpperCase() === 'KG' || uom.uomName?.toUpperCase() === 'KILOGRAMO';

                                      return (
                                        <div key={uom.uomId} className="w-full">
                                          <button
                                            disabled={!hasStockInUOM}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (product.allowFractional) {
                                                openWeightModal(product, uom.uomId);
                                              } else {
                                                addToCart(product.id, 1, uom.uomId);
                                              }
                                            }}
                                            className={`text-[10px] px-2.5 py-1.5 rounded-md border whitespace-nowrap font-bold transition-all shadow-sm ${hasStockInUOM
                                              ? (searchTermToFilter && uom.barcode && uom.barcode.toLowerCase() === searchTermToFilter.toLowerCase())
                                                ? 'bg-primary text-white border-primary ring-2 ring-primary/30 scale-110 shadow-lg'
                                                : 'bg-slate-800 text-slate-100 border-slate-600 hover:bg-primary hover:border-primary hover:scale-105 active:scale-95 cursor-pointer'
                                              : 'bg-muted/10 text-muted-foreground/30 border-border/10 cursor-not-allowed'
                                              }`}
                                          >
                                            {convertedStock % 1 === 0 ? convertedStock : convertedStock.toFixed(3)} {uom.uomName}
                                            {uom.barcode && uom.barcode.toLowerCase() === searchTermToFilter.toLowerCase() && (
                                              <span className="ml-1 text-[8px] animate-pulse">✨</span>
                                            )}
                                          </button>

                                          {/* Atajos rápidos para Peso (KG) - En fila separada */}
                                          {isSelected && isKg && hasStockInUOM && (
                                            <div className="mt-2 flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
                                              <span className="text-[9px] text-muted-foreground font-semibold">Atajos:</span>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); addToCart(product.id, 0.25, uom.uomId); }}
                                                className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors font-bold"
                                              >
                                                1/4 kg
                                              </button>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); addToCart(product.id, 0.5, uom.uomId); }}
                                                className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors font-bold"
                                              >
                                                1/2 kg
                                              </button>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); addToCart(product.id, 0.75, uom.uomId); }}
                                                className="text-[9px] bg-primary/20 text-primary border border-primary/30 px-2 py-1 rounded hover:bg-primary hover:text-white transition-colors font-bold"
                                              >
                                                3/4 kg
                                              </button>
                                              <button
                                                onClick={(e) => { e.stopPropagation(); addToCart(product.id, 0.1, uom.uomId); }}
                                                className="text-[9px] bg-indigo-500/20 text-indigo-500 border border-indigo-500/30 px-2 py-1 rounded hover:bg-indigo-500 hover:text-white transition-colors font-bold"
                                              >
                                                100g
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {/* Only show units that are explicitly defined in saleUOMs */}
                                    {(!product.saleUOMs || product.saleUOMs.filter(uom => uom.isActive !== false).length === 0) && (
                                      <span className="text-[10px] bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap font-medium">
                                        {effectiveStock} {product.baseUOMCode || 'UND'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <p className={`text-2xl font-bold ${isOutOfStock ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400'}`}>
                                  {formatCurrency(getProductPrice(product, selectedPriceList))}
                                </p>
                                <p className="text-xs text-muted-foreground">{getDefaultUOMName(product)}</p>
                                {isOutOfStock ? (
                                  <span className="text-[10px] text-red-600 bg-red-100 px-2 py-0.5 rounded font-bold uppercase">Sin Stock</span>
                                ) : (
                                  <span className="text-[10px] text-green-700 bg-green-100 px-2 py-0.5 rounded font-bold uppercase border border-green-200">Disponible</span>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-2 text-xs text-primary font-semibold flex items-center gap-1">
                                <span>↵</span> Presiona Enter para agregar
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <svg className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-muted-foreground font-medium">No se encontraron productos</p>
                      <p className="text-muted-foreground/70 text-sm mt-1">Intenta con otro término de búsqueda</p>
                    </div>
                  )}
                </div>
              )}

              {!isLoading && !searchTerm && (
                <div className="mt-6 text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed border-border">
                  <svg className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-muted-foreground font-medium">Comienza a buscar productos</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">Escanea el código de barras o escribe el nombre</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className={`bg-card rounded-xl shadow-lg p-6 sticky top-6 border transition-all duration-300 ${focusMode === 'cart' || focusMode === 'payment'
              ? 'border-primary ring-4 ring-primary/10 shadow-primary/20 scale-[1.01]'
              : 'border-border'
              }`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-bold transition-colors ${focusMode === 'cart' ? 'text-primary' : 'text-foreground'}`}>
                  Carrito de Venta
                </h3>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 px-3 py-1 rounded-lg font-medium transition"
                  >
                    Limpiar Todo
                  </button>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-muted-foreground mb-2">
                  Cliente
                </label>
                <Autocomplete
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  placeholder="Buscar cliente (DNI o Nombre)..."
                  emptyMessage="No encontrado"
                  createNewLabel="+ Nuevo Cliente Rápido"
                  onCreateNew={() => setIsCustomerModalOpen(true)}
                />
                {selectedCustomer && (
                  <div className="mt-2 text-xs bg-primary/10 p-2 rounded text-primary border border-primary/20">
                    <div className="flex justify-between">
                      <span>Crédito Disponible:</span>
                      <span className="font-bold">{formatCurrency(selectedCustomer.availableCredit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Deuda Actual:</span>
                      <span>{formatCurrency(selectedCustomer.currentDebt)}</span>
                    </div>
                  </div>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed border-border">
                  <svg className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-muted-foreground font-medium">Carrito vacío</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">Agrega productos para comenzar</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 max-h-[500px] overflow-y-auto border border-border rounded-xl">
                    <div className="grid grid-cols-12 gap-1 px-4 py-3 border-b bg-muted/50 text-[11px] font-black text-muted-foreground uppercase tracking-widest sticky top-0 z-10">
                      <div className="col-span-2">CANT.</div>
                      <div className="col-span-7">PRODUCTO / UNIDAD</div>
                      <div className="col-span-3 text-right">TOTAL</div>
                    </div>
                    {cart.map((item, index) => {
                      const product = products?.find(p => p.id === item.productId);
                      const availableUOMs = product?.saleUOMs?.filter(uom => uom.isActive !== false) || [];
                      const isSelected = focusMode === 'cart' && index === selectedCartIndex;

                      return (
                        <div
                          key={`${item.productId}-${item.uomId}`}
                          ref={(el) => { cartItemRefs.current[index] = el; }}
                          onClick={() => { setFocusMode('cart'); setSelectedCartIndex(index); }}
                          className={`grid grid-cols-12 gap-3 items-center px-4 py-3 border-b transition-all cursor-pointer group ${isSelected
                            ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-l-primary z-20 relative ring-1 ring-primary/20 shadow-sm'
                            : 'bg-background hover:bg-muted/20 border-border'
                            }`}
                        >
                          {/* Columna Cantidad */}
                          <div className="col-span-2 relative">
                            <input
                              ref={(el) => { quantityInputRefs.current[index] = el; }}
                              type="text"
                              inputMode="decimal"
                              value={rawQuantities[`${item.productId}-${item.uomId}`] ?? (item.quantity === 0 ? '' : item.quantity.toString())}
                              onChange={(e) => {
                                let val = e.target.value.replace(',', '.').toLowerCase();

                                // Permite escribir el punto decimal sin que se borre (ej: "0.")
                                setRawQuantities(prev => ({ ...prev, [`${item.productId}-${item.uomId}`]: val }));

                                if (val === '' || val === '.') {
                                  updateQuantity(item.productId, item.uomId, 0);
                                  return;
                                }

                                let parsed = parseFloat(val);

                                // Gram support: if ends with 'g' or 'gr'
                                if (val.endsWith('g') || val.endsWith('gr')) {
                                  parsed = parsed / 1000;
                                }

                                if (!isNaN(parsed)) {
                                  updateQuantity(item.productId, item.uomId, Math.max(0, parsed));
                                }
                              }}
                              onBlur={() => {
                                // Al salir, validamos estrictamente por si dejaron un número inválido (ej: dejaron "200" sin la "g")
                                const key = `${item.productId}-${item.uomId}`;
                                const rawVal = rawQuantities[key];
                                if (rawVal) {
                                  let val = rawVal.replace(',', '.').toLowerCase();
                                  let parsed = parseFloat(val);
                                  if (val.endsWith('g') || val.endsWith('gr')) parsed /= 1000;
                                  if (!isNaN(parsed)) {
                                    updateQuantity(item.productId, item.uomId, parsed, true);
                                  }
                                }

                                setRawQuantities(prev => {
                                  const newState = { ...prev };
                                  delete newState[key];
                                  return newState;
                                });
                              }}
                              onFocus={(e) => { e.target.select(); setFocusMode('cart'); setSelectedCartIndex(index); }}
                              className={`w-full text-center font-bold text-foreground bg-muted/50 border rounded px-1 py-1 text-sm shadow-inner transition-colors ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'}`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  setSearchTerm('');
                                  setFocusMode('search');
                                  setTimeout(() => searchInputRef.current?.focus(), 10);
                                }
                              }}
                            />
                            {product?.allowFractional && isSelected && (
                              <div className="absolute -bottom-6 left-0 w-[140px] z-50 bg-slate-900 border border-slate-700 text-white text-[9px] font-black px-2 py-1 rounded shadow-2xl animate-in fade-in slide-in-from-top-1">
                                💡 ESCRIBE <span className="text-primary italic">"250g"</span>
                              </div>
                            )}
                          </div>

                          {/* Columna Producto - Más espacio (col-span-7) */}
                          <div className="col-span-7 overflow-hidden px-1">
                            <p className={`font-black leading-tight truncate text-base mb-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {item.productName}
                            </p>
                            <div className="flex items-center gap-2">
                              {availableUOMs.length > 1 ? (
                                <select
                                  value={item.uomId}
                                  onChange={(e) => updateCartItemUOM(item.productId, item.uomId, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[11px] bg-muted/80 border border-border/50 rounded-md px-2 py-1 text-foreground focus:ring-1 focus:ring-primary h-7 min-w-[130px] transition-all cursor-pointer outline-none font-medium"
                                >
                                  {availableUOMs.map(uom => (
                                    <option key={uom.uomId} value={uom.uomId} className="bg-popover text-popover-foreground">
                                      {uom.uomName} (S/ {getProductPrice(product!, selectedPriceList, uom.uomId).toFixed(2)})
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-[11px] text-muted-foreground uppercase font-bold bg-muted/50 px-2 py-0.5 rounded border border-border/20">
                                  {item.uomName} · S/ {item.price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Columna Total y Eliminar */}
                          <div className="col-span-3">
                            <div className="flex flex-col items-end">
                              <p className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                                {formatCurrency(item.subtotal)}
                              </p>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeFromCart(item.productId, item.uomId); }}
                                className="text-muted-foreground hover:text-destructive p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="font-medium">Valor de Venta:</span>
                      <span className="font-semibold">{formatCurrency(calculateBaseAmount())}</span>
                    </div>
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span className="font-medium">{BusinessConfig.tax.igvLabel} ({(BusinessConfig.tax.igvRate * 100).toFixed(0)}%):</span>
                      <span className="font-semibold">{formatCurrency(calculateIGV())}</span>
                    </div>
                    <div className="flex flex-col gap-1 py-6 bg-slate-900 dark:bg-slate-950 px-6 rounded-[2rem] shadow-2xl shadow-primary/20 border border-primary/20 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
                        <svg className="w-24 h-24 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-black text-primary/80 uppercase tracking-[0.2em] mb-1">Total a Pagar</span>
                      <div className="flex justify-between items-baseline">
                        <span className="text-4xl font-black text-white italic">
                          {formatCurrency(calculateTotal())}
                        </span>
                        <span className="text-xs font-bold text-white/40 uppercase tracking-tighter">PEN</span>
                      </div>
                    </div>

                    <div className="pt-2 space-y-3">
                      <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-2">
                          Método de Pago
                        </label>
                        <div className="mb-4">
                          <label className="block text-sm font-bold text-muted-foreground mb-2">
                            Tipo Comprobante
                          </label>
                          <select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground font-medium"
                          >
                            <option value="80">Nota de Venta</option>
                            <option value="03">Boleta</option>
                            <option value="01">Factura</option>
                          </select>
                        </div>

                        <label className="block text-sm font-bold text-muted-foreground mb-2">
                          Método de Pago
                        </label>
                        <select
                          ref={paymentMethodRef}
                          value={paymentMethod}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            const selectedConfig = paymentMethods?.find(m => m.name === e.target.value);
                            if (!selectedConfig?.requiresAmountReceived) {
                              setAmountReceived('');
                              setRawAmountReceived('0.00');
                            }
                          }}
                          onFocus={() => setFocusMode('payment')}
                          onKeyDown={handlePaymentMethodKeyDown}
                          className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground font-medium"
                        >
                          {(paymentMethods || BusinessConfig.payment.methods).map((method: any) => (
                            <option key={method.id || method.code} value={method.name}>{method.name}</option>
                          ))}
                        </select>
                      </div>

                      {(() => {
                        const selectedMethodConfig = paymentMethods?.find(m => m.name === paymentMethod);
                        return selectedMethodConfig?.requiresAmountReceived;
                      })() && (
                          <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-2">
                              Monto Recibido
                            </label>
                            <input
                              ref={amountReceivedRef}
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={rawAmountReceived}
                              onChange={(e) => {
                                let val = e.target.value.replace(',', '.');
                                setRawAmountReceived(val);

                                const parsed = parseFloat(val);
                                if (!isNaN(parsed)) {
                                  setAmountReceived(val);
                                } else if (val === '') {
                                  setAmountReceived('0');
                                }
                              }}
                              onKeyDown={handleAmountReceivedKeyDown}
                              onFocus={(e) => {
                                e.target.select();
                                setFocusMode('payment');
                                // Si el valor es por defecto 0.00, lo limpiamos para facilitar escritura
                                if (rawAmountReceived === '0.00') setRawAmountReceived('');
                              }}
                              onBlur={() => {
                                // Formateamos al salir si es un número válido
                                const parsed = parseFloat(rawAmountReceived);
                                if (!isNaN(parsed)) {
                                  setRawAmountReceived(parsed.toFixed(2));
                                  setAmountReceived(parsed.toString());
                                } else {
                                  setRawAmountReceived('0.00');
                                  setAmountReceived('0');
                                }
                              }}
                              className="w-full px-5 py-4 border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary bg-background text-foreground font-black text-2xl shadow-inner text-right tracking-widest italic"
                            />
                            {amountReceived && parseFloat(amountReceived) > 0 && (
                              <div className="mt-2">
                                {paymentMethod === 'Efectivo' && (
                                  <div className="bg-muted/30 p-4 rounded-2xl space-y-2">
                                    {changeResult ? (
                                      <>
                                        {changeResult.roundingAdjustment !== 0 && (
                                          <div className="flex justify-between items-center text-xs text-muted-foreground italic mb-1">
                                            <span>Redondeo BCRP:</span>
                                            <span>
                                              {changeResult.roundingAdjustment > 0 ? '+' : ''}{formatCurrency(changeResult.roundingAdjustment)}
                                            </span>
                                          </div>
                                        )}
                                        {changeResult.roundingAdjustment !== 0 && (
                                          <div className="flex justify-between items-center text-xs mb-1.5 pb-1.5 border-b border-border/30">
                                            <span className="text-muted-foreground">Total a cobrar:</span>
                                            <span className="font-bold text-foreground">{formatCurrency(changeResult.roundedTotal)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                          <span className={`font-semibold ${changeResult.isPaymentSufficient ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                                            Vuelto:
                                          </span>
                                          <span className={`text-xl font-bold ${changeResult.isPaymentSufficient ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                                            {formatCurrency(changeResult.change)}
                                          </span>
                                        </div>
                                        {!changeResult.isPaymentSufficient && (
                                          <p className="text-xs text-destructive mt-1">
                                            Falta: {formatCurrency(changeResult.deficit)}
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <div className="animate-pulse h-10 bg-muted/50 rounded-lg"></div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {(() => {
                      const selectedMethodConfig = paymentMethods?.find(m => m.name === paymentMethod);
                      return selectedMethodConfig?.generatesDebt && selectedCustomer;
                    })() && (
                        <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                          <p className="text-sm text-orange-600 font-medium text-center">
                            Venta a Crédito - 30 días
                          </p>
                          <div className="flex justify-between text-sm mt-1">
                            <span>Saldo Nuevo:</span>
                            <span className="font-bold text-orange-700">{formatCurrency((selectedCustomer?.currentDebt ?? 0) + calculateTotal())}</span>
                          </div>
                        </div>
                      )}

                    <button
                      ref={processButtonRef}
                      onClick={handleProcessSale}
                      disabled={isProcessing || (paymentMethod === 'Efectivo' && !isPaymentValid())}
                      className={`w-full py-6 rounded-[2rem] font-black text-xl uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl ${isPaymentValid()
                        ? 'bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 shadow-primary/30'
                        : 'bg-destructive/10 text-destructive border-2 border-destructive/20 cursor-not-allowed'
                        } ${focusMode === 'payment' && isPaymentValid() ? 'ring-4 ring-primary/30 animate-pulse outline-none' : ''}`}
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                          <span>Procesando...</span>
                        </>
                      ) : !isPaymentValid() ? (
                        <>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span>Pago Insuficiente</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Cobrar (F9)</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>


      </main>

      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registro Rápido de Cliente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo Doc</Label>
                <Select
                  value={newCustomerData.documentType.toString()}
                  onValueChange={(val) => setNewCustomerData({ ...newCustomerData, documentType: parseInt(val) as DocumentType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">DNI</SelectItem>
                    <SelectItem value="2">RUC</SelectItem>
                    <SelectItem value="4">CE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={newCustomerData.documentNumber}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, documentNumber: e.target.value })}
                  placeholder="Número de documento"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className={`space-y-2 ${newCustomerData.documentType === DocumentType.RUC ? 'col-span-2' : ''}`}>
                <Label>{newCustomerData.documentType === DocumentType.RUC ? 'Razón Social*' : 'Nombres*'}</Label>
                <Input
                  value={newCustomerData.firstName}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, firstName: e.target.value })}
                  placeholder={newCustomerData.documentType === DocumentType.RUC ? 'Razón Social' : 'Nombres'}
                />
              </div>
              {newCustomerData.documentType !== DocumentType.RUC && (
                <div className="space-y-2">
                  <Label>Apellidos</Label>
                  <Input
                    value={newCustomerData.lastName}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, lastName: e.target.value })}
                    placeholder="Apellidos"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  value={newCustomerData.phone || ''}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                  placeholder="Celular"
                />
              </div>
              <div className="space-y-2">
                <Label>Línea Crédito (S/)</Label>
                <Input
                  type="number"
                  value={newCustomerData.creditLimit}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, creditLimit: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomerModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={async () => {
                if (!newCustomerData.firstName) {
                  toast.error("El nombre es obligatorio");
                  return;
                }
                try {
                  setIsCreatingCustomer(true);
                  const customer = await createCustomer(newCustomerData);
                  await refreshCustomers();
                  toast.success("Cliente registrado");
                  setSelectedCustomerId(customer.id);
                  setIsCustomerModalOpen(false);
                  // Reset form
                  setNewCustomerData({
                    documentType: DocumentType.DNI,
                    documentNumber: '',
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    address: '',
                    creditLimit: 0
                  });
                } catch (e) {
                  toast.error("Error al crear cliente");
                } finally {
                  setIsCreatingCustomer(false);
                }
              }}
              disabled={isCreatingCustomer}
            >
              {isCreatingCustomer ? 'Guardando...' : 'Guardar y Seleccionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weight Selection Modal (Venta Orientada a Peso) */}
      <Dialog open={isWeightModalOpen} onOpenChange={(open) => {
        setIsWeightModalOpen(open);
        if (!open) {
          setWeightModalProduct(null);
          setModalWeight('');
        }
      }}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
            <div className="relative z-10">
              <span className="text-primary text-[10px] font-black uppercase tracking-[0.3em] mb-1 block">Entrada de Peso</span>
              <h2 className="text-2xl font-black italic truncate">{weightModalProduct?.name}</h2>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{modalUomId ? weightModalProduct?.saleUOMs?.find(u => u.uomId === modalUomId)?.uomName : 'Precio Base'}</p>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-background">
            <div className="space-y-4">
              <div className="flex justify-between items-end mb-1">
                <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Peso / Cantidad</Label>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase block">
                    Precio x {modalUomId ? weightModalProduct?.saleUOMs?.find(u => u.uomId === modalUomId)?.uomName : 'Unidad'}
                  </span>
                  <span className="text-lg font-black text-foreground">
                    {formatCurrency(weightModalProduct ? getProductPrice(weightModalProduct, selectedPriceList, modalUomId) : 0)}
                  </span>
                </div>
              </div>

              <div className="relative group">
                <Input
                  ref={weightInputRef}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000"
                  value={modalWeight}
                  onChange={(e) => setModalWeight(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddWeightToCart();
                    }
                  }}
                  className="h-20 text-5xl font-black text-center border-2 border-muted hover:border-primary/30 focus:border-primary transition-all rounded-2xl bg-muted/20"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-2xl font-black italic">
                  {modalUomId ? weightModalProduct?.saleUOMs?.find(u => u.uomId === modalUomId)?.uomName.substring(0, 2).toUpperCase() : 'KG'}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '100g', value: '0.1' },
                  { label: '250g', value: '0.25' },
                  { label: '500g', value: '0.5' },
                  { label: '1 Kg', value: '1' }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setModalWeight(preset.value);
                      setTimeout(() => weightInputRef.current?.focus(), 50);
                    }}
                    className="py-3 px-1 border-2 border-muted hover:border-primary hover:bg-primary/5 rounded-xl text-xs font-black uppercase transition-all active:scale-95"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="py-6 border-y-2 border-dashed border-muted flex justify-between items-center px-4 bg-muted/5 rounded-xl">
              <div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block">Total estimado</span>
                <span className="text-3xl font-black text-primary italic">
                  {formatCurrency((weightModalProduct ? getProductPrice(weightModalProduct, selectedPriceList, modalUomId) : 0) * parseModalWeight(modalWeight))}
                </span>
              </div>

              <button
                onClick={async () => {
                  if (weightModalProduct) {
                    // @ts-ignore (Will be handled by connectToScale inside page)
                    if (window.connectToScale) (window as any).connectToScale(weightModalProduct.id, modalUomId);
                    // No cierro para que el usuario vea el resultado
                  }
                }}
                className="p-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-110 active:scale-90"
                title="Leer Balanza (F10)"
              >
                <div className="flex flex-col items-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">Balanza</span>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setIsWeightModalOpen(false)}
                className="py-4 text-xs font-black uppercase text-muted-foreground hover:bg-muted/50 rounded-2xl transition-all"
              >
                Cancelar (Esc)
              </button>
              <button
                onClick={handleAddWeightToCart}
                className="py-4 bg-primary text-primary-foreground text-sm font-black uppercase rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Confirmar Peso (↵)
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout >
  );
}
