import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Admin {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface AuthState {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  login: (admin: Admin, token: string) => void;
  logout: () => void;
}

export const useAdminAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      admin: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      login: (admin, token) => {
        localStorage.setItem('adminToken', token);
        set({ admin, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('adminToken');
        set({ admin: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'admin-auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
