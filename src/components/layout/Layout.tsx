import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header  from './Header';

export default function Layout() {
  return (
    <div className="flex h-screen bg-coffee-950 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-coffee-950 via-coffee-950 to-coffee-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
