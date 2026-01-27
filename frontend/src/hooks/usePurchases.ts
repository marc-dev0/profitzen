import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { Purchase, CreatePurchaseRequest } from '@/types/inventory';

export function usePurchases(storeId?: string) {
  return useQuery<Purchase[]>({
    queryKey: ['purchases', storeId],
    queryFn: async () => {
      const params = storeId ? { storeId } : {};
      const response = await apiClient.get('/api/inventory/purchases', { params });
      return response.data;
    },
  });
}

export function usePurchase(id: string) {
  return useQuery<Purchase>({
    queryKey: ['purchases', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/inventory/purchases/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePurchaseRequest) => {
      const response = await apiClient.post('/api/inventory/purchases', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
    },
  });
}

export function useMarkPurchaseAsReceived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchaseId: string) => {
      const response = await apiClient.post(`/api/inventory/purchases/${purchaseId}/receive`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); // Also products might need update (e.g. if new product created via virtual)
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }); // Just in case
    },
  });
}
