import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { firebaseConfigured } from './firebase';
import './index.css';

// ── Guard: show setup screen if env vars are missing ──────────────────────────
if (!firebaseConfigured) {
  const vars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <div style={{
      minHeight: '100vh', background: '#130D05',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        maxWidth: 520, width: '100%', background: '#1C1109',
        border: '1px solid #3D2510', borderRadius: 16, padding: 32,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, background: '#D4A843', borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 24, fontWeight: 700, color: '#130D05',
          }}>0%</div>
          <h1 style={{ color: '#F0E6D3', fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            Firebase Setup Required
          </h1>
          <p style={{ color: '#9C6A30', fontSize: 14, margin: 0 }}>
            Add these Environment Variables in your Vercel project settings
          </p>
        </div>

        <div style={{ background: '#130D05', borderRadius: 10, padding: 20, marginBottom: 20 }}>
          {vars.map((v) => (
            <div key={v} style={{ marginBottom: 10 }}>
              <span style={{
                fontFamily: 'monospace', fontSize: 12, background: '#231709',
                color: '#D4A843', padding: '3px 8px', borderRadius: 6,
                border: '1px solid #3D2510', display: 'inline-block',
              }}>{v}</span>
            </div>
          ))}
        </div>

        <p style={{ color: '#6B4C14', fontSize: 12, textAlign: 'center', margin: 0 }}>
          Vercel → Project Settings → Environment Variables → Add each variable above
        </p>
      </div>
    </div>
  );
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
