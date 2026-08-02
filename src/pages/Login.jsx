import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Direct fetch to backend API
      const apiUrl = import.meta.env.VITE_API_URL || 'http://93.127.166.207:5002/api';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      login(data.user, data.token, rememberMe);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #F0F9FF 0%, #E0E7FF 100%)', padding: '24px' }}>
      <div className="animate-fade" style={{ background: 'white', borderRadius: '24px', padding: '48px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)', border: '1px solid rgba(255, 255, 255, 0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 800, margin: '0 auto 24px auto', boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)' }}>
            BM
          </div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.5px' }}>Welcome Back</h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#64748B' }}>Sign in to BADONE MOTORS ERP</p>
        </div>

        {error && (
          <div className="animate-fade" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#DC2626', fontSize: '14px', fontWeight: 500 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="username" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Username</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex' }}>
                <User size={18} />
              </div>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
                style={{ width: '100%', padding: '14px 16px 14px 44px', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '15px', outline: 'none', transition: 'all 0.2s', background: '#F8FAFC' }}
                onFocus={(e) => { e.target.style.borderColor = '#4F46E5'; e.target.style.background = 'white'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', display: 'flex' }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                style={{ width: '100%', padding: '14px 44px', borderRadius: '12px', border: '2px solid #E2E8F0', fontSize: '15px', outline: 'none', transition: 'all 0.2s', background: '#F8FAFC' }}
                onFocus={(e) => { e.target.style.borderColor = '#4F46E5'; e.target.style.background = 'white'; }}
                onBlur={(e) => { e.target.style.borderColor = '#E2E8F0'; e.target.style.background = '#F8FAFC'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', display: 'flex', padding: 0 }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#4F46E5', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>Remember Me</span>
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              marginTop: '12px',
              width: '100%', 
              padding: '16px', 
              background: isLoading ? '#94A3B8' : '#4F46E5', 
              color: 'white', 
              border: 'none', 
              borderRadius: '12px', 
              fontSize: '16px', 
              fontWeight: 600, 
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isLoading ? 'none' : '0 4px 12px rgba(79, 70, 229, 0.2)'
            }}
            onMouseOver={(e) => !isLoading && (e.currentTarget.style.background = '#4338CA')}
            onMouseOut={(e) => !isLoading && (e.currentTarget.style.background = '#4F46E5')}
            onMouseDown={(e) => !isLoading && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => !isLoading && (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', fontWeight: 500 }}>Version 2.0.1 (Cloud API)</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
