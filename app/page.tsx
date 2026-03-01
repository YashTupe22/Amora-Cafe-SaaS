'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Zap, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';

export default function LoginPage() {
  const router = useRouter();
  const { ready, currentUser, login } = useAppStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (currentUser) router.replace('/dashboard');
  }, [ready, currentUser, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const res = await login(email, password);
    if (!res.ok) {
      setLoading(false);
      const msg = res.error ?? 'Login failed.';
      setError(
        msg.toLowerCase().includes('failed to fetch')
          ? 'Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL/KEY, disable VPN/adblock, and retry.'
          : msg
      );
    }
    // On success: keep spinner alive — onAuthStateChange sets currentUser,
    // triggering the useEffect below which redirects to /dashboard.
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #0d1b33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '20px' }}>
      {/* Glow blobs */}
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,88,12,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 420, padding: '40px 36px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(249,115,22,0.5)' }}>
            <Zap size={26} color="white" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Synplix</h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Sign in to your dashboard</p>
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <Mail size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input id="login-email" className="dark-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px 14px 12px 40px', fontSize: 14 }} />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input id="login-password" className="dark-input" type={showPw ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px 42px 12px 40px', fontSize: 14 }} />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {error && <p style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}

          <button id="login-submit" type="submit" className="glow-btn" style={{ padding: '13px 24px', fontSize: 15, marginTop: 4 }} disabled={loading}>
            <span>{loading ? 'Signing in…' : 'Sign In'}</span>
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 20 }}>
          New here?{' '}
          <Link href="/signup" style={{ color: '#fb923c', fontWeight: 700 }}>Create an account</Link>
        </p>
      </div>
    </div>
  );
}
