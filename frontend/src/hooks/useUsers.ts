import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { User, CreateUserRequest, UpdateUserRequest, ChangePasswordRequest } from '@/types/user';

export const useUsers = () => {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get('/api/users');
      return response.data;
    },
  });
};

export const useUser = (id: string) => {
  return useQuery<User>({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/users/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserRequest) => {
      const response = await apiClient.post('/api/users', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserRequest }) => {
      const response = await apiClient.put(`/api/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useActivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/users/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeactivateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/api/users/${id}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ChangePasswordRequest }) => {
      await apiClient.post(`/api/users/${id}/change-password`, data);
    },
  });
};
