import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type {
  UnitOfMeasure,
  ProductUOMConversion,
  CreateProductUOMConversionRequest
} from '@/types/inventory';
import type { MasterDataValue } from '@/types/masterdata';

export function useUnitsOfMeasure() {
  return useQuery<UnitOfMeasure[]>({
    queryKey: ['uoms'],
    queryFn: async () => {
      const response = await apiClient.get<MasterDataValue[]>('/api/master-data/values', {
        params: { typeCode: 'UOM' }
      });
      return response.data.map((md: MasterDataValue) => {
        let parsedMetadata: any = {};
        if (md.metadata) {
          try {
            parsedMetadata = JSON.parse(md.metadata);
          } catch (e) {
            console.error('Failed to parse metadata', e);
          }
        }
        return {
          id: md.id,
          code: md.code,
          name: md.name,
          type: parsedMetadata.type || 'Discrete',
          isActive: md.isActive
        };
      });
    },
  });
}

export function useProductConversions(productId: string | null) {
  return useQuery<ProductUOMConversion[]>({
    queryKey: ['product-conversions', productId],
    queryFn: async () => {
      if (!productId) return [];
      const response = await apiClient.get(`/api/products/${productId}/conversions`);
      return response.data;
    },
    enabled: !!productId,
  });
}

export function useCreateProductConversion(productId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProductUOMConversionRequest) => {
      const response = await apiClient.post(
        `/api/products/${productId}/conversions`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-conversions', productId] });
    },
  });
}
