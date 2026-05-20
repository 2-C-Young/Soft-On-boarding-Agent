import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface UserProfile {
  id: number;
  githubId: string;
  username: string;
  email: string | null;
  profileImageUrl: string | null;
  teamCode: string | null;
  role: string;
}

export const userApi = {
  getMe: async (token?: string): Promise<UserProfile> => {
    // 만약 파라미터로 토큰을 직접 넘기면 그 토큰을 사용 (로그인 직후 store 업데이트 전일 수 있음)
    const headers = token 
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('유저 정보를 가져오는데 실패했습니다.');
    }

    return response.json();
  },
};
