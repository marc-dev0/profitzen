import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/user';
import { hasAccess, AppModule, MODULE_PERMISSIONS } from '@/config/permissions';

export const useAccess = () => {
    const { user, rolePermissions } = useAuthStore();

    const canAccess = (module: AppModule): boolean => {
        // If no user or role, deny
        if (!user?.role) return false;

        const userRole = Number(user.role);
        if (userRole === UserRole.None) return false;

        // Check user explicit permissions from Token (Source of Truth)
        if (user.permissions && user.permissions.length > 0) {
            return user.permissions.includes(module);
        }

        // Fallback: If no dynamic permissions are loaded yet, use static config
        if (!rolePermissions || rolePermissions.length === 0) {
            return hasAccess(userRole as UserRole, module);
        }

        // Find allowed modules based on dynamic permissions from store
        for (const permission of rolePermissions) {
            // Check if user has this role bit set
            if ((userRole & permission.role) === permission.role) {
                if (permission.modules.includes(module)) {
                    return true;
                }
            }
        }

        return false;
    };

    return {
        canAccess,
        userRole: user?.role ? Number(user.role) as UserRole : UserRole.None
    };
};
