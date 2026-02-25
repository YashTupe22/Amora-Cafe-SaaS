'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, Zap } from 'lucide-react';
import { useAppStore } from '@/lib/appStore';

export default function SignupPage() {
  const router = useRouter();
  const { ready, currentUser, signup } = useAppStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ready) return;
    if (currentUser) router.replace('/dashboard');
  }, [ready, currentUser, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim()) { setError('Please fill in all fields.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const res = await signup(name, email, password);
    if (!res.ok) {
      setLoading(false);
      setError(res.error ?? 'Sign up failed.');
    }
    // On success: keep spinner alive — onAuthStateChange fires, profile loads
    // with onboardingComplete=false, AppLayout redirects to /onboarding.
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0f1e 0%, #0f172a 50%, #0d1b33 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', padding: '20px' }}>
      <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,88,12,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: 460, padding: '40px 36px', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 30 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(249,115,22,0.5)' }}>
            <Zap size={26} color="white" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.3px' }}>Create your Synplix account</h1>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Built for Indian small businesses</p>
          </div>
        </div>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <User size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input id="signup-name" className="dark-input" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} style={{ padding: '12px 14px 12px 40px', fontSize: 14 }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Mail size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input id="signup-email" className="dark-input" type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px 14px 12px 40px', fontSize: 14 }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input id="signup-password" className="dark-input" type={showPw ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px 42px 12px 40px', fontSize: 14 }} />
            <button type="button" onClick={() => setShowPw(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={15} color="#64748b" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input id="signup-confirm" className="dark-input" type={showPw ? 'text' : 'password'} placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} style={{ padding: '12px 14px 12px 40px', fontSize: 14 }} />
          </div>

          {error && <p style={{ fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</p>}

          <button id="signup-submit" type="submit" className="glow-btn" style={{ padding: '13px 24px', fontSize: 15, marginTop: 4 }} disabled={loading}>
            <span>{loading ? 'Creating account…' : 'Create Account'}</span>
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 16 }}>
          Already have an account?{' '}
          <Link href="/" style={{ color: '#fb923c', fontWeight: 700 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
