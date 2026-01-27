import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { MasterDataType, MasterDataValue, CreateMasterDataValueRequest, UpdateMasterDataValueRequest } from '@/types/masterdata';

export function useMasterDataTypes() {
  return useQuery<MasterDataType[]>({
    queryKey: ['masterdata-types'],
    queryFn: async () => {
      const response = await apiClient.get('/api/master-data/types');
      return response.data;
    },
  });
}

export function useMasterDataValues(typeCode: string, includeInactive: boolean = false) {
  return useQuery<MasterDataValue[]>({
    queryKey: ['masterdata-values', typeCode, includeInactive],
    queryFn: async () => {
      const response = await apiClient.get(`/api/master-data/values/${typeCode}`, {
        params: { includeInactive }
      });
      return response.data;
    },
    enabled: !!typeCode,
  });
}

export function useMasterDataValue(id: string | null) {
  return useQuery<MasterDataValue>({
    queryKey: ['masterdata-value', id],
    queryFn: async () => {
      if (!id) throw new Error('ID is required');
      const response = await apiClient.get(`/api/master-data/values/by-id/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateMasterDataValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateMasterDataValueRequest) => {
      const response = await apiClient.post('/api/master-data/values', request);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['masterdata-values', data.typeCode] });
    },
  });
}

export function useUpdateMasterDataValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: UpdateMasterDataValueRequest }) => {
      const response = await apiClient.put(`/api/master-data/values/${id}`, request);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['masterdata-values', data.typeCode] });
      queryClient.invalidateQueries({ queryKey: ['masterdata-value', data.id] });
    },
  });
}

export function useDeleteMasterDataValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, typeCode }: { id: string; typeCode: string }) => {
      await apiClient.delete(`/api/master-data/values/${id}`);
      return { id, typeCode };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['masterdata-values', data.typeCode] });
    },
  });
}
