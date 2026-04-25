import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Layout    from './components/layout/Layout';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Supply    from './pages/Supply';
import Roasting  from './pages/Roasting';
import Clients   from './pages/Clients';
import Orders    from './pages/Orders';
import Invoices  from './pages/Invoices';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-coffee-300/10 border border-coffee-300/20 flex items-center justify-center animate-pulse">
            <span className="text-coffee-300 font-bold text-lg">0%</span>
          </div>
          <p className="text-coffee-600 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index       element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="supply"    element={<Supply />} />
        <Route path="roasting"  element={<Roasting />} />
        <Route path="clients"   element={<Clients />} />
        <Route path="orders"    element={<Orders />} />
        <Route path="invoices"  element={<Invoices />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#251609',
              color:      '#F0E6D3',
              border:     '1px solid #3D2510',
              fontSize:   '13px',
            },
            success: {
              iconTheme: { primary: '#D4A843', secondary: '#251609' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#251609' },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}
