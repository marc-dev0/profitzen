import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/user';

export const useRole = () => {
  const { user } = useAuthStore();

  const hasRole = (allowedRoles: UserRole | UserRole[]): boolean => {
    if (!user?.role) return false;

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return roles.includes(user.role as UserRole);
  };

  const isAdmin = (): boolean => {
    return user?.role === UserRole.Admin;
  };

  const isManager = (): boolean => {
    return user?.role === UserRole.Manager;
  };

  const isCashier = (): boolean => {
    return user?.role === UserRole.Cashier;
  };

  return {
    hasRole,
    isAdmin,
    isManager,
    isCashier,
    userRole: user?.role as UserRole | undefined,
  };
};
