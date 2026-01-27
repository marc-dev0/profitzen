'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useProduct } from '@/hooks/useInventory';
import { usePriceLists } from '@/hooks/usePriceLists';
import { ArrowLeft, Package, Edit, DollarSign } from 'lucide-react';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const { data: product, isLoading: loadingProduct } = useProduct(productId);
  const { data: priceLists } = usePriceLists();

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

  const purchaseUOMDefault = product?.purchaseUOMs?.find(u => u.isDefault);
  const saleUOMDefault = product?.saleUOMs?.find(u => u.isDefault);

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-foreground">Profitzen</h1>
              <div className="hidden md:flex space-x-4">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/products" className="text-primary border-b-2 border-primary px-3 py-2 text-sm font-medium">
                  Productos
                </Link>
                <Link href="/inventory" className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium">
                  Inventario
                </Link>
                <Link href="/pos" className="text-muted-foreground hover:text-foreground px-3 py-2 text-sm font-medium">
                  Punto de Venta
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">{user?.fullName}</span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-primary-foreground bg-destructive hover:bg-destructive/90 rounded-md"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <Link href="/products" className="text-primary hover:text-primary/80 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver a productos
            </Link>
            {product && (
              <button
                onClick={() => router.push(`/products/${productId}/edit`)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <Edit className="w-4 h-4" />
                Editar Producto
              </button>
            )}
          </div>

          {loadingProduct && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-muted-foreground">Cargando producto...</p>
            </div>
          )}

          {product && (
            <div className="space-y-6">
              {/* Información del Producto */}
              <div className="bg-card rounded-lg shadow p-6 border border-border">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{product.name}</h2>
                    <p className="text-sm text-muted-foreground mt-1">Código: {product.code}</p>
                    {product.barcode && (
                      <p className="text-sm text-muted-foreground">Código de barras: {product.barcode}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {product.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Categoría</p>
                    <p className="text-lg font-medium text-foreground">{product.categoryName || 'Sin categoría'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Precio de Venta (Por defecto)</p>
                    <p className="text-lg font-medium text-green-600 dark:text-green-400">
                      {saleUOMDefault ? `${formatCurrency(saleUOMDefault.price)} por ${saleUOMDefault.uomCode}` : 'No configurado'}
                    </p>
                  </div>
                </div>

                {product.description && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Descripción</p>
                    <p className="text-foreground">{product.description}</p>
                  </div>
                )}
              </div>

              {/* Unidades de Medida */}
              <div className="bg-card rounded-lg shadow p-6 border border-border">
                <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Unidades de Medida
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="border border-border rounded-lg p-4 bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-1">Unidad Base (Stock)</p>
                    <p className="text-lg font-medium text-foreground">
                      {product.baseUOMName || 'Unidad'} ({product.baseUOMCode || 'UND'})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Unidad mínima para control de inventario
                    </p>
                  </div>

                  <div className="border border-border rounded-lg p-4 bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-1">Unidad de Compra (Por defecto)</p>
                    <p className="text-lg font-medium text-foreground">
                      {purchaseUOMDefault?.uomName || 'Unidad'} ({purchaseUOMDefault?.uomCode || 'UND'})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cómo compras al proveedor
                    </p>
                  </div>

                  <div className="border border-border rounded-lg p-4 bg-muted/20">
                    <p className="text-sm text-muted-foreground mb-1">Unidad de Venta (Por defecto)</p>
                    <p className="text-lg font-medium text-foreground">
                      {saleUOMDefault?.uomName || 'Unidad'} ({saleUOMDefault?.uomCode || 'UND'})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cómo vendes al cliente • {formatCurrency(saleUOMDefault?.price || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={product.allowFractional}
                    disabled
                    className="w-4 h-4 text-primary border-input rounded"
                  />
                  <span className="text-sm text-foreground">
                    Permite cantidades fraccionarias
                  </span>
                </div>
              </div>

              {/* Unidades de Compra */}
              {product.purchaseUOMs && product.purchaseUOMs.length > 0 && (
                <div className="bg-card rounded-lg shadow p-6 border border-border">
                  <h3 className="text-lg font-bold text-foreground mb-4">
                    Unidades de Compra
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Unidad
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Conversión a Base
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Ejemplo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {product.purchaseUOMs.filter(u => u.isActive).map((uom) => (
                          <tr key={uom.id} className={uom.isDefault ? 'bg-primary/10' : 'hover:bg-muted/50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                              {uom.uomName} ({uom.uomCode})
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                              {uom.conversionToBase}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              1 {uom.uomCode} = {uom.conversionToBase} {product.baseUOMCode}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {uom.isDefault && (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  Por defecto
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unidades de Venta con Precios por Lista */}
              {product.saleUOMs && product.saleUOMs.length > 0 && (
                <div className="bg-card rounded-lg shadow p-6 border border-border">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Unidades de Venta y Precios
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Unidad
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Conversión
                          </th>
                          {priceLists && priceLists.filter(pl => pl.isActive).map(priceList => (
                            <th key={priceList.id} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                              {priceList.name}
                              {priceList.isDefault && (
                                <span className="ml-1 text-xs text-primary">(Default)</span>
                              )}
                            </th>
                          ))}
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {product.saleUOMs.filter(u => u.isActive).map((uom) => (
                          <tr key={uom.id} className={uom.isDefault ? 'bg-primary/10' : 'hover:bg-muted/50'}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                              {uom.uomName} ({uom.uomCode})
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              1 {uom.uomCode} = {uom.conversionToBase} {product.baseUOMCode}
                            </td>
                            {priceLists && priceLists.filter(pl => pl.isActive).map(priceList => {
                              const priceForList = uom.prices?.find(p => p.priceListId === priceList.id);
                              return (
                                <td key={priceList.id} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                                  {priceForList ? formatCurrency(priceForList.price) : (
                                    priceList.isDefault ? formatCurrency(uom.price) : '-'
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {uom.isDefault && (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  Por defecto
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {priceLists && priceLists.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      No hay listas de precios configuradas. Los precios mostrados son los predeterminados.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
