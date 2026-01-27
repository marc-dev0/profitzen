'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useProducts } from '@/hooks/useInventory';
import { DataTable, Column } from '@/components/DataTable';
import AppLayout from '@/components/layout/AppLayout';
import { Package, Plus, Edit, AlertTriangle, TrendingUp, Coins } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();
  const { data: products, isLoading, error } = useProducts(user?.currentStoreId);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated || !isAuthenticated) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return `S/ ${value.toFixed(2)}`;
  };

  const enrichedProducts = products?.map(product => {
    const defaultSaleUOM = product.saleUOMs?.find(uom => uom.isDefault) || product.saleUOMs?.[0];

    let defaultPrice = 0;

    // Logic to find the best display price
    if (defaultSaleUOM) {
      // 1. Try to find price for specific public lists (Minorista/Retail)
      const retailPrice = defaultSaleUOM.prices?.find(p =>
        p.priceListCode === 'MINORISTA' || p.priceListCode === 'RETAIL'
      );

      if (retailPrice) {
        defaultPrice = retailPrice.price;
      }
      // 2. Fallback to the UOM's main price if set
      else if (defaultSaleUOM.price && defaultSaleUOM.price > 0) {
        defaultPrice = defaultSaleUOM.price;
      }
      // 3. Fallback to the first available price list price
      else if (defaultSaleUOM.prices && defaultSaleUOM.prices.length > 0) {
        defaultPrice = defaultSaleUOM.prices[0].price;
      }
    }

    // 4. Last resort: check top-level salePrice
    if (defaultPrice === 0 && product.salePrice > 0) {
      defaultPrice = product.salePrice;
    }

    return {
      ...product,
      defaultPrice,
      defaultUOMName: defaultSaleUOM?.uomName || defaultSaleUOM?.uomCode || 'UND'
    };
  }) || [];

  const getTotalProducts = () => enrichedProducts.length;
  const getLowStockCount = () => enrichedProducts.filter(p => (p.currentStock || 0) <= (p.minimumStock || 0)).length;
  const getOutOfStockCount = () => enrichedProducts.filter(p => (p.currentStock || 0) === 0).length;
  const getTotalValue = () => enrichedProducts.reduce((sum, p) => sum + ((p.currentStock || 0) * p.defaultPrice), 0);

  // Define columns for DataTable
  const productColumns: Column<typeof enrichedProducts[0]>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      render: (product) => (
        <span className="font-mono text-sm font-medium text-foreground">
          {product.code}
        </span>
      )
    },
    {
      key: 'name',
      header: 'Producto',
      sortable: true,
      render: (product) => (
        <div>
          <p className="text-sm font-medium text-foreground">{product.name}</p>
          {product.categoryName && (
            <p className="text-xs text-muted-foreground">{product.categoryName}</p>
          )}
        </div>
      )
    },
    {
      key: 'currentStock',
      header: 'Stock',
      sortable: true,
      render: (product) => {
        const stock = product.currentStock || 0;
        const minStock = product.minimumStock || 0;
        const isLow = stock <= minStock && stock > 0;
        const isOut = stock === 0;

        return (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isOut ? 'text-destructive' : isLow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {stock}
            </span>
            <span className="text-xs text-muted-foreground">{product.baseUOMName || 'UND'}</span>
            {isLow && <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
            {isOut && <AlertTriangle className="w-4 h-4 text-destructive" />}
          </div>
        );
      }
    },
    {
      key: 'minStock',
      header: 'Stock Mín.',
      sortable: true,
      render: (product) => (
        <span className="text-sm text-muted-foreground">
          {product.minimumStock || 0}
        </span>
      )
    },
    {
      key: 'purchasePrice',
      header: 'Costo',
      sortable: true,
      render: (product) => (
        <span className="text-sm text-foreground">
          {formatCurrency(product.purchasePrice || 0)}
        </span>
      )
    },
    {
      key: 'defaultPrice',
      header: 'Precio',
      sortable: true,
      render: (product) => (
        <div>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(product.defaultPrice)}</p>
          <p className="text-xs text-muted-foreground">por {product.defaultUOMName}</p>
        </div>
      )
    },
    {
      key: 'value',
      header: 'Valor Stock',
      sortable: true,
      sortKey: 'currentStock',
      render: (product) => {
        const value = (product.currentStock || 0) * product.defaultPrice;
        return (
          <span className="text-sm font-medium text-primary">
            {formatCurrency(value)}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (product) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Link>
        </div>
      )
    }
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Catálogo de Productos</h1>
            <p className="text-muted-foreground mt-1">Gestiona tu inventario de productos</p>
          </div>
          <Link
            href="/products/new"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/30 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
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
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{getLowStockCount()}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sin Stock</p>
                <p className="text-2xl font-bold text-destructive">{getOutOfStockCount()}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <div className="bg-primary rounded-xl p-4 shadow-lg text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-foreground/80">Valor Total</p>
                <p className="text-2xl font-bold text-primary-foreground">
                  {formatCurrency(getTotalValue())}
                </p>
              </div>
              <Coins className="w-8 h-8 text-primary-foreground/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6">
          <p className="font-medium">Error al cargar productos</p>
          <p className="text-sm mt-1">No se pudieron cargar los productos. Verifica tu conexión.</p>
        </div>
      )}

      {/* Products Table with DataTable Component */}
      <DataTable
        data={enrichedProducts}
        columns={productColumns}
        keyExtractor={(product) => product.id}
        loading={isLoading}
        emptyMessage="No hay productos registrados"
        searchable={true}
        searchPlaceholder="Buscar por código, nombre o categoría..."
        searchKeys={['code', 'name', 'categoryName', 'barcode', 'shortScanCode']}
        defaultRowsPerPage={25}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </AppLayout>
  );
}
