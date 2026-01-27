import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { Store, CreateStoreRequest, UpdateStoreRequest } from '@/types/store';

export const useStores = () => {
  return useQuery<Store[]>({
    queryKey: ['stores'],
    queryFn: async () => {
      const response = await apiClient.get('/api/stores');
      return response.data;
    },
  });
};

export const useStore = (id: string) => {
  return useQuery<Store>({
    queryKey: ['stores', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/stores/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStoreRequest) => {
      const response = await apiClient.post('/api/stores', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
};

export const useUpdateStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStoreRequest }) => {
      const response = await apiClient.put(`/api/stores/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
};

export const useActivateStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/stores/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
};

export const useDeactivateStore = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/stores/${id}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });
};
