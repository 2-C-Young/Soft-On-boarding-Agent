import { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { spaceApi } from '../../services/spaceApi';
import { userApi } from '../../services/userApi';
import { useAuthStore } from '../../store/authStore';

interface JoinTeamViewProps {
  onViewChange: (view: 'join' | 'create' | 'analyzing') => void;
}

const ROLES = ['Frontend', 'Backend', 'Fullstack', 'Data', 'PM', 'Design'];

export function JoinTeamView({ onViewChange }: JoinTeamViewProps) {
  const [teamCode, setTeamCodeInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const setTeamCode = useAuthStore((state) => state.setTeamCode);
  const setSpaceId = useAuthStore((state) => state.setSpaceId);

  const handleJoin = async () => {
    if (!teamCode || !selectedRole) return;
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      await spaceApi.joinSpace(teamCode, selectedRole);
      // joinSpace는 void 반환이므로 profile 재조회로 spaceId 획득
      const profile = await userApi.getProfile();
      setTeamCode(teamCode);
      setSpaceId(profile.teamInfo?.spaceId ?? null);
      // 백엔드 합류 성공 후 직무 기반 메인뷰로 이동
      navigate('/functional');
    } catch (error: any) {
      setErrorMsg(error.message || '팀 참여에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 animate-fade-in-up">
      <div className="mb-8">
        <h2 className="text-xl font-medium text-gray-900 mb-2">Join a Workspace</h2>
        <p className="text-sm text-gray-500">초대받은 팀 코드와 담당 직무를 선택해주세요.</p>
      </div>

      <div className="space-y-6 flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Team Code</label>
          <input
            type="text"
            value={teamCode}
            onChange={(e) => setTeamCodeInput(e.target.value)}
            placeholder="e.g. X8J9-2KPL"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-colors uppercase"
            maxLength={8}
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Your Role</label>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedRole === role
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>
        
        {errorMsg && (
          <p className="text-sm text-red-500 font-medium animate-fade-in-up">{errorMsg}</p>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col space-y-4">
        <button
          onClick={handleJoin}
          disabled={!teamCode || !selectedRole || isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-3 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : null}
          <span>{isLoading ? '가입 중...' : 'Join Space'}</span>
          {!isLoading && <ArrowRight className="w-4 h-4" />}
        </button>

        <button
          onClick={() => onViewChange('create')}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          새로운 팀 스페이스를 구축하고 싶으신가요? <span className="font-medium underline underline-offset-4">팀 생성하기</span>
        </button>
      </div>
    </div>
  );
}
