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

  /**
   * DB의 최신 유저/팀 정보를 가져와 Zustand authStore(localStorage)를 동기화합니다.
   * 로컬 상태가 꼬여서(예: DB엔 팀이 있는데 프론트엔드는 모를 때) 발생하는 라우팅 버그를 방지합니다.
   */
  syncUser: async (): Promise<void> => {
    const { token, login } = useAuthStore.getState();
    if (!token) return;

    try {
      // 1. 유저 기본 정보(teamCode 확인)
      const userProfile = await userApi.getMe(token);

      if (userProfile.teamCode) {
        try {
          // 2. 팀 코드가 있다면 상세 프로필(spaceId, isAdmin 등)까지 조회
          const profile = await userApi.getProfile();
          login(token, {
            teamCode: userProfile.teamCode,
            spaceId: profile.teamInfo?.spaceId ?? null,
            isAdmin: profile.teamInfo?.isAdmin ?? false,
          });
        } catch (profileError) {
          // 프로필 상세 조회 실패 시 최소 정보라도 동기화
          login(token, { teamCode: userProfile.teamCode, spaceId: null, isAdmin: false });
          throw profileError;
        }
      } else {
        // 3. 팀 코드가 없으면 없는 상태로 확실하게 동기화
        login(token, { teamCode: null, spaceId: null, isAdmin: false });
      }
    } catch (error) {
      console.warn('[userApi.syncUser] 유저 동기화 실패:', error);
      throw error;
    }
  },
};
