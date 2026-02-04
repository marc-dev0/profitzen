'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { AlertCircle, Eye, EyeOff, Lock, Mail, User as UserIcon, X, Plus } from 'lucide-react';
import { User } from '@/types/auth';
import { UserRole } from '@/types/user';

export default function LoginPage() {
  const router = useRouter();
  const { login, knownUsers, removeKnownUser, _hasHydrated } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // State for account selection mode
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);

  // Determine if we should show the account chooser
  const showAccountChooser = _hasHydrated && knownUsers.length > 0 && !isAddingAccount && !selectedUser;

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setEmail(user.email);
    setPassword(''); // Always clear password for security
    setError('');
  };

  const handleRemoveUser = (e: React.MouseEvent, userEmail: string) => {
    e.stopPropagation();
    removeKnownUser(userEmail);
    if (knownUsers.length <= 1) {
      setIsAddingAccount(true); // If removed last user, go to form
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      console.log('✅ Login successful, redirecting...');
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.role === UserRole.Cashier) {
        router.push('/pos');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.log('❌ Login error:', err);
      // Trigger shake animation
      setShake(true);
      setTimeout(() => setShake(false), 500);

      // Submit friendly error message
      let errorMessage = 'Ocurrió un error inesperado';

      if (err.response?.status === 401 || err.message?.includes('401')) {
        errorMessage = 'Contraseña incorrecta. Por favor verifícala.'; // More specific for this flow
      } else if (err.message === 'Network Error') {
        errorMessage = 'Error de conexión. Verifica tu internet.';
      } else {
        errorMessage = err.response?.data?.message || err.message || errorMessage;
      }

      setPassword('');
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  if (!_hasHydrated) return null; // Prevent flash

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-2xl shadow-xl border border-border">

        {/* Account Chooser View */}
        {showAccountChooser ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="mt-2 text-3xl font-extrabold text-foreground tracking-tight">
                Selecciona una cuenta
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Para continuar en Profitzen
              </p>
            </div>

            <div className="space-y-3 mt-8">
              {knownUsers.map((user) => (
                <div
                  key={user.email}
                  onClick={() => handleUserSelect(user)}
                  className="group relative flex items-center p-3 rounded-xl border border-border hover:bg-accent cursor-pointer transition-all hover:shadow-md"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {user.fullName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.fullName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleRemoveUser(e, user.email)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    title="Eliminar cuenta de este dispositivo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                onClick={() => setIsAddingAccount(true)}
                className="w-full flex items-center p-3 rounded-xl border border-dashed border-border hover:bg-accent hover:border-primary/50 cursor-pointer transition-all text-muted-foreground hover:text-foreground"
              >
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="ml-4 font-medium">Usar otra cuenta</div>
              </button>
            </div>
          </div>
        ) : (
          /* Login Form (Standard or "Enter Password") */
          <>
            <div className="text-center">
              {selectedUser ? (
                <div className="flex flex-col items-center cursor-pointer" onClick={() => setSelectedUser(null)}>
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl mb-4 shadow-sm">
                    {selectedUser.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    Hola, {selectedUser.fullName.split(' ')[0]}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground hover:text-primary transition-colors">
                    <span>{selectedUser.email}</span>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full border">Cambiar</span>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="mt-2 text-3xl font-extrabold text-foreground tracking-tight">
                    Bienvenido a Profitzen
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ingresa tus credenciales para acceder al sistema
                  </p>
                </>
              )}
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-5">
                {!selectedUser && (
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                      Correo electrónico
                    </label>
                    <div className="relative rounded-lg shadow-sm group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="block w-full pl-10 pr-3 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 outline-none sm:text-sm bg-background text-foreground placeholder-muted-foreground"
                        placeholder="ej. usuario@empresa.com"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                    Contraseña
                  </label>
                  <div className="relative rounded-lg shadow-sm group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      autoFocus={!!selectedUser}
                      className="block w-full pl-10 pr-10 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 outline-none sm:text-sm bg-background text-foreground placeholder-muted-foreground tracking-widest"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div className={`rounded-lg bg-red-50 p-4 border border-red-100 ${shake ? 'animate-shake' : ''}`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        No pudimos iniciar sesión
                      </h3>
                      <div className="mt-1 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-primary hover:text-primary/80 transition-colors">
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform active:scale-[0.99]"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verificando...
                    </span>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>
              </div>

              {/* Back button when adding account manually or selecting user */}
              {(isAddingAccount || selectedUser) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAccount(false);
                    setSelectedUser(null);
                    setEmail('');
                    setPassword('');
                    setError('');
                  }}
                  className="w-full text-center text-sm text-primary hover:underline mt-4"
                >
                  {knownUsers.length > 0 ? 'Volver a selección de cuenta' : 'Cancelar'}
                </button>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                ¿No tienes una cuenta?{' '}
                <Link href="/register" className="font-bold text-primary hover:text-primary/80 transition-colors">
                  Regístrate gratis
                </Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div >
  );
}
