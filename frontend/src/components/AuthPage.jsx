import React, { useState } from 'react';
import { User, Lock, LogIn, UserPlus, AlertCircle, Sparkles } from 'lucide-react';

export default function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Please enter a username');
      return;
    }
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!password) {
      setError('Please enter a password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'An error occurred, please try again');
      }

      if (data.status === 'pending_approval' || data.requiresApproval) {
        setInfoMessage(data.message || 'Registration successful! Your account is pending administrator approval before you can log in.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        return;
      }

      if (data.token && data.user) {
        localStorage.setItem('chat_session_token', data.token);
        onAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '24px',
        background: 'var(--bg-main)',
        overflow: 'hidden',
      }}
    >
      {/* Background glow effects */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '650px',
          height: '450px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, rgba(6, 182, 212, 0.08) 50%, transparent 80%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Main Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-sidebar)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-lg), 0 0 35px rgba(37, 99, 235, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          animation: 'modalFade 0.25s ease-out',
        }}
      >
        {/* Branding header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '18px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
            }}
          >
            <Sparkles size={28} color="#ffffff" />
          </div>

          <h1
            style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--text-primary)',
              margin: '6px 0 0 0',
              letterSpacing: '-0.3px',
            }}
          >
            {mode === 'login' ? 'Sign in to AI Chat' : 'Create an Account'}
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            {mode === 'login'
              ? 'Sign in to access your chat sessions'
              : 'Quick sign up to start using your AI assistant'}
          </p>
        </div>

        {/* Tab switch */}
        <div
          style={{
            display: 'flex',
            background: 'var(--bg-input)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); setInfoMessage(''); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '14px',
              fontWeight: mode === 'login' ? '600' : '500',
              background: mode === 'login' ? 'var(--bg-hover)' : 'transparent',
              color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: mode === 'login' ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(''); setInfoMessage(''); }}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '14px',
              fontWeight: mode === 'register' ? '600' : '500',
              background: mode === 'register' ? 'var(--bg-hover)' : 'transparent',
              color: mode === 'register' ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: mode === 'register' ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Info/Success Notice (e.g. Pending Approval) */}
        {infoMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(37, 99, 235, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#2563eb',
              fontSize: '13.5px',
              lineHeight: '1.45',
            }}
          >
            <Sparkles size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 14px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger-color, #ef4444)',
              fontSize: '13.5px',
            }}
          >
            <AlertCircle size={17} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '13px' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '40px', height: '44px', fontSize: '14px' }}
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '13px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="password"
                className="form-input"
                style={{ width: '100%', paddingLeft: '40px', height: '44px', fontSize: '14px' }}
                placeholder="At least 6 characters..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '13px' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="password"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '40px', height: '44px', fontSize: '14px' }}
                  placeholder="Re-enter password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              height: '46px',
              borderRadius: '12px',
              background: 'var(--accent-gradient)',
              color: '#ffffff',
              border: 'none',
              fontWeight: '600',
              fontSize: '15px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 18px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.2s',
            }}
          >
            {mode === 'login' ? (
              <>
                <LogIn size={17} />
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              </>
            ) : (
              <>
                <UserPlus size={17} />
                <span>{loading ? 'Creating account...' : 'Create Account'}</span>
              </>
            )}
          </button>
        </form>

        {/* Footer switch prompt */}
        <div style={{ textAlign: 'center', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cyan, #06b6d4)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Sign up now
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-cyan, #06b6d4)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                Sign In
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
