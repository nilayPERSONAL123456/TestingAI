import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, FileCheck, ListTodo, FileText, LogOut, Menu, X, Building2, Settings } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: UserPlus },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/compliance', label: 'Compliance', icon: FileCheck },
  { path: '/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200`}>
        <div className="flex items-center justify-between p-4 border-b">
          {sidebarOpen && <div className="flex items-center gap-2"><Building2 className="w-7 h-7 text-primary-600" /><span className="font-bold text-lg">PraxisCA</span></div>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-gray-100">{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link key={path} to={path} className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${location.pathname === path ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Icon className="w-5 h-5 flex-shrink-0" />{sidebarOpen && <span>{label}</span>}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t">
          {sidebarOpen && <div className="mb-2 text-sm"><p className="font-medium text-gray-800">{user.full_name}</p><p className="text-xs text-gray-500">{user.role}</p></div>}
          <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); }} className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600">
            <LogOut className="w-4 h-4" />{sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto"><div className="p-6">{children}</div></main>
    </div>
  );
}
