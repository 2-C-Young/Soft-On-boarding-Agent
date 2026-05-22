import { apiFetch } from './apiClient';

export interface CreateSpaceRequest {
  name: string;
  repoUrl: string;
  jobRole: string;
}

export interface JoinSpaceRequest {
  teamCode: string;
  jobRole: string;
}

export interface MemberResponse {
  userId: number;
  username: string;
  email: string;
  jobRole: string;
  isAdmin: boolean;
}

export interface CreateSpaceResponse {
  spaceId: number;
  teamCode: string;
}

// ---- Commit DTO ----
export interface CommitHistoryDto {
  id: string;         // commitSha
  title: string;      // message
  assignee: string;   // author
  commitDate: string;
}

// ---- BoardTask DTO ----
export type BoardTaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface BoardTaskDto {
  id: number;
  spaceId: number;
  title: string;
  status: BoardTaskStatus;
  assignee: string | null;
  label: string | null;
  createdAt: string;
}

// ---- Functional View DTO ----
export interface FunctionalViewNodeDto {
  id: string;
  type: string; // 'forestNode', 'treeNode', 'ringNode'
  parentId?: string | null;
  data: Record<string, any>;
  position: { x: number; y: number };
}

export interface FunctionalViewEdgeDto {
  id: string;
  source: string;
  target: string;
  animated: boolean;
}

export interface FunctionalViewResponseDto {
  nodes: FunctionalViewNodeDto[];
  edges: FunctionalViewEdgeDto[];
}

export const spaceApi = {
  // ======================================================================
  // Space
  // ======================================================================

  createSpace: async (data: CreateSpaceRequest): Promise<CreateSpaceResponse> => {
    const response = await apiFetch(`/api/spaces`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '팀 스페이스 생성에 실패했습니다.');
    }

    return response.json();
  },

  joinSpace: async (teamCode: string, jobRole: string): Promise<void> => {
    const response = await apiFetch(`/api/spaces/join`, {
      method: 'POST',
      body: JSON.stringify({ teamCode, jobRole }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '팀 스페이스 참여에 실패했습니다.');
    }
  },

  leaveSpace: async (): Promise<void> => {
    const response = await apiFetch(`/api/spaces/leave`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '팀 탈퇴에 실패했습니다.');
    }
  },

  // ======================================================================
  // Commits — 팀 코드 기반으로 격리된 커밋 목록 조회
  // ======================================================================

  getCommits: async (teamCode: string): Promise<CommitHistoryDto[]> => {
    const response = await apiFetch(`/api/spaces/${teamCode}/commits`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '커밋 내역을 불러오는데 실패했습니다.');
    }

    return response.json();
  },

  /**
   * 해당 팀의 GitHub repo_url 기반으로 커밋을 강제 재동기화합니다.
   * 스페이스 전환 시 DB에 데이터가 없을 때 호출합니다.
   */
  syncCommits: async (teamCode: string): Promise<CommitHistoryDto[]> => {
    const response = await apiFetch(`/api/spaces/${teamCode}/commits/sync`, {
      method: 'POST',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '커밋 동기화에 실패했습니다.');
    }

    return response.json();
  },

  // ======================================================================
  // BoardTask CRUD — 모든 요청에 teamCode 포함하여 팀 격리 보장
  // ======================================================================

  /** 태스크 목록 조회 */
  getTasks: async (teamCode: string): Promise<BoardTaskDto[]> => {
    const response = await apiFetch(`/api/spaces/${teamCode}/tasks`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '태스크를 불러오는데 실패했습니다.');
    }

    return response.json();
  },

  /** 새 태스크 생성 (수기 입력 메모장용) */
  createTask: async (teamCode: string, title: string): Promise<BoardTaskDto> => {
    const response = await apiFetch(`/api/spaces/${teamCode}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ title, status: 'TODO' }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '태스크 생성에 실패했습니다.');
    }

    return response.json();
  },

  /** 태스크 상태만 변경 (체크박스 클릭 → IN_PROGRESS) */
  updateTaskStatus: async (
    teamCode: string,
    taskId: number,
    status: BoardTaskStatus
  ): Promise<BoardTaskDto> => {
    const response = await apiFetch(
      `/api/spaces/${teamCode}/tasks/${taskId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '태스크 상태 변경에 실패했습니다.');
    }

    return response.json();
  },

  /** 태스크 삭제 */
  deleteTask: async (taskId: number): Promise<void> => {
    const response = await apiFetch(`/api/spaces/tasks/${taskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '태스크 삭제에 실패했습니다.');
    }
  },

  // ======================================================================
  // Functional View — AI 파이프라인 분석 데이터 조회
  // ======================================================================

  getFunctionalView: async (spaceId: number): Promise<FunctionalViewResponseDto> => {
    const response = await apiFetch(`/api/spaces/${spaceId}/functional-view`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Functional View 데이터를 불러오는데 실패했습니다.');
    }

    return response.json();
  },

  // ======================================================================
  // Members — 멤버 관리
  // ======================================================================

  getMembers: async (spaceId: number): Promise<MemberResponse[]> => {
    const response = await apiFetch(`/api/spaces/${spaceId}/members`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '팀원 목록 조회에 실패했습니다.');
    }

    return response.json();
  },

  assignAdmin: async (spaceId: number, userId: number): Promise<void> => {
    const response = await apiFetch(`/api/spaces/${spaceId}/members/${userId}/assign-admin`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '관리자 지정에 실패했습니다.');
    }
  },

  kickMember: async (spaceId: number, userId: number): Promise<void> => {
    const response = await apiFetch(`/api/spaces/${spaceId}/members/${userId}/kick`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || '팀원 추방에 실패했습니다.');
    }
  },
};
