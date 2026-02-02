import apiClient from '@/lib/axios';
import { UserRole } from '@/types/user';
import { AppModule } from '@/config/permissions';

export interface SystemModule {
    id: string;
    code: string;
    name: string;
    route?: string;
    icon?: string;
    parentId?: string;
    sortOrder: number;
    groupName?: string;
    children: SystemModule[];
}

export interface PermissionDto {
    role: UserRole;
    roleName: string;
    modules: string[];
}

export interface UpdatePermissionRequest {
    role: UserRole;
    modules: string[];
}

export const getPermissions = async (): Promise<PermissionDto[]> => {
    const response = await apiClient.get<PermissionDto[]>('/api/permissions');
    return response.data;
};

export const updatePermissions = async (updates: UpdatePermissionRequest[]): Promise<void> => {
    await apiClient.put('/api/permissions', updates);
};

export const getSystemModules = async (): Promise<SystemModule[]> => {
    const response = await apiClient.get<SystemModule[]>('/api/permissions/modules');
    return response.data;
};

export const getUserMenu = async (): Promise<SystemModule[]> => {
    const response = await apiClient.get<SystemModule[]>('/api/permissions/menu');
    return response.data;
};
