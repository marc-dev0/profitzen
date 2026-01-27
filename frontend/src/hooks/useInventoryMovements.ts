import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';

export interface StoreInventoryItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  currentStock: number;
  minimumStock: number;
  categoryName?: string;
  storeId: string;
  barcode?: string;
  shortScanCode?: string;
  unitCost?: number;
}

export interface AddStockRequest {
  quantity: number;
  reason: string;
  movementType: InventoryMovementType;
}

export interface RemoveStockRequest {
  quantity: number;
  reason: string;
  movementType: InventoryMovementType;
}

export interface CreateInventoryAdjustmentRequest {
  storeInventoryId: string;
  adjustmentType: string;
  quantity: number;
  isPositive: boolean;
  reason: string;
  uomId?: string;
  uomCode?: string;
  originalQuantity?: number;
  conversionFactor?: number;
}

export interface TransferStockRequest {
  sourceStoreId: string;
  destinationStoreId: string;
  productId: string;
  quantity: number;
  reason: string;
  uomId?: string;
  uomCode?: string;
  originalQuantity?: number;
  conversionFactor?: number;
}

export enum InventoryMovementType {
  Entry = 1,      // Entrada de mercadería
  Exit = 2,       // Salida por venta
  Adjustment = 3, // Ajuste de inventario
  Transfer = 4,   // Transferencia entre tiendas
  Return = 5,     // Devolución
  Loss = 6        // Pérdida/Merma
}

export interface InventoryMovement {
  id: string;
  storeInventoryId: string;
  productCode: string;
  productName: string;
  quantity: number;
  type: InventoryMovementType;
  reason: string;
  userId: string;
  movementDate: string;
}

// Hook para obtener inventario de la tienda
export function useStoreInventory(storeId?: string) {
  return useQuery<StoreInventoryItem[]>({
    queryKey: ['store-inventory', storeId],
    queryFn: async () => {
      const query = storeId ? `?storeId=${storeId}` : '';
      const response = await apiClient.get(`/api/inventory/store-inventory${query}`);
      return response.data;
    },
  });
}

// Hook para obtener productos con stock bajo
export function useLowStockProducts(storeId?: string) {
  return useQuery<StoreInventoryItem[]>({
    queryKey: ['store-inventory', 'low-stock', storeId],
    queryFn: async () => {
      const query = storeId ? `?storeId=${storeId}` : '';
      const response = await apiClient.get(`/api/inventory/store-inventory/low-stock${query}`);
      return response.data;
    },
  });
}

// Hook para agregar stock
export function useAddStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inventoryId, data }: { inventoryId: string; data: AddStockRequest }) => {
      const response = await apiClient.post(
        `/api/inventory/store-inventory/${inventoryId}/stock/add`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// Hook para quitar stock
export function useRemoveStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inventoryId, data }: { inventoryId: string; data: RemoveStockRequest }) => {
      const response = await apiClient.post(
        `/api/inventory/store-inventory/${inventoryId}/stock/remove`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInventoryAdjustmentRequest) => {
      const response = await apiClient.post('/api/inventory/adjustments', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });
}

export function useUpdateMinimumStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inventoryId, minimumStock }: { inventoryId: string; minimumStock: number }) => {
      const response = await apiClient.patch(
        `/api/inventory/store-inventory/${inventoryId}/minimum-stock`,
        { minimumStock }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
    },
  });
}

export interface TransferItem {
  productId: string;
  quantity: number;
  uomId?: string;
  uomCode?: string;
  originalQuantity?: number;
  conversionFactor?: number;
}

export interface TransferStockBatchRequest {
  sourceStoreId: string;
  destinationStoreId: string;
  items: TransferItem[];
  reason: string;
}

export function useTransferStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TransferStockRequest) => {
      const response = await apiClient.post('/api/inventory/transfer', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });
}

export function useTransferStockBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TransferStockBatchRequest) => {
      const response = await apiClient.post('/api/inventory/transfer-batch', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });
}


export interface BatchAdjustmentItem {
  storeInventoryId?: string; // Optional if productId provided
  productId?: string;        // Optional if storeInventoryId provided
  quantity: number; // Delta/Count
  uomId?: string;
  uomCode?: string;
  originalQuantity?: number;
  conversionFactor?: number;
}

export interface BatchInventoryAdjustmentRequest {
  storeId: string; // Required for batch context
  items: BatchAdjustmentItem[];
  adjustmentType: string;
  reason: string;
  isPositive: boolean;
}

export function useCreateAdjustmentBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BatchInventoryAdjustmentRequest) => {
      // Endpoint to implement
      const response = await apiClient.post('/api/inventory/adjustments-batch', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
    },
  });
}


export interface InventoryMovementItem {
  id: string;
  storeInventoryId: string;
  productId: string;
  productCode: string;
  productName: string;
  movementType: string;
  quantity: number;
  reason: string;
  userId: string;
  userName?: string;
  movementDate: string;
  uomCode?: string;
  originalQuantity?: number;
  conversionFactor?: number;
  barcode?: string;
  shortScanCode?: string;
}

export interface MovementsFilter {
  storeId?: string;
  productId?: string;
  fromDate?: string;
  toDate?: string;
}

export function useInventoryMovements(filters: MovementsFilter = {}) {
  return useQuery<InventoryMovementItem[]>({
    queryKey: ['inventory-movements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.storeId) params.append('storeId', filters.storeId);
      if (filters.productId) params.append('productId', filters.productId);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);

      const url = `/api/inventory/movements${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    },
  });
}

// Helper function para obtener el nombre del tipo de movimiento
export function getMovementTypeName(type: InventoryMovementType): string {
  switch (type) {
    case InventoryMovementType.Entry:
      return 'Entrada';
    case InventoryMovementType.Exit:
      return 'Salida';
    case InventoryMovementType.Adjustment:
      return 'Ajuste';
    case InventoryMovementType.Transfer:
      return 'Transferencia';
    case InventoryMovementType.Return:
      return 'Devolución';
    case InventoryMovementType.Loss:
      return 'Pérdida/Merma';
    default:
      return 'Desconocido';
  }
}

// Helper function para obtener color del tipo de movimiento
export function getMovementTypeColor(type: InventoryMovementType): string {
  switch (type) {
    case InventoryMovementType.Entry:
      return 'text-green-600 bg-green-50';
    case InventoryMovementType.Exit:
      return 'text-red-600 bg-red-50';
    case InventoryMovementType.Adjustment:
      return 'text-blue-600 bg-blue-50';
    case InventoryMovementType.Transfer:
      return 'text-purple-600 bg-purple-50';
    case InventoryMovementType.Return:
      return 'text-orange-600 bg-orange-50';
    case InventoryMovementType.Loss:
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}
