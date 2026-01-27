'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { getRoleLabel } from '@/types/user';
import {
    Menu,
    LogOut,
    ChevronDown,
    Store,
    Shield,
    Bell,
    Users
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PermissionsDialog } from '@/app/users/PermissionsDialog';
import { getPermissions } from '@/services/permissionsService';
import Sidebar from './Sidebar';
import StoreSelectionDialog from '@/components/auth/StoreSelectionDialog';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { user, logout: authLogout, setCurrentStore, setRolePermissions } = useAuthStore();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isStoreMenuOpen, setIsStoreMenuOpen] = useState(false);
    const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [pendingStoreId, setPendingStoreId] = useState<string | null>(null);

    // Fetch permissions on mount/user change
    useEffect(() => {
        if (user && user.role) {
            getPermissions()
                .then(perms => setRolePermissions(perms))
                .catch(console.error);
        }
    }, [user, setRolePermissions]);

    const logout = () => {
        authLogout();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Sidebar Component */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Top Header */}
            <header className="fixed top-0 right-0 left-0 z-30 h-16 bg-white dark:bg-card border-b border-border transition-all duration-300 lg:left-64">
                <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Left side: Toggle & Title (Optional) */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 text-muted-foreground hover:bg-accent rounded-lg lg:hidden"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Right side: Global Actions */}
                    <div className="flex items-center gap-4">
                        {/* Store Switcher */}
                        {user?.stores && user.stores.length > 1 && (
                            <div className="relative">
                                <button
                                    onClick={() => setIsStoreMenuOpen(!isStoreMenuOpen)}
                                    className="flex items-center px-3 py-2 text-sm font-medium text-foreground bg-accent/50 hover:bg-accent rounded-lg transition-colors border border-border"
                                >
                                    <Store className="w-4 h-4 mr-2 text-muted-foreground" />
                                    {user.stores.find(s => s.id === user.currentStoreId)?.name || 'Sucursal'}
                                    <ChevronDown className="w-3 h-3 ml-2 text-muted-foreground" />
                                </button>

                                {isStoreMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsStoreMenuOpen(false)} />
                                        <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-card border border-border ring-1 ring-black ring-opacity-5 p-1 z-50 animate-in fade-in zoom-in-95">
                                            <div className="px-3 py-2 border-b border-border">
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cambiar Sucursal</p>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto py-1">
                                                {user.stores.map((store) => (
                                                    <button
                                                        key={store.id}
                                                        onClick={() => {
                                                            setPendingStoreId(store.id);
                                                            setIsStoreMenuOpen(false);
                                                        }}
                                                        className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-colors ${user.currentStoreId === store.id ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent'
                                                            }`}
                                                    >
                                                        <Store className="w-4 h-4 mr-3 opacity-70" />
                                                        {store.name}
                                                        {user.currentStoreId === store.id && <div className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="h-6 w-px bg-border hidden sm:block"></div>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center gap-3 p-1 rounded-full hover:bg-accent transition-colors"
                            >
                                <div className="hidden text-right sm:block">
                                    <p className="text-sm font-medium text-foreground">{user?.fullName || 'Usuario'}</p>
                                    <p className="text-xs text-muted-foreground">{user?.role ? getRoleLabel(user.role) : 'Sin Rol'}</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </button>

                            {isProfileMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-xl bg-card border border-border ring-1 ring-black ring-opacity-5 py-1 z-50 animate-in fade-in zoom-in-95">
                                        <div className="px-4 py-3 border-b border-border sm:hidden">
                                            <p className="text-sm font-medium text-foreground">{user?.fullName || 'Usuario'}</p>
                                            <p className="text-xs text-muted-foreground">{user?.role ? getRoleLabel(user.role) : 'Sin Rol'}</p>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setIsProfileMenuOpen(false);
                                                setIsPermissionsOpen(true);
                                            }}
                                            className="w-full flex items-center px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                                        >
                                            <Shield className="w-4 h-4 mr-3 text-muted-foreground" />
                                            Configurar Permisos
                                        </button>

                                        <div className="my-1 border-t border-border"></div>

                                        <button
                                            onClick={() => {
                                                logout();
                                                setTimeout(() => router.push('/login'), 100);
                                            }}
                                            className="w-full flex items-center px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                                        >
                                            <Users className="w-4 h-4 mr-3 text-muted-foreground" />
                                            Cambiar Usuario
                                        </button>

                                        <button
                                            onClick={logout}
                                            className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <LogOut className="w-4 h-4 mr-3" />
                                            Cerrar Sesión
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="pt-16 lg:pl-64 transition-all duration-300">
                <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
                    {children}
                </main>
            </div>

            {/* Global Dialogs */}
            <PermissionsDialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen} />
            <StoreSelectionDialog open={!!user && !user.currentStoreId && (user.stores?.length ?? 0) > 1} />

            <AlertDialog open={!!pendingStoreId} onOpenChange={(open) => !open && setPendingStoreId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Cambiar de Sucursal?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Está a punto de cambiar a la sucursal <strong>{user?.stores?.find(s => s.id === pendingStoreId)?.name}</strong>.
                            Esto recargará la aplicación con los datos de la nueva tienda.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setPendingStoreId(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (pendingStoreId) {
                                    setCurrentStore(pendingStoreId);
                                    setPendingStoreId(null);
                                    window.location.reload();
                                }
                            }}
                        >
                            Confirmar Cambio
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
