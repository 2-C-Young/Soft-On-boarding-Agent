import { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, AlertCircle, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

// Figma 아이콘 (lucide-react 버전에 따라 export되지 않으므로 인라인 SVG 사용)
const FigmaIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
    <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
    <path d="M12 9h3.5a3.5 3.5 0 1 1-3.5 3.5V9z" />
    <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
    <path d="M8.5 16H12v2.5a3.5 3.5 0 1 1-3.5-3.5z" />
  </svg>
);

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────
interface ComponentInterfaceData {
  componentName: string;
  filePath: string | null;
  figmaUrl: string | null;
  storybookUrl: string | null;
}

interface ComponentDrawerProps {
  componentName: string | null;
  isOpen: boolean;
  onClose: () => void;
}


// ─────────────────────────────────────────
// Skeleton Loader
// ─────────────────────────────────────────
const IframeSkeleton = () => (
  <div className="w-full h-full flex flex-col gap-3 p-4 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/5" />
    <div className="h-4 bg-gray-100 rounded w-4/5" />
    <div className="flex-1 bg-gray-100 rounded-lg mt-2" />
    <div className="h-4 bg-gray-200 rounded w-2/5" />
  </div>
);

// ─────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────
const EmptyState = ({ tab }: { tab: 'figma' | 'storybook' }) => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
      <AlertCircle className="w-6 h-6 text-gray-400" />
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-gray-700">연동된 디자인 산출물이 없습니다.</p>
      <p className="text-xs text-gray-400 leading-relaxed">
        컴포넌트 파일 상단에 아래 주석을 추가하면<br />
        자동으로 연동됩니다.
      </p>
    </div>
    <div className="w-full bg-gray-950 rounded-lg p-4 text-left">
      <p className="text-xs font-mono text-gray-400 mb-1">
        {'// 파일 최상단에 추가하세요'}
      </p>
      {tab === 'figma' ? (
        <p className="text-xs font-mono text-emerald-400 break-all">
          {'// @figma: https://www.figma.com/embed?embed_host=share&url=...'}
        </p>
      ) : (
        <p className="text-xs font-mono text-blue-400 break-all">
          {'// @storybook: https://your-storybook-url.com/iframe.html?id=...'}
        </p>
      )}
    </div>
  </div>
);

// ─────────────────────────────────────────
// Iframe Renderer
// ─────────────────────────────────────────
const IframeRenderer = ({ url, title }: { url: string; title: string }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // URL이 바뀔 때마다 로딩 상태 초기화
  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [url]);

  return (
    <div className="relative w-full h-full bg-gray-50">
      {loading && !error && (
        <div className="absolute inset-0 z-10 bg-white">
          <IframeSkeleton />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-gray-600 font-medium">iframe을 불러올 수 없습니다.</p>
          <p className="text-xs text-gray-400">X-Frame-Options 정책으로 인해 직접 임베딩이 차단될 수 있습니다.</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-md px-3 py-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            새 탭에서 열기
          </a>
        </div>
      ) : (
        <iframe
          src={url}
          title={title}
          className="w-full h-full border-0"
          style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s ease' }}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────
// Main Drawer Component
// ─────────────────────────────────────────
export function ComponentDrawer({ componentName, isOpen, onClose }: ComponentDrawerProps) {
  const [activeTab, setActiveTab] = useState<'figma' | 'storybook'>('figma');
  const [data, setData] = useState<ComponentInterfaceData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const token = useAuthStore(state => state.token);

  const fetchComponentData = useCallback(async (name: string) => {
    setFetchLoading(true);
    setData(null);
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/components/${encodeURIComponent(name)}/interface`, { headers });
      if (res.ok) {
        const json: ComponentInterfaceData = await res.json();
        setData(json);
        setActiveTab(json.figmaUrl ? 'figma' : 'storybook');
      } else {
        setData({ componentName: name, filePath: null, figmaUrl: null, storybookUrl: null });
      }
    } catch {
      setData({ componentName: name, filePath: null, figmaUrl: null, storybookUrl: null });
    } finally {
      setFetchLoading(false);
    }
  }, [API_BASE, token]);

  useEffect(() => {
    if (isOpen && componentName) {
      fetchComponentData(componentName);
    }
  }, [isOpen, componentName, fetchComponentData]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const currentUrl = activeTab === 'figma' ? data?.figmaUrl : data?.storybookUrl;
  const hasFigma = !!data?.figmaUrl;
  const hasStorybook = !!data?.storybookUrl;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-sm font-semibold text-gray-900">
              {componentName ?? '컴포넌트'}
            </h2>
            {data?.filePath && (
              <p className="text-[10px] font-mono text-gray-400">{data.filePath}</p>
            )}
          </div>
          <button
            id="component-drawer-close"
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          {(['figma', 'storybook'] as const).map((tab) => {
            const hasData = tab === 'figma' ? hasFigma : hasStorybook;
            const label = tab === 'figma' ? 'Figma' : 'Storybook';
            return (
              <button
                key={tab}
                id={`component-drawer-tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-medium transition-all border-b-2 ${
                  activeTab === tab
                    ? 'border-gray-900 text-gray-900 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/60'
                }`}
              >
                {tab === 'figma'
                  ? <FigmaIcon className="w-3.5 h-3.5 text-pink-500" />
                  : <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                }
                {label}
                {hasData && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {fetchLoading ? (
            <IframeSkeleton />
          ) : currentUrl ? (
            <IframeRenderer
              key={currentUrl}
              url={currentUrl}
              title={`${componentName} - ${activeTab}`}
            />
          ) : (
            <EmptyState tab={activeTab} />
          )}
        </div>

        {/* Footer */}
        {currentUrl && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
            <span className="text-[10px] text-gray-400 truncate max-w-xs font-mono">{currentUrl}</span>
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 flex-shrink-0 ml-2"
            >
              <ExternalLink className="w-3 h-3" />
              새 탭
            </a>
          </div>
        )}
      </div>
    </>
  );
}
