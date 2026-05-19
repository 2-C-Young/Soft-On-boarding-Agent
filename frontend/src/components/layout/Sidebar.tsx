import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Blocks, 
  Database, 
  Layout, 
  Workflow, 
  MessageSquare, 
  Settings, 
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navigation = [
  { name: 'Functional', href: '/functional', icon: Blocks },
  { name: 'Data', href: '/data', icon: Database },
  { name: 'Interface', href: '/interface', icon: Layout },
  { name: 'Process & Flow', href: '/process-flow', icon: Workflow },
];

export function Sidebar() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col w-64 h-screen bg-gray-50 border-r border-gray-200">
      {/* Profile Section */}
      <div className="p-6">
        <div className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
              <img 
                src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">김민수</h2>
              <p className="text-xs text-gray-500">Frontend Developer</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto">
        <div>
          <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            4-WAY VIEW
          </h3>
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <ul className="space-y-1">
            <li>
              <NavLink
                to="/qa"
                className={({ isActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-gray-200 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <MessageSquare className="w-4 h-4 mr-3 flex-shrink-0" />
                Q&A
              </NavLink>
            </li>
          </ul>
        </div>
      </nav>

      {/* Bottom Settings & Logout */}
      <div className="p-4 border-t border-gray-200 flex flex-col space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-gray-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          <Settings className="w-4 h-4 mr-3 flex-shrink-0" />
          Settings
        </NavLink>
        
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors text-left"
        >
          <LogOut className="w-4 h-4 mr-3 flex-shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );
}
