import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: { teamCode: string | null } | null;
  login: (token: string, user?: { teamCode: string | null }) => void;
  logout: () => void;
  setTeamCode: (teamCode: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      login: (token, user = { teamCode: null }) => 
        set({ isAuthenticated: true, token, user }),
      logout: () => 
        set({ isAuthenticated: false, token: null, user: null }),
      setTeamCode: (teamCode) => 
        set((state) => ({ user: state.user ? { ...state.user, teamCode } : { teamCode } })),
    }),
    {
      name: 'auth-storage', // 브라우저 localStorage에 저장
    }
  )
);
