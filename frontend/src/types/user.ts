export enum UserRole {
  None = 0,
  Admin = 1,
  Manager = 2,
  Cashier = 4,
  Logistics = 8
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: number;
  roleName: string;
  storeIds: string[];
  storeNames: string[];
  tenantId: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: number;
  storeIds: string[];
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  phone?: string;
  role: number;
  storeIds: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export const getRoleLabel = (role: number): string => {
  const roles: string[] = [];
  if ((role & UserRole.Admin) === UserRole.Admin) roles.push('Administrador');
  if ((role & UserRole.Manager) === UserRole.Manager) roles.push('Gerente');
  if ((role & UserRole.Cashier) === UserRole.Cashier) roles.push('Cajero');
  if ((role & UserRole.Logistics) === UserRole.Logistics) roles.push('Logística');

  return roles.length > 0 ? roles.join(', ') : 'Sin Rol';
};
