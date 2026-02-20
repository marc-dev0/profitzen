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
    Banknote,
    Search,
    ChevronLeft,
    ChevronRight
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

export default function Sidebar({
    isOpen,
    onClose,
    isDesktopExpanded = true,
    onToggleDesktop
}: {
    isOpen: boolean;
    onClose: () => void;
    isDesktopExpanded?: boolean;
    onToggleDesktop?: () => void;
}) {
    const pathname = usePathname();
    const { user } = useAuthStore();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(['INICIO', 'VENTAS', 'INVENTARIO', 'FINANZAS Y COMPRAS', 'REPORTES E IA', 'CATALOGOS Y AJUSTES']);
    const [searchQuery, setSearchQuery] = useState('');

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

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev =>
            prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]
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

    // Auto-expand active groups
    useEffect(() => {
        if (menuModules && pathname) {
            const activeModule = menuModules.find(m => isActive(m.route) || (m.children && m.children.some(c => isActive(c.route))));
            if (activeModule && activeModule.groupName) {
                setExpandedGroups(prev =>
                    prev.includes(activeModule.groupName!) ? prev : [...prev, activeModule.groupName!]
                );
            }
        }
    }, [pathname, menuModules]);

    const getIcon = (name: string | undefined) => {
        if (!name) return Package; // Default
        return ICON_MAP[name] || Package;
    };

    const filteredModules = useMemo(() => {
        if (!menuModules) return [];
        if (!searchQuery.trim()) return menuModules;
        const lowerQuery = searchQuery.toLowerCase();

        return menuModules.map(module => {
            const moduleMatches = module.name.toLowerCase().includes(lowerQuery);
            const matchingChildren = module.children?.filter(c => c.name.toLowerCase().includes(lowerQuery));

            if (moduleMatches) return module;
            if (matchingChildren && matchingChildren.length > 0) {
                return { ...module, children: matchingChildren };
            }
            return null;
        }).filter(Boolean) as SystemModule[];
    }, [menuModules, searchQuery]);

    // Grouping logic based on filtered items
    const homeItems = useMemo(() => {
        return [...filteredModules.filter(m => m.groupName === 'INICIO' || !m.groupName)].sort((a, b) => a.sortOrder - b.sortOrder);
    }, [filteredModules]);

    const salesItems = useMemo(() => {
        return [...filteredModules.filter(m => m.groupName === 'VENTAS')].sort((a, b) => a.sortOrder - b.sortOrder);
    }, [filteredModules]);

    const inventoryItems = useMemo(() => {
        return [...filteredModules.filter(m => m.groupName === 'INVENTARIO')].sort((a, b) => a.sortOrder - b.sortOrder);
    }, [filteredModules]);

    const financeItems = useMemo(() => {
        return [...filteredModules.filter(m => m.groupName === 'FINANZAS Y COMPRAS')].sort((a, b) => a.sortOrder - b.sortOrder);
    }, [filteredModules]);

    const intelItems = useMemo(() => {
        return [...filteredModules.filter(m => m.groupName === 'REPORTES E IA')].sort((a, b) => a.sortOrder - b.sortOrder);
    }, [filteredModules]);

    const configItems = useMemo(() => {
        return [...filteredModules.filter(m => m.groupName === 'CATALOGOS Y AJUSTES')].sort((a, b) => a.sortOrder - b.sortOrder);
    }, [filteredModules]);

    const renderMenuItem = (module: SystemModule) => {
        const Icon = getIcon(module.icon);
        const hasChildren = module.children && module.children.length > 0;
        const isExpanded = expandedItems.includes(module.name) || searchQuery.trim() !== '';
        const parentActive = isParentActive(module);

        if (hasChildren) {
            return (
                <div key={module.id} className="space-y-1">
                    <button
                        onClick={() => {
                            if (!isDesktopExpanded && onToggleDesktop) onToggleDesktop();
                            toggleExpand(module.name);
                        }}
                        title={!isDesktopExpanded ? module.name : undefined}
                        className={`w-full group flex items-center ${isDesktopExpanded ? 'justify-between px-4' : 'justify-center px-0'} py-3 text-sm font-bold rounded-xl transition-all duration-200 ${parentActive && !isExpanded
                            ? 'bg-blue-600/10 text-blue-400'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center justify-center">
                            <Icon className={`${isDesktopExpanded ? 'mr-3' : ''} h-5 w-5 flex-shrink-0 ${parentActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-white'}`} />
                            {isDesktopExpanded && <span>{module.name}</span>}
                        </div>
                        {isDesktopExpanded && (
                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : 'text-slate-600'}`} />
                        )}
                    </button>

                    {isExpanded && isDesktopExpanded && (
                        <div className="ml-4 pl-4 border-l border-slate-800 space-y-1 py-1">
                            {module.children!.map((child) => {
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
                title={!isDesktopExpanded ? module.name : undefined}
                className={`group flex items-center ${isDesktopExpanded ? 'px-4' : 'justify-center px-0'} py-3 text-sm font-bold rounded-xl transition-all duration-200 ${parentActive
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                onClick={() => onClose()}
            >
                <Icon className={`${isDesktopExpanded ? 'mr-3' : ''} h-5 w-5 flex-shrink-0 transition-colors ${parentActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                {isDesktopExpanded && <span>{module.name}</span>}
            </Link>
        );
    };

    const renderGroup = (title: string, items: SystemModule[], groupKey: string) => {
        if (items.length === 0) return null;

        const isExpanded = searchQuery.trim() !== '' || expandedGroups.includes(groupKey);

        return (
            <div className="mb-2">
                {!isDesktopExpanded ? (
                    <div className="py-3 flex justify-center">
                        <div className="w-8 h-[2px] bg-slate-800 rounded-full" />
                    </div>
                ) : (
                    <button
                        onClick={() => toggleGroup(groupKey)}
                        className="w-full flex items-center justify-between px-4 py-2 mt-2 mb-1 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-slate-300 transition-colors"
                    >
                        <span>{title}</span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                )}

                {isExpanded || !isDesktopExpanded ? (
                    <div className="space-y-1.5 mt-1">
                        {items.map(renderMenuItem)}
                    </div>
                ) : null}
            </div>
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
                className={`fixed top-0 left-0 z-50 h-full ${isDesktopExpanded ? 'w-64' : 'w-20'} transform bg-slate-950 text-white transition-all duration-300 ease-in-out lg:translate-x-0 border-r border-slate-800/50 shadow-2xl flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* Logo Area */}
                <div className={`flex h-16 shrink-0 items-center ${isDesktopExpanded ? 'justify-between px-6' : 'justify-center'} border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl`}>
                    <Link href="/dashboard" className="flex items-center gap-3 group">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl shadow-lg shadow-blue-900/40 group-hover:scale-110 transition-transform flex-shrink-0">
                            <Store className="h-5 w-5 text-white" />
                        </div>
                        {isDesktopExpanded && (
                            <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-400">
                                Profitzen
                            </span>
                        )}
                    </Link>
                    {isDesktopExpanded && (
                        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition-colors">
                            <X className="h-6 w-6" />
                        </button>
                    )}
                </div>

                {/* Search Bar (Desktop Expanded Only) */}
                {isDesktopExpanded && (
                    <div className="px-4 pt-6 pb-2 shrink-0">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar en el menú..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-slate-900"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white bg-slate-800 rounded-full p-0.5">
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Navigation Links */}
                <nav className={`flex-1 overflow-y-auto px-4 ${isDesktopExpanded ? 'py-2' : 'py-6'} overflow-x-hidden scrollbar-none`}>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-10 bg-slate-900/50 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <>
                            {renderGroup('Inicio', homeItems, 'INICIO')}
                            {renderGroup('Ventas', salesItems, 'VENTAS')}
                            {renderGroup('Inventario', inventoryItems, 'INVENTARIO')}
                            {renderGroup('Finanzas y Compras', financeItems, 'FINANZAS Y COMPRAS')}
                            {renderGroup('Reportes e IA', intelItems, 'REPORTES E IA')}
                            {renderGroup('Catálogos y Ajustes', configItems, 'CATALOGOS Y AJUSTES')}
                        </>
                    )}
                </nav>

                {/* Toggle Desktop Sidebar Button */}
                <div className="shrink-0 p-4 border-t border-slate-800/50 hidden lg:flex justify-end bg-slate-950">
                    <button
                        onClick={onToggleDesktop}
                        className="p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800/50 hover:border-slate-700 w-full flex justify-center"
                        title={isDesktopExpanded ? "Contraer menú" : "Expandir menú"}
                    >
                        {isDesktopExpanded ? (
                            <div className="flex items-center gap-2">
                                <ChevronLeft className="h-4 w-4" />
                                <span className="text-xs font-semibold">Contraer Menú</span>
                            </div>
                        ) : (
                            <ChevronRight className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}
