'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/axios';

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    fullName: '',
    storeName: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiClient.post('/api/auth/register', {
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        fullName: formData.fullName,
        storeName: formData.storeName
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      setUser(user, token);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar la empresa');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-xl shadow-lg border border-border">
        <div>
          <h2 className="text-center text-3xl font-bold text-foreground">
            Profitzen
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Registra tu empresa y comienza gratis
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-foreground mb-1">
                Nombre de tu Empresa *
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                placeholder="Ej: Bodega Don José"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-foreground mb-1">
                Tu Nombre Completo *
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                placeholder="Ej: José Pérez"
              />
            </div>

            <div>
              <label htmlFor="storeName" className="block text-sm font-medium text-foreground mb-1">
                Nombre de tu Tienda *
              </label>
              <input
                id="storeName"
                name="storeName"
                type="text"
                required
                value={formData.storeName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                placeholder="Ej: Tienda Principal"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Correo Electrónico *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Contraseña *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
                Confirmar Contraseña *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                placeholder="Repite tu contraseña"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Registrando...' : 'Crear Cuenta Gratis'}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-primary hover:text-primary/80">
              ¿Ya tienes cuenta? Inicia sesión
            </Link>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            <p>✨ 14 días de prueba gratis</p>
            <p>🚀 Sin tarjeta de crédito</p>
            <p>📊 Acceso completo al sistema</p>
          </div>
        </form>
      </div>
    </div>
  );
}
