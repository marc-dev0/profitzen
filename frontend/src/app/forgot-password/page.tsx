'use client';

import { useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/axios';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setError('');
        setIsLoading(true);

        try {
            const response = await apiClient.post('/api/auth/forgot-password', { email });
            setSuccess(true);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || 'Error al procesar la solicitud';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-md border border-border">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30">
                            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
                            Revisa tu correo
                        </h2>
                        <p className="mt-2 text-center text-sm text-muted-foreground">
                            Si el correo <strong>{email}</strong> está registrado, recibirás un enlace para restablecer tu contraseña.
                        </p>
                        <p className="mt-4 text-center text-sm text-muted-foreground">
                            El enlace expirará en 24 horas.
                        </p>
                    </div>

                    <div className="mt-6">
                        <Link
                            href="/login"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90"
                        >
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-lg shadow-md border border-border">
                <div>
                    <h2 className="text-center text-3xl font-bold text-foreground">
                        ¿Olvidaste tu contraseña?
                    </h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground">
                        Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-foreground">
                            Correo electrónico
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                            className="mt-1 block w-full px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-background text-foreground"
                            placeholder="usuario@ejemplo.com"
                        />
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
                        {isLoading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
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
