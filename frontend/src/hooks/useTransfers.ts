import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { Transfer, CreateTransferRequest } from '@/types/inventory';

export function useTransfers(originStoreId?: string, destinationStoreId?: string) {
    return useQuery<Transfer[]>({
        queryKey: ['transfers', originStoreId, destinationStoreId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (originStoreId) params.append('originStoreId', originStoreId);
            if (destinationStoreId) params.append('destinationStoreId', destinationStoreId);

            const response = await apiClient.get(`/api/inventory/transfers?${params.toString()}`);
            return response.data;
        },
    });
}

export function useTransfer(id: string) {
    return useQuery<Transfer>({
        queryKey: ['transfers', id],
        queryFn: async () => {
            const response = await apiClient.get(`/api/inventory/transfers/${id}`);
            return response.data;
        },
        enabled: !!id,
    });
}

export function useCreateTransfer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: CreateTransferRequest) => {
            const response = await apiClient.post('/api/inventory/transfers', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
        },
    });
}

export function useCompleteTransfer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.post(`/api/inventory/transfers/${id}/complete`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
        },
    });
}
export function useCancelTransfer() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const response = await apiClient.post(`/api/inventory/transfers/${id}/cancel`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transfers'] });
            queryClient.invalidateQueries({ queryKey: ['store-inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
        },
    });
}
