import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '@/types/inventory';

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await apiClient.get('/api/inventory/suppliers');
      return response.data;
    },
  });
}

export function useSupplier(id: string) {
  return useQuery<Supplier>({
    queryKey: ['suppliers', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/inventory/suppliers/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSupplierRequest) => {
      const response = await apiClient.post('/api/inventory/suppliers', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSupplierRequest }) => {
      const response = await apiClient.put(`/api/inventory/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers', variables.id] });
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/api/inventory/suppliers/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });
}
