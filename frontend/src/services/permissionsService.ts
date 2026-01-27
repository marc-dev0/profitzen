import apiClient from '@/lib/axios';
import { UserRole } from '@/types/user';
import { AppModule } from '@/config/permissions';

export interface PermissionDto {
    role: UserRole;
    roleName: string;
    modules: AppModule[];
}

export interface UpdatePermissionRequest {
    role: UserRole;
    modules: AppModule[];
}

export const getPermissions = async (): Promise<PermissionDto[]> => {
    const response = await apiClient.get<PermissionDto[]>('/api/permissions');
    return response.data;
};

export const updatePermissions = async (updates: UpdatePermissionRequest[]): Promise<void> => {
    await apiClient.put('/api/permissions', updates);
};
