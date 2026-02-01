'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useRole } from '@/hooks/useRole';
import { cn } from '@/lib/utils';

export function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { isAdmin } = useRole();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', allowedForAll: true },
    { href: '/pos', label: 'Punto de Venta', allowedForAll: true },
    { href: '/products', label: 'Productos', allowedForAll: true },
    { href: '/categories', label: 'Categorías', allowedForAll: true },
    { href: '/inventory', label: 'Inventario', allowedForAll: true },
    { href: '/customers', label: 'Clientes', allowedForAll: true },
    { href: '/purchases', label: 'Compras', allowedForAll: true },
    { href: '/suppliers', label: 'Proveedores', allowedForAll: true },
    { href: '/stores', label: 'Sucursales', adminOnly: true },
    { href: '/users', label: 'Usuarios', adminOnly: true },
  ];

  const visibleItems = navItems.filter(item => {
    if (item.allowedForAll) return true;
    if (item.adminOnly) return isAdmin();
    return false;
  });

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">Profitzen</h1>
            <div className="hidden md:flex space-x-2">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              <div className="font-medium">{user?.fullName}</div>
              <div className="text-xs text-gray-500">{user?.email}</div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
