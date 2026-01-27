'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/axios';

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsLoading(true);

        try {
            await apiClient.post('/api/auth/reset-password', {
                token: params.token,
                newPassword: password
            });

            // Redirect to login with success message
            router.push('/login?reset=success');
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Error al restablecer la contraseña';
            setError(errorMessage);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-md border border-border">
                <div>
                    <h2 className="text-center text-3xl font-bold text-foreground">
                        Restablecer contraseña
                    </h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                        Ingresa tu nueva contraseña
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground">
                                Nueva contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground"
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                                Confirmar contraseña
                            </label>
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isLoading}
                                className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                            <p className="font-bold">⚠️ Error</p>
                            <p>{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50"
                    >
                        {isLoading ? 'Restableciendo...' : 'Restablecer contraseña'}
                    </button>

                    <div className="text-center">
                        <Link href="/login" className="text-sm text-primary hover:text-primary/80">
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
