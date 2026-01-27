import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';

export interface PriceList {
  id: string;
  name: string;
  code: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceListRequest {
  name: string;
  code: string;
  description?: string;
  isDefault: boolean;
}

export interface UpdatePriceListRequest {
  name: string;
  description?: string;
}

export function usePriceLists() {
  return useQuery<PriceList[]>({
    queryKey: ['price-lists'],
    queryFn: async () => {
      const response = await apiClient.get('/api/price-lists');
      return response.data;
    },
  });
}

export function usePriceList(id: string | null) {
  return useQuery<PriceList>({
    queryKey: ['price-list', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await apiClient.get(`/api/price-lists/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useDefaultPriceList() {
  return useQuery<PriceList>({
    queryKey: ['price-list', 'default'],
    queryFn: async () => {
      const response = await apiClient.get('/api/price-lists/default');
      return response.data;
    },
  });
}

export function useCreatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreatePriceListRequest) => {
      const response = await apiClient.post('/api/price-lists', request);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
    },
  });
}

export function useUpdatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: UpdatePriceListRequest }) => {
      const response = await apiClient.put(`/api/price-lists/${id}`, request);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
      queryClient.invalidateQueries({ queryKey: ['price-list', data.id] });
    },
  });
}

export function useSetDefaultPriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/price-lists/${id}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
      queryClient.invalidateQueries({ queryKey: ['price-list', 'default'] });
    },
  });
}

export function useActivatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/price-lists/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
    },
  });
}

export function useDeactivatePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/api/price-lists/${id}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
    },
  });
}

export function useDeletePriceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/price-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-lists'] });
    },
  });
}
