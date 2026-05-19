import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JoinTeamViewProps {
  onViewChange: (view: 'join' | 'create' | 'analyzing') => void;
}

const ROLES = ['Frontend', 'Backend', 'Fullstack', 'Data', 'PM', 'Design'];

export function JoinTeamView({ onViewChange }: JoinTeamViewProps) {
  const [teamCode, setTeamCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleJoin = () => {
    if (teamCode && selectedRole) {
      // 나중에 직무 기반 메인뷰 설정으로 이어질 수 있음
      navigate('/functional');
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
            onChange={(e) => setTeamCode(e.target.value)}
            placeholder="e.g. X8J9-2KPL"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-colors"
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
      </div>

      <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col space-y-4">
        <button
          onClick={handleJoin}
          disabled={!teamCode || !selectedRole}
          className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-3 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Join Space</span>
          <ArrowRight className="w-4 h-4" />
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
