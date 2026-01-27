
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPermissions, updatePermissions, UpdatePermissionRequest, PermissionDto } from '@/services/permissionsService';
import { UserRole, getRoleLabel } from '@/types/user';
import { AppModule } from '@/config/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

// Define available modules for display
const MODULES: { code: AppModule; name: string }[] = [
    { code: 'dashboard', name: 'Dashboard' },
    { code: 'pos', name: 'Punto de Venta' },
    { code: 'sales', name: 'Historial de Ventas' },
    { code: 'products', name: 'Gestión de Productos' },
    { code: 'inventory', name: 'Inventario' },
    { code: 'purchases', name: 'Compras' },
    { code: 'customers', name: 'Clientes' },
    { code: 'stores', name: 'Sucursales' },
    { code: 'users', name: 'Usuarios y Roles' },
    { code: 'settings', name: 'Configuración Empresa' },
    { code: 'analytics', name: 'Reportes y Analytics' },
];

export function PermissionsDialog({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void }) {
    const [internalOpen, setInternalOpen] = useState(false);

    // Determine strict controlled mode
    const isControlled = open !== undefined;
    const isOpen = isControlled ? open : internalOpen;
    const setIsOpen = isControlled ? (onOpenChange || (() => { })) : setInternalOpen;

    const queryClient = useQueryClient();
    const [localPermissions, setLocalPermissions] = useState<PermissionDto[]>([]);

    const { data: serverPermissions, isLoading } = useQuery({
        queryKey: ['permissions'],
        queryFn: getPermissions,
        enabled: isOpen,
    });

    useEffect(() => {
        if (serverPermissions) {
            setLocalPermissions(serverPermissions);
        }
    }, [serverPermissions]);

    const updateMutation = useMutation({
        mutationFn: updatePermissions,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['permissions'] });
            toast.success('Permisos actualizados correctamente');
            // Force reload to apply changes if current user affected? 
            // Better to let them know
            toast.info('Los cambios se aplicarán en el próximo inicio de sesión de los usuarios afectados.');
            setIsOpen(false);
        },
        onError: () => {
            toast.error('Error al actualizar permisos');
        }
    });

    const handleToggle = (role: UserRole, module: AppModule) => {
        setLocalPermissions(current => {
            const roleIndex = current.findIndex(p => p.role === role);
            if (roleIndex === -1) {
                // Should not happen if data is initialized correctly, but let's handle new role entry
                return [...current, { role, roleName: getRoleLabel(role), modules: [module] }];
            }

            const updated = [...current];
            const rolePerms = { ...updated[roleIndex] };

            if (rolePerms.modules.includes(module)) {
                rolePerms.modules = rolePerms.modules.filter(m => m !== module);
            } else {
                rolePerms.modules = [...rolePerms.modules, module];
            }

            updated[roleIndex] = rolePerms;
            return updated;
        });
    };

    const handleSave = () => {
        const payload: UpdatePermissionRequest[] = localPermissions.map(p => ({
            role: p.role,
            modules: p.modules
        }));
        updateMutation.mutate(payload);
    };

    const isChecked = (role: UserRole, module: AppModule) => {
        const perm = localPermissions.find(p => p.role === role);
        return perm ? perm.modules.includes(module) : false;
    };

    const roles = [UserRole.Admin, UserRole.Manager, UserRole.Cashier, UserRole.Logistics];

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button variant="default" className="gap-2 shadow-sm">
                        <Shield className="h-4 w-4" />
                        Configurar Permisos
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Matriz de Permisos por Rol</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="py-8 text-center text-muted-foreground">Cargando permisos...</div>
                ) : (
                    <div className="space-y-6">
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-xs uppercase bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-4 py-3 font-medium text-foreground">Módulo</th>
                                        {roles.map(role => (
                                            <th key={role} className="px-4 py-3 font-medium text-center text-foreground">
                                                {getRoleLabel(role)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {MODULES.map(module => (
                                        <tr key={module.code} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-foreground">
                                                {module.name}
                                                <div className="text-xs text-muted-foreground font-normal">{module.code}</div>
                                            </td>
                                            {roles.map(role => (
                                                <td key={`${role}-${module.code}`} className="px-4 py-3 text-center">
                                                    <div className="flex justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked(role, module.code)}
                                                            onChange={() => handleToggle(role, module.code)}
                                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                                                        />
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
                                <Save className="h-4 w-4" />
                                {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
