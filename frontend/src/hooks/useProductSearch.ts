import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import apiClient from '@/lib/axios';
import type { ProductSearchResult } from '@/types/inventory';

export function useProductSearch(searchTerm: string, enabled: boolean = true) {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return useQuery<ProductSearchResult[]>({
    queryKey: ['productSearch', debouncedTerm],
    queryFn: async () => {
      if (!debouncedTerm || debouncedTerm.length < 2) {
        return [];
      }
      const response = await apiClient.get(`/api/products/search?term=${encodeURIComponent(debouncedTerm)}`);
      return response.data;
    },
    enabled: enabled && debouncedTerm.length >= 2,
  });
}
