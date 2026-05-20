import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// 공통 Fetch 옵션 생성기 (JWT 포함)
const getAuthHeaders = () => {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface CreateSpaceRequest {
  name: string;
  repoUrl: string;
}

export interface CreateSpaceResponse {
  spaceId: number;
  teamCode: string;
}

export const spaceApi = {
  createSpace: async (data: CreateSpaceRequest): Promise<CreateSpaceResponse> => {
    const response = await fetch(`${API_BASE_URL}/spaces`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '팀 스페이스 생성에 실패했습니다.');
    }

    return response.json();
  },

  joinSpace: async (teamCode: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/spaces/join`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ teamCode }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '팀 스페이스 참여에 실패했습니다.');
    }
  },
};
