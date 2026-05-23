import { useState, useEffect } from 'react';
import { 
  Folder, FileCode2, Palette, Box, Search,
  ChevronDown, ChevronRight, BookOpen
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { interfaceApi } from '../services/interfaceApi';
import type { InterfaceViewDto } from '../services/interfaceApi';

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
const ColorSwatch = ({ name, hex, borderClass = 'border-gray-200' }: { name: string, hex: string, borderClass?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(hex);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = hex;
      document.body.appendChild(textArea);
      textArea.select();
      try { document.execCommand('copy'); } catch (err) {}
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-1.5 cursor-pointer group" onClick={handleCopy}>
      <div className={`h-8 w-full rounded-[4px] border ${borderClass} relative flex items-center justify-center transition-colors hover:border-gray-300`} style={{ backgroundColor: hex }}>
        {copied && <span className="absolute text-[9px] bg-gray-900 text-white px-1.5 py-0.5 rounded shadow">Copied</span>}
      </div>
      <div className="text-[10px] font-mono text-gray-500 flex flex-col leading-tight">
        <span className="text-gray-700 font-medium">{name}</span> 
        <span>{hex}</span>
      </div>
    </div>
  );
};

const getFigmaEmbedUrl = (url: string) => {
  if (!url || !url.startsWith('http')) return '';
  if (url.includes('figma.com/embed')) return url;
  return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
};

export function InterfaceView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [componentsData, setComponentsData] = useState<InterfaceViewDto[]>([]);
  const [activeTab, setActiveTab] = useState<'code' | 'figma' | 'storybook'>('code');
  const [figmaUrl, setFigmaUrl] = useState('');
  const [storybookUrl, setStorybookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.spaceId) {
      setIsLoading(true);
      interfaceApi.getInterfaceView(user.spaceId).catch(err => { console.error("Interface Error:", err); return []; })
      .then((interfaceData) => {
        setComponentsData(interfaceData || []);
      })
      .finally(() => setIsLoading(false));
    }
  }, [user?.spaceId]);

  const toggleFolder = (folder: string) => {
    setOpenFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  // We use the fetched commitHistory from DB instead of hardcoded data.
  // If empty, show a fallback message in the UI later.

  // Map componentsData (from DB) into a tree structure for Screen-Code Mapping
  // Assuming filePath is like "src/components/Button.tsx"
  const fileTree: Record<string, any> = {};
  componentsData.forEach(comp => {
    const parts = (comp.filePath || 'Unknown').split('/');
    let current = fileTree;
    parts.forEach((part, index) => {
      if (!current[part]) {
        current[part] = index === parts.length - 1 ? { _isFile: true, comp } : {};
      }
      current = current[part];
    });
  });

  const renderTree = (node: any, path: string = '', level: number = 0) => {
    return Object.entries(node).map(([key, value]: [string, any]) => {
      if (key === '_isFile') return null;
      
      const currentPath = path ? `${path}/${key}` : key;
      const isFile = value._isFile;

      if (isFile) {
        return (
          <div key={currentPath} className="flex items-center gap-3 relative group" style={{ marginLeft: `${level * 12}px` }}>
            <span className="absolute -left-5 top-[9px] w-4 h-px bg-gray-200"></span>
            <FileCode2 className="w-3.5 h-3.5 text-gray-400" />
            <span className="group-hover:text-gray-900 transition-colors font-medium">{key}</span>
            <span className="text-[9px] border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 ml-auto flex items-center gap-1 bg-white shadow-sm">
              {value.comp.elementType}
            </span>
          </div>
        );
      }

      return (
        <div key={currentPath} className="flex flex-col relative gap-3" style={{ marginLeft: level > 0 ? `${level * 12}px` : '0px' }}>
          <div 
            className="flex items-center gap-2 relative cursor-pointer group"
            onClick={() => toggleFolder(currentPath)}
          >
            {level > 0 && <span className="absolute -left-5 top-[9px] w-4 h-px bg-gray-200"></span>}
            {openFolders[currentPath] !== false ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
            <Folder className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            <span className="font-semibold text-gray-600 group-hover:text-gray-900 transition-colors">{key}</span>
          </div>
          
          {openFolders[currentPath] !== false && (
            <div className="flex flex-col relative before:absolute before:content-[''] before:left-[11px] before:top-0 before:bottom-3 before:w-px before:bg-gray-200 ml-1.5 pl-6 gap-3">
              {renderTree(value, currentPath, 0)}
            </div>
          )}
        </div>
      );
    });
  };

  const filteredComponents = componentsData.filter(comp => 
    comp.elementType !== 'DESIGN_TOKEN' && (comp.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Parse dynamic design tokens if they exist in the DB
  const designTokenComponents = componentsData.filter(comp => comp.elementType === 'DESIGN_TOKEN');

  // Helpers to parse token data from extraInfo strings
  const getParsedSwatches = () => {
    const swatchToken = designTokenComponents.find(c => (c.name || '').toLowerCase().includes('color') || (c.extraInfo || '').includes('#'));
    if (swatchToken && swatchToken.extraInfo) {
      // Parse "Background: #FAFAFA, Surface: #FFFFFF" format
      return swatchToken.extraInfo.split(',').map(s => {
        const parts = s.split(':');
        if (parts.length === 2) {
          const name = parts[0].trim();
          const hex = parts[1].trim();
          return { name, hex };
        }
        return null;
      }).filter(Boolean) as { name: string, hex: string }[];
    }
    return [];
  };

  const getParsedTypography = () => {
    const typoToken = designTokenComponents.find(c => (c.name || '').toLowerCase().includes('typograph'));
    if (typoToken && typoToken.extraInfo) {
      // Parse "H1: 2rem (700), Body: 0.875rem (400)" format
      return typoToken.extraInfo.split(',').map(s => {
        const parts = s.split(':');
        if (parts.length === 2) {
          const style = parts[0].trim();
          const rest = parts[1].trim();
          const match = rest.match(/(.+?)\s*\((\d+)\)/);
          if (match) {
            return { style, size: match[1].trim(), weight: match[2].trim() };
          }
          return { style, size: rest, weight: "400" };
        }
        return null;
      }).filter(Boolean) as { style: string, size: string, weight: string }[];
    }
    return [];
  };

  const swatches = getParsedSwatches();
  const typography = getParsedTypography();

  return (
    <div className="min-h-full w-full bg-[#FAFAFA] text-gray-900 p-6 md:p-10 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* Top Section: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 1. Top-Left: Screen-Code Mapping */}
          <div className="flex flex-col bg-[#FAFAFA] border border-gray-200 rounded-[6px] overflow-hidden shadow-sm h-full max-h-[400px]">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
              <h3 className="text-xs font-semibold flex items-center gap-2 text-gray-800">
                <Folder className="w-3.5 h-3.5 text-gray-500" />
                Screen-Code Mapping (DB)
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-[10px] rounded-[4px] transition-colors shadow-sm border ${activeTab === 'code' ? 'bg-white border-gray-300 text-gray-900' : 'bg-[#FAFAFA] border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}>
                  <Folder className="w-3 h-3 text-gray-500" />
                  Code
                </button>
                <button 
                  onClick={() => setActiveTab('figma')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-[10px] rounded-[4px] transition-colors shadow-sm border ${activeTab === 'figma' ? 'bg-white border-gray-300 text-gray-900' : 'bg-[#FAFAFA] border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}>
                  <FigmaIcon className="w-3 h-3 text-pink-500" />
                  Figma
                </button>
                <button 
                  onClick={() => setActiveTab('storybook')}
                  className={`flex items-center gap-1.5 px-2 py-1 text-[10px] rounded-[4px] transition-colors shadow-sm border ${activeTab === 'storybook' ? 'bg-white border-gray-300 text-gray-900' : 'bg-[#FAFAFA] border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300'}`}>
                  <BookOpen className="w-3 h-3 text-blue-500" />
                  Storybook
                </button>
              </div>
            </div>
            
            <div className="p-5 flex-1 text-[11px] text-gray-500 font-mono flex flex-col gap-4 overflow-y-auto bg-[#FAFAFA]">
              {activeTab === 'code' && (
                isLoading ? (
                  <div className="text-center py-4">Loading data...</div>
                ) : componentsData.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {renderTree(fileTree)}
                  </div>
                ) : (
                  <div className="text-center py-4">No file structure available.</div>
                )
              )}
              {activeTab === 'figma' && (
                <div className="flex flex-col gap-3 h-full">
                  <input 
                    type="text" 
                    placeholder="Paste Figma Embed URL here..."
                    className="w-full px-3 py-2 text-[11px] bg-white border border-gray-200 rounded-[4px] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans shadow-sm"
                    value={figmaUrl}
                    onChange={(e) => setFigmaUrl(e.target.value)}
                  />
                  {figmaUrl ? (
                    <iframe className="w-full h-[300px] border border-gray-200 rounded-[4px] bg-white" src={getFigmaEmbedUrl(figmaUrl)} allowFullScreen></iframe>
                  ) : (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-gray-300 rounded-[4px] bg-gray-50 text-gray-400 min-h-[250px]">
                      No Figma URL provided.
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'storybook' && (
                <div className="flex flex-col gap-3 h-full">
                  <input 
                    type="text" 
                    placeholder="Paste Storybook URL here..."
                    className="w-full px-3 py-2 text-[11px] bg-white border border-gray-200 rounded-[4px] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-sans shadow-sm"
                    value={storybookUrl}
                    onChange={(e) => setStorybookUrl(e.target.value)}
                  />
                  {storybookUrl ? (
                    <iframe className="w-full h-[300px] border border-gray-200 rounded-[4px] bg-white" src={storybookUrl} title="Storybook"></iframe>
                  ) : (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-gray-300 rounded-[4px] bg-gray-50 text-gray-400 min-h-[250px]">
                      No Storybook URL provided.
                    </div>
                  )}
                </div>
              )}
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
            
            <div className="p-4 flex flex-col gap-5 bg-[#FAFAFA] flex-1">
              <div>
                <h4 className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Colors</h4>
                {swatches.length > 0 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {swatches.map((swatch, idx) => {
                      return (
                        <ColorSwatch 
                          key={idx} 
                          name={swatch.name} 
                          hex={swatch.hex} 
                          borderClass="border-gray-200" 
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-400 bg-white border border-dashed border-gray-200 p-3 rounded text-center">
                    No color tokens found in DB.
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-2.5">Typography</h4>
                {typography.length > 0 ? (
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
                        {typography.map((typo, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-gray-800">{typo.style}</td>
                            <td className="px-3 py-2 font-mono text-[9px] text-gray-500">{typo.size}</td>
                            <td className="px-3 py-2">{typo.weight}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-400 bg-white border border-dashed border-gray-200 p-3 rounded text-center">
                    No typography tokens found in DB.
                  </div>
                )}
              </div>
            </div>


          </div>
        </div>

        {/* 3. Bottom: Component Blueprint Catalog */}
        <div className="flex flex-col bg-[#FAFAFA] border border-gray-200 rounded-[6px] overflow-hidden shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white">
            <h3 className="text-xs font-semibold flex items-center gap-2 text-gray-800">
              <Box className="w-3.5 h-3.5 text-gray-500" />
              Blueprint Catalog (DB)
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
            {isLoading ? (
               <div className="col-span-full p-10 text-center text-gray-500 text-[11px] flex flex-col items-center bg-[#FAFAFA]">
                 Loading...
               </div>
            ) : filteredComponents.length > 0 ? (
              filteredComponents.map((comp) => (
                <div key={comp.id} className="flex flex-col bg-[#FAFAFA]">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
                    <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wide">{comp.name}</span>
                    <span className="text-[9px] text-gray-500">{comp.elementType}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row h-full">
                    {/* Description/Preview (Fallback since no true UI rendering) */}
                    <div className="w-full sm:w-1/2 p-6 flex flex-col min-h-[140px] border-b sm:border-b-0 sm:border-r border-gray-200 bg-white">
                       <h4 className="font-semibold text-xs text-gray-800 mb-2">Description</h4>
                       <p className="text-[11px] text-gray-600 whitespace-pre-wrap flex-1">{comp.description || 'No description available.'}</p>
                    </div>
                    {/* Code (extraInfo) */}
                    <div className="w-full sm:w-1/2 p-4 bg-gray-50 border-t border-gray-100 sm:border-t-0 text-[10px] font-mono text-gray-600 overflow-x-auto min-h-[140px] flex items-start relative group">
                      <button 
                        className="absolute top-2 right-2 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-100 px-1.5 py-0.5 rounded-[4px] text-[9px] opacity-0 group-hover:opacity-100 transition-all border border-gray-200 shadow-sm"
                        onClick={() => {
                          const text = comp.extraInfo || '';
                          if (navigator.clipboard && window.isSecureContext) {
                            navigator.clipboard.writeText(text);
                          } else {
                            const textArea = document.createElement("textarea");
                            textArea.value = text;
                            document.body.appendChild(textArea);
                            textArea.select();
                            try { document.execCommand('copy'); } catch (err) {}
                            document.body.removeChild(textArea);
                          }
                        }}
                      >
                        Copy
                      </button>
                      <pre className="leading-relaxed whitespace-pre-wrap break-all w-full h-full overflow-y-auto max-h-[250px]">
                        <code>
                          {comp.extraInfo ? comp.extraInfo : 'No interface/code defined.'}
                        </code>
                      </pre>
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
    </div>
  );
}
