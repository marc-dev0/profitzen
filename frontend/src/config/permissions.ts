import { UserRole } from '@/types/user';

export type AppModule = string;

export const MODULE_PERMISSIONS: Record<UserRole, AppModule[]> = {
    [UserRole.None]: [],

    [UserRole.Admin]: [
        'dashboard', 'pos', 'sales', 'products', 'inventory',
        'purchases', 'suppliers', 'customers', 'stores', 'users', 'settings', 'analytics', 'analytics_ia'
    ],

    [UserRole.Manager]: [
        'dashboard', 'pos', 'sales', 'products', 'inventory',
        'purchases', 'suppliers', 'customers', 'stores', 'analytics', 'analytics_ia'
    ],

    [UserRole.Cashier]: [
        'pos', 'customers'
    ],

    [UserRole.Logistics]: [
        'products', 'inventory', 'purchases', 'suppliers'
    ]
};

export const hasAccess = (role: UserRole | undefined | null, module: AppModule): boolean => {
    if (!role) return false;

    for (const key of Object.keys(MODULE_PERMISSIONS)) {
        const roleFlag = Number(key) as UserRole;

        if (roleFlag === UserRole.None) continue;

        if ((role & roleFlag) === roleFlag) {
            const allowedModules = MODULE_PERMISSIONS[roleFlag];
            if (allowedModules && allowedModules.includes(module)) {
                return true;
            }
        }
    }

    return false;
};
