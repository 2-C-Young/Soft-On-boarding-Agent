import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, FolderTree, GitCommit } from 'lucide-react';

export function AnalyzingLoader() {
  const navigate = useNavigate();

  useEffect(() => {
    // 4초 후 기능뷰로 자동 리다이렉트
    const timer = setTimeout(() => {
      navigate('/functional');
    }, 4000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-full flex-1 animate-fade-in text-center py-8">
      
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-gray-900 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-gray-900 animate-pulse" />
        </div>
      </div>

      <h2 className="text-xl font-medium text-gray-900 mb-3 animate-pulse">
        AI Repository Analysis
      </h2>
      
      <p className="text-sm text-gray-500 max-w-[280px] leading-relaxed">
        AI가 레포지토리 구조와 최근 커밋 히스토리를 분석하여 4-Way View를 구축하고 있습니다...
      </p>

      <div className="mt-8 flex gap-4 text-gray-400">
        <FolderTree className="w-5 h-5 animate-bounce" style={{ animationDelay: '0ms' }} />
        <GitCommit className="w-5 h-5 animate-bounce" style={{ animationDelay: '150ms' }} />
        <Loader2 className="w-5 h-5 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
