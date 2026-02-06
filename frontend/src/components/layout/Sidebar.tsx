'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { getUserMenu, SystemModule } from '@/services/permissionsService';
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
    Sparkles,
    Clock,
    Shield,
    Settings,
    TrendingUp,
    Briefcase,
    Banknote
} from 'lucide-react';

// Icon Map for dynamic icons from DB
const ICON_MAP: Record<string, any> = {
    'LayoutDashboard': LayoutDashboard,
    'ShoppingCart': ShoppingCart,
    'Package': Package,
    'Users': Users,
    'Store': Store,
    'UserCog': UserCog,
    'FileText': FileText,
    'CreditCard': CreditCard,
    'Tags': Tags,
    'Truck': Truck,
    'BarChart3': BarChart3,
    'BrainCircuit': BrainCircuit,
    'Sparkles': Sparkles,
    'Clock': Clock,
    'Shield': Shield,
    'Settings': Settings,
    'TrendingUp': TrendingUp,
    'Briefcase': Briefcase,
    'Banknote': Banknote
};

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const pathname = usePathname();
    const { user } = useAuthStore();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const { data: menuModules, isLoading } = useQuery({
        queryKey: ['user-menu', user?.id, user?.role],
        queryFn: getUserMenu,
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!user,
    });

    const isActive = (path: string | undefined): boolean => {
        if (!path || !pathname) return false;

        // Exact match is top priority
        if (pathname === path) return true;

        // For nested routes, ensure we pick the most specific one
        if (pathname.startsWith(path + '/')) {
            const allRoutes = menuModules?.flatMap(m => [
                m.route,
                ...(m.children?.map(c => c.route) || [])
            ]).filter(Boolean) as string[];

            const hasBetterMatch = allRoutes.some(r =>
                r !== path &&
                (pathname === r || pathname.startsWith(r + '/')) &&
                r.length > path.length
            );

            return !hasBetterMatch;
        }

        return false;
    };

    const isParentActive = (module: SystemModule) => {
        if (module.route && isActive(module.route)) return true;
        return module.children?.some(child => pathname === child.route || pathname?.startsWith(child.route + '/')) ?? false;
    };

    const toggleExpand = (name: string) => {
        setExpandedItems(prev =>
            prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]
        );
    };

    // Auto-expand parent if a child is active
    useEffect(() => {
        if (menuModules) {
            const activeParents = menuModules
                .filter(m => m.children?.some(c => pathname === c.route || pathname?.startsWith(c.route + '/')))
                .map(m => m.name);

            setExpandedItems(prev => Array.from(new Set([...prev, ...activeParents])));
        }
    }, [pathname, menuModules]);

    const getIcon = (name: string | undefined) => {
        if (!name) return Package; // Default
        return ICON_MAP[name] || Package;
    };

    // Grouping logic (simplified since backend already sends them somewhat grouped)
    const principalItems = menuModules?.filter(m => m.groupName === 'PRINCIPAL' || !m.groupName) || [];
    const salesItems = useMemo(() => {
        let items = menuModules?.filter(m => m.groupName === 'VENTAS') || [];

        if (!items.some(i => i.code === 'collections')) {
            items.push({
                id: 'collections-manual',
                code: 'collections',
                name: 'Cuentas por Cobrar',
                route: '/collections',
                icon: 'Banknote',
                sortOrder: 10,
                groupName: 'VENTAS',
                children: []
            });
        }
        return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    }, [menuModules]);

    const intelItems = useMemo(() => {
        let items = menuModules?.filter(m => m.groupName === 'INTELIGENCIA') || [];

        // Hide AI items for now - RESTORED
        // items = items.filter(i => i.code !== 'analytics_ia' && i.code !== 'analytics_ia_history');

        // Ensure Reportes is present if user has analytics permissions
        if (!items.some(i => i.code === 'reports')) {
            items.push({
                id: 'reports-manual',
                code: 'reports',
                name: 'Reporte de Ventas',
                route: '/reports',
                icon: 'FileText',
                sortOrder: 0,
                groupName: 'INTELIGENCIA',
                children: []
            });
        }

        // Sort to make sure it follows sortOrder
        return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    }, [menuModules]);

    const opsItems = useMemo(() => {
        let items = menuModules?.filter(m => m.groupName === 'OPERACIONES') || [];

        if (!items.some(i => i.code === 'expenses')) {
            items.push({
                id: 'expenses-manual',
                code: 'expenses',
                name: 'Gastos',
                route: '/expenses',
                icon: 'CreditCard',
                sortOrder: 20,
                groupName: 'OPERACIONES',
                children: []
            });
        }
        if (!items.some(i => i.code === 'cash-control')) {
            items.push({
                id: 'cash-control-manual',
                code: 'cash-control',
                name: 'Control de Caja',
                route: '/cash-control',
                icon: 'Banknote',
                sortOrder: 30,
                groupName: 'OPERACIONES',
                children: []
            });
        }
        return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    }, [menuModules]);
    const configItems = menuModules?.filter(m => m.groupName === 'CONFIGURACION') || [];

    const renderMenuItem = (module: SystemModule) => {
        const Icon = getIcon(module.icon);
        const hasChildren = module.children && module.children.length > 0;
        const isExpanded = expandedItems.includes(module.name);
        const parentActive = isParentActive(module);

        if (hasChildren) {
            return (
                <div key={module.id} className="space-y-1">
                    <button
                        onClick={() => toggleExpand(module.name)}
                        className={`w-full group flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${parentActive && !isExpanded
                            ? 'bg-blue-600/10 text-blue-400'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center">
                            <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${parentActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'}`} />
                            {module.name}
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : 'text-slate-600'}`} />
                    </button>

                    {isExpanded && (
                        <div className="ml-4 pl-4 border-l border-slate-800 space-y-1 py-1">
                            {module.children.map((child) => {
                                const active = isActive(child.route);
                                const ChildIcon = getIcon(child.icon);
                                return (
                                    <Link
                                        key={child.id}
                                        href={child.route || '#'}
                                        className={`group flex items-center px-4 py-2.5 text-xs font-bold rounded-lg transition-all duration-200 ${active
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                            : 'text-slate-500 hover:bg-slate-900 hover:text-white'
                                            }`}
                                        onClick={() => onClose()}
                                    >
                                        {ChildIcon && <ChildIcon className={`mr-2.5 h-3.5 w-3.5 ${active ? 'text-white' : 'text-slate-600 group-hover:text-white'}`} />}
                                        {child.name}
                                        {child.code === 'analytics_ia' && (
                                            <Sparkles className="ml-auto h-3 w-3 text-yellow-500 animate-pulse" />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <Link
                key={module.id}
                href={module.route || '#'}
                className={`group flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${parentActive
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                onClick={() => onClose()}
            >
                <Icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${parentActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                {module.name}
            </Link>
        );
    };

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
                className={`fixed top-0 left-0 z-50 h-full w-64 transform bg-slate-950 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 border-r border-slate-800/50 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo Area */}
                <div className="flex h-20 items-center justify-between px-6 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl">
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl shadow-lg shadow-blue-900/40 group-hover:scale-110 transition-transform">
                            <Store className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
                            Profitzen
                        </span>
                    </Link>
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="h-[calc(100vh-5rem)] overflow-y-auto px-4 py-8 space-y-6 scrollbar-none">
                    {isLoading ? (
                        <div className="px-4 py-10 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-10 bg-slate-900/50 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <>
                            {principalItems.length > 0 && (
                                <div>
                                    <div className="px-4 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        Principal
                                    </div>
                                    <div className="space-y-1.5">
                                        {principalItems.map(renderMenuItem)}
                                    </div>
                                </div>
                            )}

                            {salesItems.length > 0 && (
                                <div>
                                    <div className="px-4 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        Ventas
                                    </div>
                                    <div className="space-y-1.5">
                                        {salesItems.map(renderMenuItem)}
                                    </div>
                                </div>
                            )}

                            {intelItems.length > 0 && (
                                <div>
                                    <div className="px-4 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        Inteligencia
                                    </div>
                                    <div className="space-y-1.5">
                                        {intelItems.map(renderMenuItem)}
                                    </div>
                                </div>
                            )}

                            {opsItems.length > 0 && (
                                <div>
                                    <div className="px-4 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        Operaciones
                                    </div>
                                    <div className="space-y-1.5">
                                        {opsItems.map(renderMenuItem)}
                                    </div>
                                </div>
                            )}

                            {configItems.length > 0 && (
                                <div className="pt-4 mt-4 border-t border-slate-900">
                                    <div className="px-4 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        Configuración
                                    </div>
                                    <div className="space-y-1.5">
                                        {configItems.map(renderMenuItem)}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </nav>
            </aside>
        </>
    );
}
