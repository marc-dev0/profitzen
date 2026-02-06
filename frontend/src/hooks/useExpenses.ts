import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';

export interface Expense {
    id: string;
    storeId: string;
    description: string;
    category: string;
    amount: number;
    date: string;
    paymentMethod: string;
    isPaid: boolean;
    dueDate?: string;
    reference?: string;
    notes?: string;
    createdAt: string;
    deletedAt?: string;
}

export interface CreateExpenseRequest {
    storeId: string;
    description: string;
    category: string;
    amount: number;
    date: string;
    paymentMethod: string;
    isPaid: boolean;
    dueDate?: string;
    reference?: string;
    notes?: string;
}

export function useExpenses(storeId?: string, from?: string, to?: string, includeDeleted: boolean = false) {
    return useQuery<Expense[]>({
        queryKey: ['expenses', storeId, from, to, includeDeleted],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (storeId && storeId !== '') params.append('storeId', storeId);
            if (from) params.append('from', from);
            if (to) params.append('to', to);
            if (includeDeleted) params.append('includeDeleted', 'true');

            const { data } = await apiClient.get(`/api/sales/expense?${params.toString()}`);
            return data;
        }
    });
}

export function useCreateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (request: CreateExpenseRequest) => {
            const { data } = await apiClient.post(`/api/sales/expense`, request);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['sales-report'] });
        }
    });
}

export function useUpdateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, request }: { id: string; request: CreateExpenseRequest }) => {
            const { data } = await apiClient.put(`/api/sales/expense/${id}`, request);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['sales-report'] });
        }
    });
}

export function useDeleteExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/api/sales/expense/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['sales-report'] });
        }
    });
}

export function useMarkExpenseAsPaid() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.post(`/api/sales/expense/${id}/pay`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['sales-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['sales-report'] });
        }
    });
}
