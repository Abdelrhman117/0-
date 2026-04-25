import React, { Component } from 'react';
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

// ── Error Boundary ─────────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const msg = (this.state.error as Error).message;
      return (
        <div style={{
          minHeight: '100vh', background: '#130D05',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{
            maxWidth: 480, width: '100%', background: '#1C1109',
            border: '1px solid #3D2510', borderRadius: 16, padding: 32, textAlign: 'center',
          }}>
            <div style={{
              width: 56, height: 56, background: '#D4A843', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 22, fontWeight: 700, color: '#130D05',
            }}>0%</div>
            <h2 style={{ color: '#F0E6D3', fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>
              App Error
            </h2>
            <p style={{ color: '#9C6A30', fontSize: 13, margin: '0 0 20px' }}>{msg}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 24px', background: '#D4A843', color: '#130D05',
                fontWeight: 700, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Protected route wrapper ────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#130D05',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <div style={{
          width: 48, height: 48, background: '#1C1109', border: '1px solid #3D2510',
          borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: '#D4A843',
        }}>0%</div>
        <p style={{ color: '#6B4C14', fontSize: 13, margin: 0 }}>Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// ── Route tree ────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index              element={<Dashboard />} />
        <Route path="inventory"  element={<Inventory />} />
        <Route path="supply"     element={<Supply />} />
        <Route path="roasting"   element={<Roasting />} />
        <Route path="clients"    element={<Clients />} />
        <Route path="orders"     element={<Orders />} />
        <Route path="invoices"   element={<Invoices />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#251609', color: '#F0E6D3', border: '1px solid #3D2510', fontSize: '13px' },
              success: { iconTheme: { primary: '#D4A843', secondary: '#251609' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: '#251609' } },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
