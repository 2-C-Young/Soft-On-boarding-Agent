import { useState } from 'react';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { spaceApi } from '../../services/spaceApi';
import { useAuthStore } from '../../store/authStore';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface CreateTeamViewProps {
  onViewChange: (view: 'join' | 'create' | 'analyzing') => void;
}

export function CreateTeamView({ onViewChange }: CreateTeamViewProps) {
  const [teamName, setTeamName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const setTeamCode = useAuthStore((state) => state.setTeamCode);

  const handleCreate = async () => {
    if (!teamName || !repoUrl) return;
    
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await spaceApi.createSpace({ name: teamName, repoUrl });
      setTeamCode(response.teamCode);
      onViewChange('analyzing');
    } catch (error: any) {
      setErrorMsg(error.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1 animate-fade-in-right">
      <div className="mb-6">
        <button 
          onClick={() => onViewChange('join')}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>뒤로 가기</span>
        </button>
        <h2 className="text-xl font-medium text-gray-900 mb-2">Create New Space</h2>
        <p className="text-sm text-gray-500">분석할 GitHub 레포지토리 정보와 스페이스 이름을 입력하세요.</p>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Space Name
          </label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="e.g. My Awesome Project"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-colors"
          />
        </div>

        <div>
          <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
            <GithubIcon className="w-4 h-4 mr-2" />
            Repository URL
          </label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repo"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-colors"
          />
        </div>
        
        {errorMsg && (
          <p className="text-sm text-red-500 font-medium animate-fade-in-up">{errorMsg}</p>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col space-y-4">
        <button
          onClick={handleCreate}
          disabled={!teamName || !repoUrl || isLoading}
          className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white px-4 py-3 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
          )}
          <span>{isLoading ? '생성 중...' : '생성 및 분석 시작'}</span>
        </button>
      </div>
    </div>
  );
}
