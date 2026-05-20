import { useState, useCallback } from 'react';
import { 
  Folder, FileCode2, Palette, Box, Search,
  ChevronDown, ChevronRight, BookOpen, GitCommit, GitPullRequest, Clock
} from 'lucide-react';
import { ComponentDrawer } from '../components/interface/ComponentDrawer';

// Custom FigmaIcon inline component to avoid old lucide-react export issues
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

// Color Swatch Component for Light Theme
const ColorSwatch = ({ name, hex, bgClass, borderClass = 'border-gray-200' }: { name: string, hex: string, bgClass: string, borderClass?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1.5 cursor-pointer group" onClick={handleCopy}>
      <div className={`h-8 w-full ${bgClass} rounded-[4px] border ${borderClass} relative flex items-center justify-center transition-colors hover:border-gray-300`}>
        {copied && <span className="absolute text-[9px] bg-gray-900 text-white px-1.5 py-0.5 rounded shadow">Copied</span>}
      </div>
      <div className="text-[10px] font-mono text-gray-500 flex flex-col leading-tight">
        <span className="text-gray-700 font-medium">{name}</span> 
        <span>{hex}</span>
      </div>
    </div>
  );
};

export function InterfaceView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    dashboard: true,
    settings: true,
    auth: true,
  });

  const toggleFolder = (folder: string) => {
    setOpenFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const handleComponentClick = useCallback((name: string) => {
    setSelectedComponent(name);
    setDrawerOpen(true);
  }, []);

  const componentsData = [
    {
      id: 'button',
      name: 'Button',
      ui: (
        <div className="flex items-center gap-3">
          <button className="bg-gray-900 text-white px-3 py-1.5 rounded-[4px] font-medium text-xs hover:bg-gray-800 transition-colors shadow-sm">
            Primary
          </button>
          <button className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-[4px] font-medium text-xs hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm">
            Secondary
          </button>
        </div>
      ),
      code: `interface ButtonProps {\n  variant?: 'primary' | 'secondary' | 'ghost';\n  size?: 'sm' | 'md' | 'lg';\n  disabled?: boolean;\n  children: ReactNode;\n}`
    },
    {
      id: 'input',
      name: 'Input',
      ui: (
        <div className="w-full max-w-[240px] relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search components..." 
            className="w-full bg-white border border-gray-300 rounded-[4px] py-1.5 pl-8 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm" 
            readOnly
          />
        </div>
      ),
      code: `interface InputProps {\n  type?: 'text' | 'password' | 'email';\n  placeholder?: string;\n  icon?: LucideIcon;\n  error?: string;\n}`
    },
    {
      id: 'badge',
      name: 'Badge',
      ui: (
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-700">
            Default
          </span>
          <span className="inline-flex items-center rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            Active
          </span>
        </div>
      ),
      code: `interface BadgeProps {\n  status: 'default' | 'active';\n  label: string;\n  dot?: boolean;\n}`
    },
    {
      id: 'card',
      name: 'Card',
      ui: (
        <div className="bg-white border border-gray-200 rounded-[6px] p-4 w-full max-w-[220px] shadow-sm hover:shadow-md transition-shadow">
          <h4 className="text-xs font-medium text-gray-900 mb-1">Project Linear</h4>
          <p className="text-[10px] text-gray-500 leading-relaxed">Streamline your workflow with high-performance tracking.</p>
        </div>
      ),
      code: `interface CardProps {\n  title: string;\n  description?: string;\n  icon?: ReactNode;\n  children?: ReactNode;\n}`
    }
  ];

  const gitHistory = [
    { id: 1, type: 'pr', text: 'PR #24: Button component style update', time: '2 days ago' },
    { id: 2, type: 'commit', text: 'Update typography tokens (Inter font)', time: '3 days ago' },
    { id: 3, type: 'pr', text: 'PR #21: Add Input component variations', time: '5 days ago' },
    { id: 4, type: 'commit', text: 'Refactor folder structure in src/app', time: '1 week ago' },
  ];

  const filteredComponents = componentsData.filter(comp => 
    comp.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full w-full bg-[#FAFAFA] text-gray-900 p-6 md:p-10 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* Top Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 1. Top-Left: Screen-Code Mapping */}
          <div className="flex flex-col bg-[#FAFAFA] border border-gray-200 rounded-[6px] overflow-hidden shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
              <h3 className="text-xs font-semibold flex items-center gap-2 text-gray-800">
                <Folder className="w-3.5 h-3.5 text-gray-500" />
                Screen-Code Mapping
              </h3>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-600 bg-[#FAFAFA] border border-gray-200 rounded-[4px] hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm">
                  <FigmaIcon className="w-3 h-3 text-pink-500" />
                  Figma Linked
                </button>
                <button className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-gray-600 bg-[#FAFAFA] border border-gray-200 rounded-[4px] hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm">
                  <BookOpen className="w-3 h-3 text-blue-500" />
                  Storybook
                </button>
              </div>
            </div>
            
            <div className="p-5 flex-1 text-[11px] text-gray-500 font-mono flex flex-col gap-4 overflow-y-auto bg-[#FAFAFA]">
              <div className="flex items-start gap-2">
                <Folder className="w-3.5 h-3.5 text-gray-500 mt-0.5" />
                <div className="text-gray-800 font-semibold">src/app</div>
              </div>
              
              <div className="flex flex-col relative before:absolute before:content-[''] before:left-[7px] before:top-0 before:bottom-0 before:w-px before:bg-gray-200 ml-1.5 pl-5 gap-3">
                <div className="flex items-center gap-3 relative group">
                  <span className="absolute -left-5 top-[9px] w-4 h-px bg-gray-200"></span>
                  <FileCode2 className="w-3.5 h-3.5 text-gray-400" />
                  <span className="group-hover:text-gray-900 transition-colors font-medium">layout.tsx</span>
                  <span className="text-[9px] border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 ml-auto flex items-center gap-1 bg-white shadow-sm">
                    Root
                  </span>
                </div>

                <div className="flex flex-col relative gap-3">
                  <div 
                    className="flex items-center gap-2 relative cursor-pointer group"
                    onClick={() => toggleFolder('dashboard')}
                  >
                    <span className="absolute -left-5 top-[9px] w-4 h-px bg-gray-200"></span>
                    {openFolders.dashboard ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                    <Folder className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    <span className="font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">(dashboard)</span>
                  </div>
                  
                  {openFolders.dashboard && (
                    <div className="flex flex-col relative before:absolute before:content-[''] before:left-[11px] before:top-0 before:bottom-3 before:w-px before:bg-gray-200 ml-1.5 pl-6 gap-3">
                      <div className="flex items-center gap-3 relative group">
                        <span className="absolute -left-6 top-[9px] w-5 h-px bg-gray-200"></span>
                        <FileCode2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="group-hover:text-gray-900 transition-colors font-medium">page.tsx</span>
                        <span className="text-[9px] border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-auto flex items-center gap-1 bg-white shadow-sm">
                          /dashboard
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-3 relative">
                        <div 
                          className="flex items-center gap-2 relative cursor-pointer group"
                          onClick={() => toggleFolder('settings')}
                        >
                          <span className="absolute -left-6 top-[9px] w-5 h-px bg-gray-200"></span>
                          {openFolders.settings ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                          <Folder className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                          <span className="font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">settings</span>
                        </div>
                        
                        {openFolders.settings && (
                          <div className="flex flex-col relative ml-2.5 pl-5 gap-3">
                            <div className="flex items-center gap-3 relative group">
                              <span className="absolute -left-[20px] -top-[12px] w-px h-5 bg-gray-200"></span>
                              <span className="absolute -left-[20px] top-[9px] w-4 h-px bg-gray-200"></span>
                              <FileCode2 className="w-3.5 h-3.5 text-gray-400" />
                              <span className="group-hover:text-gray-900 transition-colors font-medium">page.tsx</span>
                              <span className="text-[9px] border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-auto flex items-center gap-1 bg-white shadow-sm">
                                /dashboard/settings
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col relative gap-3">
                  <div 
                    className="flex items-center gap-2 relative cursor-pointer group"
                    onClick={() => toggleFolder('auth')}
                  >
                    <span className="absolute -left-5 top-[9px] w-4 h-px bg-gray-200"></span>
                    {openFolders.auth ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                    <Folder className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    <span className="font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">auth</span>
                  </div>
                  
                  {openFolders.auth && (
                    <div className="flex flex-col relative ml-1.5 pl-6 gap-3">
                      <div className="flex items-center gap-3 relative group">
                        <span className="absolute -left-[19px] -top-[12px] w-px h-5 bg-gray-200"></span>
                        <span className="absolute -left-[19px] top-[9px] w-4 h-px bg-gray-200"></span>
                        <FileCode2 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="group-hover:text-gray-900 transition-colors font-medium">login/page.tsx</span>
                        <span className="text-[9px] border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded ml-auto flex items-center gap-1 bg-white shadow-sm">
                          /auth/login
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Top-Right: Design Tokens & History */}
          <div className="flex flex-col bg-[#FAFAFA] border border-gray-200 rounded-[6px] overflow-hidden shadow-sm">
            {/* Tokens Section */}
            <div className="border-b border-gray-200 px-4 py-3 bg-white">
              <h3 className="text-xs font-semibold flex items-center gap-2 text-gray-800">
                <Palette className="w-3.5 h-3.5 text-gray-500" />
                Design Tokens
              </h3>
            </div>
            
            <div className="p-4 flex flex-col gap-5 border-b border-gray-200 bg-[#FAFAFA]">
              <div>
                <h4 className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Colors</h4>
                <div className="grid grid-cols-4 gap-3">
                  <ColorSwatch name="Background" hex="#FAFAFA" bgClass="bg-[#FAFAFA]" />
                  <ColorSwatch name="Surface" hex="#FFFFFF" bgClass="bg-white" borderClass="border-gray-200" />
                  <ColorSwatch name="Primary Text" hex="#111827" bgClass="bg-gray-900" borderClass="border-gray-900" />
                  <ColorSwatch name="Border" hex="#E5E7EB" bgClass="bg-gray-200" borderClass="border-gray-300" />
                </div>
              </div>

              <div>
                <h4 className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Typography</h4>
                <div className="border border-gray-200 rounded-[4px] overflow-hidden shadow-sm">
                  <table className="w-full text-left text-[10px]">
                    <thead className="bg-white border-b border-gray-200 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Style</th>
                        <th className="px-3 py-2 font-semibold">Size</th>
                        <th className="px-3 py-2 font-semibold">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700 bg-[#FAFAFA]">
                      <tr>
                        <td className="px-3 py-2 font-bold text-gray-900">H1</td>
                        <td className="px-3 py-2 font-mono text-[9px] text-gray-500">2rem</td>
                        <td className="px-3 py-2">700</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-gray-800 font-medium">Body</td>
                        <td className="px-3 py-2 font-mono text-[9px] text-gray-500">0.875rem</td>
                        <td className="px-3 py-2">400</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-gray-500">Caption</td>
                        <td className="px-3 py-2 font-mono text-[9px] text-gray-400">0.75rem</td>
                        <td className="px-3 py-2">400</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* History Section */}
            <div className="px-4 py-3 bg-white border-b border-gray-200">
              <h3 className="text-xs font-semibold flex items-center gap-2 text-gray-800">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                UI Change History
              </h3>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3 overflow-y-auto bg-[#FAFAFA]">
              {gitHistory.map((item) => (
                <div key={item.id} className="flex gap-3 items-start group cursor-pointer">
                  <div className="mt-0.5">
                    {item.type === 'pr' ? (
                      <GitPullRequest className="w-3.5 h-3.5 text-blue-500 opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                      <GitCommit className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] text-gray-700 group-hover:text-gray-900 transition-colors leading-tight font-medium">
                      {item.text}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Bottom: Component Blueprint Catalog */}
        <div className="flex flex-col bg-[#FAFAFA] border border-gray-200 rounded-[6px] overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
            <h3 className="text-xs font-semibold flex items-center gap-2 text-gray-800">
              <Box className="w-3.5 h-3.5 text-gray-500" />
              Blueprint Catalog
            </h3>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search components..." 
                  className="pl-6 pr-2 py-1 text-[10px] bg-white border border-gray-200 rounded-[4px] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-40 transition-all text-gray-900 placeholder-gray-400 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-px bg-gray-200">
            {filteredComponents.length > 0 ? (
              filteredComponents.map((comp) => (
                <div key={comp.id} className="flex flex-col bg-[#FAFAFA] group/card">
                  <div
                    id={`component-card-${comp.id}`}
                    className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleComponentClick(comp.name)}
                    title={`${comp.name} Figma/Storybook 연동 보기`}
                  >
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">{comp.name}</span>
                    <span className="text-[9px] text-gray-400 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" />
                      Figma / Storybook 보기
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row h-full">
                    {/* Preview */}
                    <div className="w-full sm:w-1/2 p-6 flex items-center justify-center min-h-[140px] border-b sm:border-b-0 sm:border-r border-gray-200 bg-[#FAFAFA]">
                      {comp.ui}
                    </div>
                    {/* Code */}
                    <div className="w-full sm:w-1/2 p-4 bg-gray-50 border-t border-gray-100 sm:border-t-0 text-[10px] font-mono text-gray-600 overflow-x-auto min-h-[140px] flex items-center relative group">
                      <button 
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 px-1.5 py-0.5 rounded-[4px] text-[9px] opacity-0 group-hover:opacity-100 transition-all border border-gray-200 shadow-sm"
                        onClick={() => navigator.clipboard.writeText(comp.code)}
                      >
                        Copy
                      </button>
                      <pre className="leading-relaxed"><code>
                        <span className="text-blue-600 font-semibold">interface</span> <span className="text-gray-900 font-bold">{comp.name}Props</span> {'{\n'}
                        {comp.code.split('\n').slice(1, -1).map((line, i) => (
                          <div key={i}>
                            <span className="text-gray-500">{line.split(':')[0]}</span>:
                            <span className="text-gray-700">{line.split(':')[1]}</span>
                          </div>
                        ))}
                        {'}'}
                      </code></pre>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-10 text-center text-gray-500 text-[11px] flex flex-col items-center bg-[#FAFAFA]">
                <Search className="w-6 h-6 text-gray-300 mb-2" />
                No components found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Component Detail Drawer */}
      <ComponentDrawer
        componentName={selectedComponent}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
