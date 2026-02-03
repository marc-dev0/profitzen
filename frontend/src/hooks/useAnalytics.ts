import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { DashboardData, SmartSummary } from '@/types/analytics';

export function useDashboard(storeId?: string) {
  return useQuery<DashboardData>({
    queryKey: ['sales-dashboard', storeId],
    queryFn: async () => {
      console.log('[Dashboard] Fetching dashboard data with storeId:', storeId);
      const query = storeId ? `?storeId=${storeId}` : '';
      const response = await apiClient.get(`/api/analytics/dashboard${query}`);
      console.log('[Dashboard] Response:', response.data);
      return response.data;
    },
    enabled: !!storeId,
  });
}

export function useSalesReport(fromDate: Date, toDate: Date, storeId?: string) {
  return useQuery<import('@/types/analytics').SalesReport>({
    queryKey: ['sales-report', storeId, fromDate, toDate],
    queryFn: async () => {
      const fromStr = fromDate.toISOString();
      const toStr = toDate.toISOString();
      const response = await apiClient.get(`/api/analytics/sales/report?fromDate=${fromStr}&toDate=${toStr}${storeId ? `&storeId=${storeId}` : ''}`);
      return response.data;
    },
    enabled: !!storeId,
  });
}

export function useProductPerformance(storeId?: string) {
  return useQuery<import('@/types/analytics').ProductPerformance[]>({
    queryKey: ['product-performance', storeId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/analytics/products/performance${storeId ? `?storeId=${storeId}` : ''}`);
      return response.data;
    },
    enabled: !!storeId,
  });
}

export function useSmartSummaries(count: number = 5, storeId?: string, type?: string) {
  return useQuery<import('@/types/analytics').SmartSummary[]>({
    queryKey: ['smart-summaries', storeId, count, type],
    queryFn: async () => {
      const typeQuery = type ? `&type=${type}` : '';
      const response = await apiClient.get(`/api/analytics/summaries/latest?count=${count}${storeId ? `&storeId=${storeId}` : ''}${typeQuery}`);
      return response.data;
    },
    enabled: !!storeId,
  });
}

export function useRecalculateAnalytics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (storeId?: string) => {
      const response = await apiClient.post(`/api/analytics/generate-summaries${storeId ? `?storeId=${storeId}` : ''}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate all variants of smart-summaries (dashboard, history, etc.)
      queryClient.invalidateQueries({ queryKey: ['smart-summaries'] });
    }
  });
}

export function useAnalyticsActions() {
  const recalculate = useRecalculateAnalytics();

  return {
    generateReport: async (storeId?: string) => {
      return recalculate.mutateAsync(storeId);
    }
  };
}
