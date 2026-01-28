'use client';

import { useEffect, useState, useRef } from 'react';
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
const printTicketFromBackend = async (
  saleId: string,
  settings: {
    storeName: string;
    storeAddress: string;
    [key: string]: any
  }
) => {
  try {
    const token = localStorage.getItem('token');

    // Usar ruta relativa para que coincida con el origen del sitio (Nginx se encarga del resto)
    const response = await fetch(`/api/sales/${saleId}/ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ticket generation failed:', errorText);
      throw new Error(`Error generating ticket: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
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

  // Keyboard navigation states
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  const [focusMode, setFocusMode] = useState<'search' | 'products' | 'cart' | 'payment'>('search');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const paymentMethodRef = useRef<HTMLSelectElement>(null);
  const amountReceivedRef = useRef<HTMLInputElement>(null);
  const processButtonRef = useRef<HTMLButtonElement>(null);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cartItemRefs = useRef<(HTMLDivElement | null)[]>([]);
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

  // Set default price list when data loads
  useEffect(() => {
    if (priceLists && priceLists.length > 0 && !selectedPriceList) {
      const defaultList = priceLists.find(pl => pl.isDefault) || priceLists[0];
      setSelectedPriceList(defaultList.code);
    }
  }, [priceLists, selectedPriceList]);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Refresh customer data when a customer is selected
  useEffect(() => {
    if (selectedCustomerId) {
      refreshCustomers();
    }
  }, [selectedCustomerId]);

  // Calculate filtered products (needed for keyboard navigation)
  const filteredProducts = products?.filter((product) =>
    product.isActive && (
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.shortScanCode && product.shortScanCode.toLowerCase().includes(searchTerm.toLowerCase()))
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
          e.preventDefault();
          // Only allow Enter selection if we are actively searching or explicit movement happened
          // PREVENT accidental selection of first item if searchTerm is empty (which lists ALL products)
          if (!searchTerm.trim()) return;

          addToCart(filteredProducts[selectedProductIndex].id);
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

        if (e.key === 'Delete' || e.key === 'Backspace') {
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

  const addToCart = (productId: string, keepOpen = false) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    const defaultUOM = getDefaultSaleUOM(product);
    const existingItemIndex = cart.findIndex(item => item.productId === productId && item.uomId === defaultUOM?.uomId);
    const existingItem = existingItemIndex !== -1 ? cart[existingItemIndex] : undefined;

    // Quantity calculation
    const currentQuantity = existingItem ? existingItem.quantity : 0;
    const newQuantity = currentQuantity + 1;
    const conversionToBase = defaultUOM?.conversionToBase || 1;

    // STOCK CHECK START
    // Calculate total base quantity already in cart for this product (excluding the specific item we are about to update/replace)
    const stockUsedByOthers = cart.reduce((acc, item, idx) => {
      if (item.productId === productId && idx !== existingItemIndex) {
        return acc + (item.quantity * item.conversionToBase);
      }
      return acc;
    }, 0);

    const additionalStockNeeded = newQuantity * conversionToBase;
    const totalStockNeeded = stockUsedByOthers + additionalStockNeeded;
    const currentStock = product.currentStock || 0;

    // Check if stock is sufficient (only if tracking stock/stock > 0 check is desired)
    // Assuming if stock is 0 and it's not a service (logic ambiguous), we block.
    // Preserving original check "product.currentStock < stockNeeded" but using total.
    if (currentStock < totalStockNeeded) {
      toast.warning(`Stock insuficiente. Stock físico: ${currentStock}. En carrito: ${stockUsedByOthers} base. Intentando agregar: ${additionalStockNeeded} base.`);
      return;
    }
    // STOCK CHECK END

    const price = getProductPrice(product, selectedPriceList, defaultUOM?.uomId);

    if (existingItem) {
      setCart(cart.map((item, idx) =>
        idx === existingItemIndex
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: 1,
        price: price,
        subtotal: price,
        conversionToBase: conversionToBase,
        uomId: defaultUOM?.uomId || '',
        uomCode: defaultUOM?.uomCode || 'UND',
        uomName: defaultUOM?.uomName || 'Unidad',
      }]);
    }

    if (!keepOpen) {
      setSearchTerm('');
      setFocusMode('search');
      setShowProductGrid(false);
      searchInputRef.current?.focus();
    } else {
      // If keeping open (mouse usage), ensure focus mode allows continuing
      // But we probably want to keep visual focus on the item?
      // For now, let's just NOT reset everything.
      // Maybe refocus the product grid so arrows work?
      // productsContainerRef.current?.focus(); 
      // Actually, if we click, visual focus is on the item. HTML focus might be body.
    }
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

  const updateQuantity = (productId: string, uomId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId, uomId);
      return;
    }

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

    if (currentStock < totalStockNeeded) {
      toast.warning(`Stock insuficiente. Stock actual: ${currentStock}. Requerido total: ${totalStockNeeded}.`);
      return;
    }

    setCart(cart.map((cartItem, idx) =>
      idx === itemIndex
        ? { ...cartItem, quantity: newQuantity, subtotal: newQuantity * cartItem.price }
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

  const calculateChange = () => {
    const received = parseFloat(amountReceived) || 0;
    const total = calculateTotal();
    return received - total;
  };

  const isPaymentValid = () => {
    if (paymentMethod === 'Crédito') {
      if (!selectedCustomer) return false;
      const total = calculateTotal();
      // Check if customer has enough credit
      // Note: availableCredit in DTO is (Limit - Debt).
      return selectedCustomer.availableCredit >= total;
    }
    if (paymentMethod !== 'Efectivo') return true;
    const received = parseFloat(amountReceived) || 0;
    return received >= calculateTotal();
  };

  // Keyboard navigation handlers
  const handlePaymentMethodKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (paymentMethod === 'Efectivo') {
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
      // Step 1: Create the sale
      const createSaleResponse = await apiClient.post('/api/sales', {
        customerId: selectedCustomerId || null,
        notes: null,
        documentType: documentType
      });

      const saleId = createSaleResponse.data.id;

      // Step 2: Add items to the sale
      let saleWithItems;
      for (const item of cart) {
        const response = await apiClient.post(`/api/sales/${saleId}/items`, {
          productId: item.productId,
          productName: `${item.productName} (${item.uomName})`,
          productCode: item.productCode,
          quantity: item.quantity,
          unitPrice: item.price,
          discountAmount: 0,
          conversionToBase: item.conversionToBase,
          uomId: item.uomId || null,
          uomCode: item.uomCode || null
        });
        saleWithItems = response.data;
      }

      // Step 3: Add payment
      const selectedMethod = BusinessConfig.payment.methods.find(m => m.name === paymentMethod);

      await apiClient.post(`/api/sales/${saleId}/payments`, {
        method: selectedMethod?.id || 1,
        amount: saleWithItems.total,
        reference: null
      });

      // Step 4: Complete the sale
      const completedSale = await apiClient.post(`/api/sales/${saleId}/complete`);

      const saleData = {
        ...completedSale.data,
        items: cart,
        subtotal: calculateBaseAmount(),
        tax: calculateIGV(),
        paymentMethod: paymentMethod
      };

      setLastSale(saleData);

      // Auto-print ticket
      await printTicketFromBackend(completedSale.data.id, {
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

      setSuccessMessage(`¡Venta procesada exitosamente! #${completedSale.data.saleNumber}`);
      setCart([]);
      setAmountReceived('');
      setPaymentMethod('Efectivo');
      setPaymentMethod('Efectivo');
      setSelectedCustomerId(''); // Clear customer after sale

      // Reset Search & Focus UI
      setSearchTerm('');
      setFocusMode('search');
      setShowProductGrid(false);

      // Focus on search input for next sale
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] }); // Refresh customer data

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
            <div className="text-primary font-semibold">
              Modo: <span className="px-2 py-1 bg-primary/10 rounded border border-primary/20">{focusMode === 'search' ? '🔍 Búsqueda' : focusMode === 'products' ? '📦 Productos' : focusMode === 'cart' ? '🛒 Carrito' : '💳 Pago'}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1800px] mx-auto py-6 px-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">F2 para buscar | ESC para limpiar</span>
                </div>
              </div>

              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escanea código de barras o escribe nombre del producto..."
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
                      // Remove focus from input and focus products container
                      searchInputRef.current?.blur();
                      setTimeout(() => {
                        productsContainerRef.current?.focus();
                      }, 50);
                    }
                    if (e.key === 'Enter' && filteredProducts && filteredProducts.length > 0) {
                      e.preventDefault();

                      // Don't add if search term is empty to prevent accidental adds of the first item
                      if (!searchTerm.trim()) return;

                      // If there's only one product or first is selected, add it
                      if (filteredProducts.length === 1 || selectedProductIndex === 0) {
                        addToCart(filteredProducts[0].id);
                      } else {
                        // Switch to products mode
                        setFocusMode('products');
                        setShowProductGrid(true);
                        searchInputRef.current?.blur();
                        setTimeout(() => {
                          productsContainerRef.current?.focus();
                        }, 50);
                      }
                    }
                  }}
                  className="w-full px-5 py-4 text-lg border-2 border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
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
                  className="mt-4 max-h-[500px] overflow-y-auto focus:outline-none"
                >
                  {filteredProducts && filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredProducts.map((product, index) => {
                        const stock = product.currentStock || 0;
                        const isOutOfStock = stock === 0;
                        const isLowStock = stock > 0 && stock <= (product.minimumStock || 10);
                        const isSelected = focusMode === 'products' && index === selectedProductIndex;

                        return (
                          <div
                            key={product.id}
                            ref={(el) => { productRefs.current[index] = el; }}
                            onClick={() => {
                              if (!isOutOfStock) {
                                addToCart(product.id, true);
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
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className={`font-bold ${isOutOfStock ? 'text-muted-foreground' : isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                                  {product.name}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Código: {product.code}</p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <p className={`text-xs ${isOutOfStock ? 'text-red-500 font-bold' : isLowStock ? 'text-orange-500 font-semibold' : 'text-muted-foreground'}`}>
                                    Stock: {stock} unidades
                                  </p>
                                  {isLowStock && !isOutOfStock && (
                                    <span className="text-xs bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full border border-orange-500/20">Stock Bajo</span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                <p className={`text-2xl font-bold ${isOutOfStock ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400'}`}>
                                  {formatCurrency(getProductPrice(product, selectedPriceList))}
                                </p>
                                <p className="text-xs text-muted-foreground">{getDefaultUOMName(product)}</p>
                                {isOutOfStock ? (
                                  <span className="text-xs text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded-full mt-1 inline-block font-semibold">Sin Stock</span>
                                ) : (
                                  <span className="text-xs text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full mt-1 inline-block">Disponible</span>
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
            <div className="bg-card rounded-xl shadow-lg p-6 sticky top-6 border border-border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-foreground">
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
                  <div className="space-y-3 mb-6 max-h-[350px] overflow-y-auto pr-2">
                    {cart.map((item, index) => {
                      const product = products?.find(p => p.id === item.productId);
                      const availableUOMs = product?.saleUOMs?.filter(uom => uom.isActive !== false) || [];
                      const isSelected = focusMode === 'cart' && index === selectedCartIndex;

                      return (
                        <div
                          key={`${item.productId}-${item.uomId}`}
                          ref={(el) => { cartItemRefs.current[index] = el; }}
                          onClick={() => { setFocusMode('cart'); setSelectedCartIndex(index); }}
                          className={`p-4 rounded-lg border transition-all ${isSelected
                            ? 'bg-primary/10 border-primary shadow-lg ring-2 ring-primary/20'
                            : 'bg-muted/30 border-border hover:border-primary/50 cursor-pointer'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className={`font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>{item.productName}</p>
                              <p className="text-sm text-muted-foreground">{formatCurrency(item.price)} × {item.quantity}</p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.productId, item.uomId)}
                              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 p-1 rounded transition"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          {availableUOMs.length > 1 && (
                            <div className="mb-3">
                              <select
                                value={item.uomId}
                                onChange={(e) => updateCartItemUOM(item.productId, item.uomId, e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                              >
                                {availableUOMs.map(uom => (
                                  <option key={uom.uomId} value={uom.uomId}>
                                    {uom.uomName} - {formatCurrency(getProductPrice(product!, selectedPriceList, uom.uomId))}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          {availableUOMs.length <= 1 && (
                            <p className="text-xs text-muted-foreground mb-3">{item.uomName}</p>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 bg-background border border-border rounded-lg p-1">
                              <button
                                onClick={() => updateQuantity(item.productId, item.uomId, item.quantity - 1)}
                                className="w-8 h-8 bg-muted hover:bg-muted/80 rounded-md transition flex items-center justify-center text-foreground font-bold"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  updateQuantity(item.productId, item.uomId, val);
                                }}
                                onFocus={(e) => e.target.select()}
                                className="w-14 text-center font-bold text-foreground border-0 focus:outline-none focus:ring-0 bg-transparent"
                              />
                              <button
                                onClick={() => updateQuantity(item.productId, item.uomId, item.quantity + 1)}
                                className="w-8 h-8 bg-muted hover:bg-muted/80 rounded-md transition flex items-center justify-center text-foreground font-bold"
                              >
                                +
                              </button>
                            </div>
                            <p className="text-lg font-bold text-foreground">
                              {formatCurrency(item.subtotal)}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="mt-2 text-xs text-primary font-semibold flex items-center gap-2 flex-wrap">
                              <span>+ / - : Cantidad</span>
                              <span>Del : Eliminar</span>
                              <span>↵ : Pagar</span>
                            </div>
                          )}
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
                    <div className="flex justify-between items-center py-3 bg-muted px-4 rounded-lg">
                      <span className="text-lg font-bold text-foreground">TOTAL:</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(calculateTotal())}
                      </span>
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
                            if (e.target.value !== 'Efectivo') {
                              setAmountReceived('');
                            }
                          }}
                          onFocus={() => setFocusMode('payment')}
                          onKeyDown={handlePaymentMethodKeyDown}
                          className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground font-medium"
                        >
                          {BusinessConfig.payment.methods.map(method => (
                            <option key={method.id} value={method.name}>{method.name}</option>
                          ))}
                        </select>
                      </div>

                      {paymentMethod === 'Efectivo' && (
                        <div>
                          <label className="block text-sm font-bold text-muted-foreground mb-2">
                            Monto Recibido
                          </label>
                          <input
                            ref={amountReceivedRef}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={amountReceived}
                            onChange={(e) => setAmountReceived(e.target.value)}
                            onKeyDown={handleAmountReceivedKeyDown}
                            onFocus={(e) => { e.target.select(); setFocusMode('payment'); }}
                            className="w-full px-4 py-3 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground font-medium text-lg"
                          />
                          {amountReceived && parseFloat(amountReceived) > 0 && (
                            <div className={`mt-2 p-3 rounded-lg ${calculateChange() >= 0
                              ? 'bg-green-500/10 border border-green-500/30'
                              : 'bg-destructive/10 border border-destructive/30'
                              }`}>
                              <div className="flex justify-between items-center">
                                <span className={`font-semibold ${calculateChange() >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                                  Vuelto:
                                </span>
                                <span className={`text-xl font-bold ${calculateChange() >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                                  {formatCurrency(Math.max(0, calculateChange()))}
                                </span>
                              </div>
                              {calculateChange() < 0 && (
                                <p className="text-xs text-destructive mt-1">
                                  Falta: {formatCurrency(Math.abs(calculateChange()))}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {paymentMethod === 'Crédito' && selectedCustomer && (
                      <div className="bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                        <p className="text-sm text-orange-600 font-medium text-center">
                          Venta a Crédito - 30 días
                        </p>
                        <div className="flex justify-between text-sm mt-1">
                          <span>Saldo Nuevo:</span>
                          <span className="font-bold text-orange-700">{formatCurrency(selectedCustomer.currentDebt + calculateTotal())}</span>
                        </div>
                      </div>
                    )}

                    <button
                      ref={processButtonRef}
                      onClick={handleProcessSale}
                      disabled={isProcessing || (paymentMethod === 'Efectivo' && !isPaymentValid())}
                      className="w-full py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Procesando...
                        </span>
                      ) : (
                        'Procesar Venta'
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
    </AppLayout>
  );
}
