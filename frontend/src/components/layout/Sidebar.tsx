'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useAccess } from '@/hooks/useAccess';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    Store,
    UserCog,
    FileText,
    CreditCard,
    Tags,
    ChevronDown,
    X,
    Truck,
    BarChart3,
    BrainCircuit,
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname();
    const { canAccess } = useAccess();

    const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, code: 'dashboard' },
        { name: 'Punto de Venta', href: '/pos', icon: ShoppingCart, code: 'pos' },
        { name: 'Ventas', href: '/sales', icon: FileText, code: 'sales' },
        { name: 'Reportes', href: '/analytics', icon: BarChart3, code: 'analytics' },
        { name: 'Analizador IA', href: '/analytics/ia', icon: BrainCircuit, code: 'analytics' },
        { name: 'Productos', href: '/products', icon: Tags, code: 'products' },
        { name: 'Inventario', href: '/inventario', icon: Package, code: 'inventory' },
        { name: 'Compras', href: '/purchases', icon: CreditCard, code: 'purchases' },
        { name: 'Proveedores', href: '/suppliers', icon: Truck, code: 'suppliers' },
        { name: 'Clientes', href: '/customers', icon: Users, code: 'customers' },
        { name: 'Sucursales', href: '/stores', icon: Store, code: 'stores' },
    ];

    const configItems = [
        { name: 'Mi Empresa', href: '/settings', icon: Store, code: 'settings' },
        { name: 'Usuarios y Roles', href: '/users', icon: UserCog, code: 'users' },
    ];

    const visibleNavItems = navItems.filter((item) => canAccess(item.code as any));
    const visibleConfigItems = configItems.filter((item) => canAccess(item.code as any));

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 transform bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo Area */}
                <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="bg-blue-600 p-1.5 rounded-lg">
                            <Store className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-200">
                            Profitzen
                        </span>
                    </Link>
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="h-[calc(100vh-4rem)] overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Principal
                    </div>
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${active
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                                onClick={() => onClose()}
                            >
                                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                                {item.name}
                            </Link>
                        );
                    })}

                    {visibleConfigItems.length > 0 && (
                        <>
                            <div className="mt-6 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Configuración
                            </div>
                            {visibleConfigItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${active
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                            }`}
                                        onClick={() => onClose()}
                                    >
                                        <Icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${active ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </>
                    )}
                </nav>
            </aside>
        </>
    );
}
