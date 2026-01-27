import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { DashboardData } from '@/types/analytics';

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

export function useRecalculateAnalytics() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/analytics/generate-summaries');
      return response.data;
    }
  });
}
