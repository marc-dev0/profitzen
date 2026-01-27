import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import apiClient from '@/lib/axios';
import type { AuthState, User } from '@/types/auth';
import type { PermissionDto } from '@/services/permissionsService';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      knownUsers: [],


      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      login: async (email: string, password: string) => {
        try {
          const response = await apiClient.post<any>('/api/auth/login', {
            email,
            password,
          });

          const { token, user: rawUser } = response.data;

          const stores = rawUser.stores || [];

          const defaultStoreId = stores.length === 1 ? stores[0].id : (stores.length === 0 && rawUser.store ? rawUser.store.id : undefined);

          const user: User = {
            id: rawUser.id,
            email: rawUser.email,
            fullName: rawUser.fullName || `${rawUser.firstName} ${rawUser.lastName}`,
            tenantId: rawUser.tenantId || rawUser.store?.tenantId || '',
            storeId: defaultStoreId,
            currentStoreId: defaultStoreId,
            stores: stores,
            role: Number(rawUser.role),
            permissions: rawUser.permissions || [],
          };

          localStorage.setItem('token', token);

          set((state) => {
            const filteredUsers = state.knownUsers.filter(u => u.email !== user.email);
            return {
              user,
              token,
              isAuthenticated: true,
              knownUsers: [user, ...filteredUsers].slice(0, 5)
            };
          });
        } catch (error) {
          console.error('Login failed:', error);
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      setUser: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      setCurrentStore: (storeId: string) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              currentStoreId: storeId,
              storeId: storeId,
            }
          });
        }
      },

      rolePermissions: [], // Initial state
      setRolePermissions: (permissions: PermissionDto[]) => {
        set({ rolePermissions: permissions });
      },

      removeKnownUser: (email: string) => {
        set((state) => ({
          knownUsers: state.knownUsers.filter((u) => u.email !== email),
        }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        rolePermissions: state.rolePermissions,
        knownUsers: state.knownUsers,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
