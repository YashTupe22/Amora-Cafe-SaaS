'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/appStore';
import { isValidWaiterCode } from '@/lib/waiterUtils';
import { LogOut, Lock } from 'lucide-react';

export default function WaiterLoginPage() {
  const router = useRouter();
  const { data, profile } = useAppStore();
  const [waiterCode, setWaiterCode] = useState('');
  const [error, setError] = useState('');
  const [showExitModal, setShowExitModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [exitError, setExitError] = useState('');

  // Prevent back navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.pathname);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F5, Ctrl+R, Ctrl+W, Alt+F4
      if (
        e.key === 'F5' ||
        (e.ctrlKey && e.key === 'r') ||
        (e.ctrlKey && e.key === 'w') ||
        (e.altKey && e.key === 'F4')
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = waiterCode.toUpperCase().trim();

    if (!isValidWaiterCode(code)) {
      setError('Invalid code format. Use format: A12');
      return;
    }

    // Find employee with matching waiter code
    const waiter = data.employees.find(emp => emp.waiterCode === code);

    if (!waiter) {
      setError('Waiter code not found. Please contact admin.');
      return;
    }

    // Store waiter session in sessionStorage
    sessionStorage.setItem('waiter-session', JSON.stringify({
      id: waiter.id,
      name: waiter.name,
      code: waiter.waiterCode,
      loginTime: new Date().toISOString(),
    }));

    // Redirect to waiter order page
    router.push('/waiter');
  };

  const handleExit = async () => {
    setExitError('');

    if (!adminPassword.trim()) {
      setExitError('Password required');
      return;
    }

    // Check against stored admin password in profile
    const storedAdminPassword = profile?.adminPassword;
    
    if (storedAdminPassword && adminPassword === storedAdminPassword) {
      sessionStorage.removeItem('waiter-session');
      setShowExitModal(false);
      setAdminPassword('');
      router.push('/dashboard');
    } else if (!storedAdminPassword && adminPassword === 'admin123') {
      // Fallback: If admin password not set, use default for first time
      sessionStorage.removeItem('waiter-session');
      setShowExitModal(false);
      setAdminPassword('');
      router.push('/dashboard');
    } else {
      setExitError('Incorrect admin password');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: '24px',
      position: 'relative',
    }}>
      {/* Exit Button (subtle, bottom-right corner) */}
      <button
        onClick={() => setShowExitModal(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          padding: '8px 12px',
          borderRadius: 8,
          background: 'rgba(71,85,105,0.3)',
          border: '1px solid rgba(71,85,105,0.4)',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(71,85,105,0.5)';
          e.currentTarget.style.color = '#94a3b8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(71,85,105,0.3)';
          e.currentTarget.style.color = '#64748b';
        }}
      >
        <Lock size={12} />
        Exit
      </button>

      {/* Login Card */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        padding: 48,
        borderRadius: 24,
        background: 'rgba(30,41,59,0.8)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(148,163,184,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      }}>
        {/* Logo/Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20,
            boxShadow: '0 10px 30px rgba(249,115,22,0.4)',
          }}>
            <LogOut size={36} color="white" />
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 800,
            color: 'white',
            marginBottom: 8,
          }}>
            Waiter Login
          </h1>
          <p style={{
            fontSize: 14,
            color: '#94a3b8',
            lineHeight: 1.6,
          }}>
            {profile?.businessName || 'Amora Cafe'}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              color: '#cbd5e1',
              marginBottom: 8,
            }}>
              Enter Your Waiter Code
            </label>
            <input
              type="text"
              value={waiterCode}
              onChange={(e) => {
                setWaiterCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="e.g., A12"
              maxLength={3}
              autoFocus
              style={{
                width: '100%',
                padding: '16px 20px',
                fontSize: 20,
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius: 12,
                background: 'rgba(15,23,42,0.5)',
                border: error ? '2px solid #ef4444' : '2px solid rgba(148,163,184,0.2)',
                color: 'white',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                if (!error) e.currentTarget.style.borderColor = '#f97316';
              }}
              onBlur={(e) => {
                if (!error) e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)';
              }}
            />
            {error && (
              <p style={{
                marginTop: 8,
                fontSize: 13,
                color: '#ef4444',
                textAlign: 'center',
              }}>
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!waiterCode.trim()}
            style={{
              width: '100%',
              padding: '16px 24px',
              fontSize: 16,
              fontWeight: 700,
              borderRadius: 12,
              background: waiterCode.trim()
                ? 'linear-gradient(135deg, #f97316, #ea580c)'
                : 'rgba(71,85,105,0.3)',
              border: 'none',
              color: 'white',
              cursor: waiterCode.trim() ? 'pointer' : 'not-allowed',
              boxShadow: waiterCode.trim()
                ? '0 10px 30px rgba(249,115,22,0.4)'
                : 'none',
              transition: 'all 0.2s',
            }}
          >
            Login
          </button>
        </form>

        {/* Help Text */}
        <p style={{
          marginTop: 24,
          fontSize: 12,
          color: '#64748b',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          Don't have a code? Contact your manager or admin.
        </p>
      </div>

      {/* Exit Modal */}
      {showExitModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => {
            setShowExitModal(false);
            setAdminPassword('');
            setExitError('');
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 380,
              padding: 32,
              borderRadius: 16,
              background: 'rgba(30,41,59,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(148,163,184,0.2)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Lock size={24} color="#ef4444" />
            </div>

            <h2 style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'white',
              marginBottom: 8,
            }}>
              Admin Password Required
            </h2>
            <p style={{
              fontSize: 13,
              color: '#94a3b8',
              marginBottom: 20,
              lineHeight: 1.6,
            }}>
              Enter admin password to exit waiter mode.
            </p>

            <input
              type="password"
              value={adminPassword}
              onChange={(e) => {
                setAdminPassword(e.target.value);
                setExitError('');
              }}
              placeholder="Admin password"
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 14,
                borderRadius: 10,
                background: 'rgba(15,23,42,0.5)',
                border: exitError ? '1px solid #ef4444' : '1px solid rgba(148,163,184,0.2)',
                color: 'white',
                outline: 'none',
                marginBottom: 12,
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExit();
              }}
            />
            {exitError && (
              <p style={{
                marginBottom: 16,
                fontSize: 12,
                color: '#ef4444',
              }}>
                {exitError}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => {
                  setShowExitModal(false);
                  setAdminPassword('');
                  setExitError('');
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'rgba(71,85,105,0.3)',
                  border: '1px solid rgba(71,85,105,0.4)',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExit}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
                }}
              >
                Exit Waiter Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
