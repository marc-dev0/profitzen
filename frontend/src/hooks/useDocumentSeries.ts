import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type {
  DocumentSeries,
  CreateDocumentSeriesRequest,
  UpdateDocumentSeriesRequest,
  NextDocumentNumber
} from '@/types/inventory';

export function useDocumentSeries(documentType?: string) {
  return useQuery<DocumentSeries[]>({
    queryKey: ['documentSeries', documentType],
    queryFn: async () => {
      const params = documentType ? `?documentType=${documentType}` : '';
      const response = await apiClient.get(`/api/configuration/series${params}`);
      return response.data;
    },
  });
}

export function useDocumentSeriesById(id: string) {
  return useQuery<DocumentSeries>({
    queryKey: ['documentSeries', id],
    queryFn: async () => {
      const response = await apiClient.get(`/api/configuration/series/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useNextDocumentNumber(documentType: string) {
  return useQuery<NextDocumentNumber>({
    queryKey: ['nextDocumentNumber', documentType],
    queryFn: async () => {
      const response = await apiClient.get(`/api/configuration/series/next-number?documentType=${documentType}`);
      return response.data;
    },
    enabled: !!documentType,
  });
}

export function useCreateDocumentSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDocumentSeriesRequest) => {
      const response = await apiClient.post('/api/configuration/series', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentSeries'] });
    },
  });
}

export function useUpdateDocumentSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDocumentSeriesRequest }) => {
      const response = await apiClient.put(`/api/configuration/series/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentSeries'] });
    },
  });
}
