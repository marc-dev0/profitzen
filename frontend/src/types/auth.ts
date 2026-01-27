import type { PermissionDto } from '@/services/permissionsService';

export interface StoreInfo {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  tenantId: string;
  storeId?: string;
  currentStoreId?: string;
  stores?: StoreInfo[];
  role?: number;
  permissions?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  rolePermissions: PermissionDto[];
  knownUsers: User[];
  setHasHydrated: (state: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
  setCurrentStore: (storeId: string) => void;
  setRolePermissions: (permissions: PermissionDto[]) => void;
  removeKnownUser: (email: string) => void;
}
