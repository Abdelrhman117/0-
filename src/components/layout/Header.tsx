import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const routeTitles: Record<string, string> = {
  '/':          'Dashboard',
  '/inventory': 'Inventory',
  '/supply':    'Supply & Shipments',
  '/roasting':  'Roasting Batches',
  '/clients':   'Client Accounts',
  '/orders':    'Sales & Orders',
  '/invoices':  'Invoices',
};

export default function Header() {
  const { pathname } = useLocation();
  const { user }     = useAuth();
  const title        = routeTitles[pathname] ?? 'Dashboard';

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <header className="h-14 flex items-center justify-between px-6 bg-coffee-950/80 backdrop-blur border-b border-surface-border flex-shrink-0">
      <h1 className="text-coffee-100 font-semibold text-lg">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-600" />
          <input
            placeholder="Quick search…"
            className="pl-9 pr-4 py-1.5 bg-surface-card border border-surface-border rounded-lg text-sm text-coffee-200 placeholder-coffee-700 focus:outline-none focus:border-coffee-500 w-52"
          />
        </div>

        <button className="relative p-2 rounded-lg text-coffee-600 hover:bg-surface-hover hover:text-coffee-300 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-coffee-300" />
        </button>

        <div className="w-8 h-8 rounded-full bg-coffee-300/20 border border-coffee-300/30 flex items-center justify-center">
          <span className="text-coffee-300 text-xs font-bold">{initials}</span>
        </div>
      </div>
    </header>
  );
}
