import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: { teamCode: string | null; spaceId: number | null } | null;
  login: (token: string, user?: { teamCode: string | null; spaceId: number | null }) => void;
  logout: () => void;
  setTeamCode: (teamCode: string | null) => void;
  setSpaceId: (spaceId: number | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      login: (token, user = { teamCode: null, spaceId: null }) =>
        set({ isAuthenticated: true, token, user }),
      logout: () =>
        set({ isAuthenticated: false, token: null, user: null }),
      setTeamCode: (teamCode) =>
        set((state) => ({ user: state.user ? { ...state.user, teamCode } : { teamCode, spaceId: null } })),
      setSpaceId: (spaceId) =>
        set((state) => ({ user: state.user ? { ...state.user, spaceId } : { teamCode: null, spaceId } })),
    }),
    {
      name: 'auth-storage', // 브라우저 localStorage에 저장
    }
  )
);
