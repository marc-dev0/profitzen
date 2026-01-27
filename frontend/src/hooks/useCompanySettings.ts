import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/axios';
import type { CompanySettings, UpdateCompanySettingsRequest } from '@/types/company';

import { useAuthStore } from '@/store/authStore';

// Get company settings
export const useCompanySettings = () => {
    const user = useAuthStore((state) => state.user);

    return useQuery<CompanySettings>({
        queryKey: ['company-settings', user?.id],
        queryFn: async () => {
            const response = await apiClient.get('/api/company/settings');
            return response.data;
        },
        enabled: !!user?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

// Update company settings
export const useUpdateCompanySettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateCompanySettingsRequest) => {
            const response = await apiClient.put('/api/company/settings', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-settings'] });
        },
    });
};

// Upload logo
export const useUploadLogo = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await apiClient.post('/api/company/logo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company-settings'] });
        },
    });
};
