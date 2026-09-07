import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BarChart3, 
  LogOut,
  Leaf
} from 'lucide-react';
import { logout } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: Calendar, label: 'Appointments', path: '/appointments' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
];

const Sidebar: React.FC = () => {
  const { user } = useAuth();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-white border-r border-zinc-200 z-50 transition-all duration-300",
      "w-0 md:w-64 overflow-hidden"
    )}>
      <div className="flex flex-col h-full w-64 p-4">
        {/* Logo */}
        <div className="flex items-center gap-2 px-2 py-4 mb-6">
          <div className="bg-primary p-1.5 rounded-lg">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-lg text-zinc-900 leading-tight">
            Herbal<br/><span className="text-primary">Manager</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                "hover:bg-zinc-100 text-zinc-600 font-medium",
                isActive && "bg-accent text-primary shadow-sm"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User & Logout */}
        <div className="pt-4 border-t border-zinc-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Account</p>
            <p className="text-sm font-medium text-zinc-700 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-zinc-600 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
