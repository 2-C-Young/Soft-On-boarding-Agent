import { useAuthStore } from '../store/authStore';
import { apiFetch } from './apiClient';

export const getAuthHeaders = () => {
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

export interface UserProfileResponse {
  userName: string;
  userEmail: string | null;
  role: string;
  teamInfo: {
    spaceId: number;
    teamName: string;
    teamCode: string;
    repoUrl: string;
    createdAt: string;
    isAdmin: boolean;
  } | null;
}

export const userApi = {
  getMe: async (token?: string): Promise<UserProfile> => {
    // 만약 파라미터로 토큰을 직접 넘기면 그 토큰을 사용 (로그인 직후 store 업데이트 전일 수 있음)
    const headers = token
      ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      : getAuthHeaders();

    const response = await apiFetch('/api/users/me', {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error('유저 정보를 가져오는데 실패했습니다.');
    }

    return response.json();
  },

  getProfile: async (): Promise<UserProfileResponse> => {
    const response = await apiFetch('/api/users/me/profile', {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error('마이페이지 프로필 정보를 가져오는데 실패했습니다.');
    }

    const data: UserProfileResponse = await response.json();
    
    // 중앙 방어 로직: 프로필을 가져왔는데 팀 정보가 없다면, 
    // 사용자가 추방당했거나 팀이 해체된 것이므로 로컬 상태를 클리어함
    const currentUser = useAuthStore.getState().user;
    if (!data.teamInfo && currentUser?.teamCode) {
      useAuthStore.getState().setTeamCode(null);
      useAuthStore.getState().setSpaceId(null);
      useAuthStore.getState().setIsAdmin(false);
    }

    return data;
  },
};
