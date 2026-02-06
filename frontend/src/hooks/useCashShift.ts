import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import { CashShift, OpenShiftRequest, CloseShiftRequest, AddMovementRequest } from '@/types/cashShift';

export const useCashShift = (storeId?: string) => {
    const queryClient = useQueryClient();

    const result = useQuery({
        queryKey: ['cash-shift', 'open', storeId],
        queryFn: async () => {
            if (!storeId) return null;
            // Return null if 204 No Content
            const response = await apiClient.get<CashShift | null>(`/api/sales/cash-shifts/open?storeId=${storeId}`);
            if (response.status === 204) return null;
            return response.data;
        },
        enabled: !!storeId,
        retry: false
    });

    return result;
};

export const useOpenShift = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: OpenShiftRequest) => {
            const response = await apiClient.post<CashShift>('/api/sales/cash-shifts/open', data);
            return response.data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['cash-shift', 'open', variables.storeId] });
        }
    });
};

export const useCloseShift = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string, data: CloseShiftRequest }) => {
            const response = await apiClient.post<CashShift>(`/api/sales/cash-shifts/${id}/close`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-shift'] });
        }
    });
};

export const useAddCashMovement = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string, data: AddMovementRequest }) => {
            const response = await apiClient.post(`/api/sales/cash-shifts/${id}/movements`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cash-shift'] });
        }
    });
};

export const useCashShiftHistory = (storeId: string, from?: Date, to?: Date) => {
    return useQuery({
        queryKey: ['cash-shift', 'history', storeId, from, to],
        queryFn: async () => {
            let url = `/api/sales/cash-shifts?storeId=${storeId}`;
            if (from) url += `&from=${from.toISOString()}`;
            if (to) url += `&to=${to.toISOString()}`;
            const response = await apiClient.get<CashShift[]>(url);
            return response.data;
        },
        enabled: !!storeId
    });
};
