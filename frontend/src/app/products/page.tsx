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

  const formatCurrency = (value: number | string, decimals: number = 2) => {
    const numValue = Number(value);
    // Para valores menores a 1 sol, mostramos 4 decimales para que no se vea como 0.00
    if (numValue > 0 && numValue < 1) {
      return `S/ ${numValue.toFixed(4)}`;
    }
    return `S/ ${numValue.toFixed(decimals)}`;
  };

  const enrichedProducts = products?.map(product => {
    // Find default sale UOM
    let defaultPrice = 0;
    let defaultSaleUOM = null;

    // 1. Check if there's a default sale UOM
    if (product.saleUOMs && product.saleUOMs.length > 0) {
      defaultSaleUOM = product.saleUOMs.find(uom => uom.isDefault);
      if (defaultSaleUOM) {
        defaultPrice = defaultSaleUOM.price;
      }
    }

    // 2. If no default sale UOM, check if there's any sale UOM
    if (defaultPrice === 0 && product.saleUOMs && product.saleUOMs.length > 0) {
      defaultSaleUOM = product.saleUOMs[0];
      defaultPrice = defaultSaleUOM.price;
    }

    // 3. If still no price, use top-level salePrice
    if (defaultPrice === 0 && product.salePrice > 0) {
      defaultPrice = product.salePrice;
    }

    // Use backend-calculated unit cost
    const unitCost = (product as any).unitCost ?? 0;

    if (product.code === 'PROD-000007') {
      console.log('[FRONTEND DEBUG] cecece unitCost:', unitCost);
      console.log('[FRONTEND DEBUG] cecece full product:', product);
    }

    return {
      ...product,
      defaultPrice,
      unitCost,
      purchasePrice: (product as any).purchasePrice || product.purchasePrice || 0,
      purchaseUOMName: (product as any).purchaseUOMName || 'Unidad',
      defaultUOMName: defaultSaleUOM?.uomName || defaultSaleUOM?.uomCode || 'UND'
    };
  }) || [];

  const getTotalProducts = () => enrichedProducts.length;
  const getLowStockCount = () => enrichedProducts.filter(p => (p.currentStock || 0) <= (p.minimumStock || 0)).length;
  const getOutOfStockCount = () => enrichedProducts.filter(p => (p.currentStock || 0) === 0).length;
  const getTotalValue = () => enrichedProducts.reduce((sum, item) => sum + (Number(item.currentStock || 0) * Number(item.unitCost || 0)), 0);

  // Define columns for DataTable
  const productColumns: Column<typeof enrichedProducts[0]>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      render: (product) => (
        <span className="font-mono text-sm text-foreground">{product.code}</span>
      )
    },
    {
      key: 'name',
      header: 'Producto',
      sortable: true,
      render: (product) => (
        <div>
          <p className="font-medium text-foreground">{product.name}</p>
          <p className="text-xs text-muted-foreground">{product.categoryName}</p>
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
        const isLowStock = stock <= minStock && stock > 0;
        const isOutOfStock = stock === 0;

        return (
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isOutOfStock ? 'text-red-500' :
              isLowStock ? 'text-yellow-500' :
                'text-foreground'
              }`}>
              {stock}
            </span>
            <span className="text-xs text-muted-foreground">UND</span>
          </div>
        );
      }
    },
    {
      key: 'minimumStock',
      header: 'Stock Mín.',
      sortable: true,
      render: (product) => (
        <span className="text-sm text-muted-foreground">{product.minimumStock || 0}</span>
      )
    },
    {
      key: 'purchasePrice',
      header: 'Costo Compra',
      sortable: true,
      render: (product) => (
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatCurrency(product.purchasePrice)}
          </p>
          <p className="text-xs text-muted-foreground">
            por {product.purchaseUOMName}
          </p>
          {product.unitCost > 0 && product.unitCost < product.purchasePrice && (
            <p className="text-[10px] text-muted-foreground opacity-70">
              Base: {formatCurrency(product.unitCost, 4)}
            </p>
          )}
        </div>
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
        const value = (product.currentStock || 0) * product.unitCost;
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
