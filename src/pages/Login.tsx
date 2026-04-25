import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const { signIn }              = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        : 'فشل تسجيل الدخول، يرجى المحاولة مجدداً';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-coffee-950 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-coffee-300/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-coffee-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-coffee-300/10 border border-coffee-300/20 flex items-center justify-center mb-4">
              <Coffee size={28} className="text-coffee-300" />
            </div>
            <h1 className="text-coffee-100 text-2xl font-bold tracking-tight">
              0<span className="text-coffee-300">%</span> قهوة
            </h1>
            <p className="text-coffee-500 text-sm mt-1">نظام إدارة القهوة</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-coffee-400 uppercase tracking-wider">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@zeropercent.com"
                required
                autoComplete="email"
                dir="ltr"
                className="w-full px-4 py-2.5 bg-coffee-950 border border-surface-border rounded-lg text-sm text-coffee-100 placeholder-coffee-700 focus:outline-none focus:border-coffee-500 focus:ring-1 focus:ring-coffee-500/30 transition-colors text-left"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-coffee-400 uppercase tracking-wider">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  dir="ltr"
                  className="w-full px-4 py-2.5 pl-10 bg-coffee-950 border border-surface-border rounded-lg text-sm text-coffee-100 placeholder-coffee-700 focus:outline-none focus:border-coffee-500 focus:ring-1 focus:ring-coffee-500/30 transition-colors text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-600 hover:text-coffee-300 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-coffee-300 text-coffee-950 font-semibold rounded-lg hover:bg-coffee-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  جاري تسجيل الدخول…
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          <p className="text-center text-coffee-700 text-xs mt-6">
            للمستخدمين المصرح لهم فقط
          </p>
        </div>

        <p className="text-center text-coffee-800 text-xs mt-4">
          © 2024 0% قهوة — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
