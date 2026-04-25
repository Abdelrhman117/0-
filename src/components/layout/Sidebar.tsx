import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Truck,
  Flame,
  Users,
  ShoppingCart,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Coffee,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/',          label: 'Dashboard',  icon: LayoutDashboard },
  { to: '/inventory', label: 'Inventory',  icon: Package },
  { to: '/supply',    label: 'Supply',     icon: Truck },
  { to: '/roasting',  label: 'Roasting',   icon: Flame },
  { to: '/clients',   label: 'Clients',    icon: Users },
  { to: '/orders',    label: 'Orders',     icon: ShoppingCart },
  { to: '/invoices',  label: 'Invoices',   icon: FileText },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { signOut } = useAuth();
  const navigate    = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  return (
    <aside
      className={`relative flex flex-col bg-coffee-950 border-r border-surface-border transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-border">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-coffee-300 flex items-center justify-center">
          <Coffee size={16} className="text-coffee-950" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-coffee-300 font-bold text-lg leading-tight">0%</p>
            <p className="text-coffee-600 text-[10px] font-medium tracking-widest uppercase">
              Coffee
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 mb-0.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-coffee-300/15 text-coffee-300 border border-coffee-300/20'
                  : 'text-coffee-600 hover:bg-surface-hover hover:text-coffee-200'
              }`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-surface-border p-2 space-y-0.5">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-coffee-600 hover:bg-red-900/20 hover:text-red-400 transition-all"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-surface-border border border-coffee-800 text-coffee-400 flex items-center justify-center hover:bg-coffee-800 transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
