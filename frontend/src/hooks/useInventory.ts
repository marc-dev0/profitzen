import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { Product, Category } from '@/types/inventory';

export function useProducts(storeId?: string) {
  return useQuery<Product[]>({
    queryKey: ['products', storeId],
    queryFn: async () => {
      // Use inventory endpoint to get products with their stock levels
      const endpoint = '/api/inventory/products';
      const params = storeId ? { storeId } : {};
      const response = await apiClient.get(endpoint, { params });
      return response.data;
    },
  });
}

export function useProduct(productId: string | null) {
  return useQuery<Product>({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const response = await apiClient.get(`/api/products/${productId}`);
      return response.data;
    },
    enabled: !!productId,
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/api/master-data/values', {
        params: { typeCode: 'CATEGORY' }
      });
      return response.data.map((md: any) => ({
        id: md.id,
        name: md.name,
        description: md.description,
        isActive: md.isActive
      }));
    },
  });
}
