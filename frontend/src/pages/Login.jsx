import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('author'); // 'author' or 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Preset demo accounts
  const DEMO_ACCOUNTS = {
    author: [
      { name: 'Priya Sharma (3 books, active tickets)', email: 'priya.sharma@email.com', password: 'password123' },
      { name: 'Rohit Kapoor (2 books, royalty query)', email: 'rohit.kapoor@email.com', password: 'password123' },
      { name: 'Vikram Joshi (high volume seller)', email: 'vikram.joshi@email.com', password: 'password123' },
    ],
    admin: [
      { name: 'BookLeaf Admin', email: 'admin@bookleaf.com', password: 'admin123' },
      { name: 'Support Agent', email: 'support@bookleaf.com', password: 'admin123' },
    ]
  };

  const handleQuickLogin = (demo) => {
    setEmail(demo.email);
    setPassword(demo.password);
    handleSubmit(null, demo.email, demo.password, role);
  };

  const handleSubmit = async (e, customEmail, customPass, customRole) => {
    if (e) e.preventDefault();
    const useEmail = customEmail || email;
    const usePass = customPass || password;
    const useRole = customRole || role;

    if (!useEmail || !usePass) {
      setError('Please provide email and password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const user = await login(useEmail, usePass, useRole);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/author');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(ellipse at 50% 20%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 1) 70%)'
    }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            fontSize: '32px',
            marginBottom: '16px',
            boxShadow: '0 8px 30px rgba(99, 102, 241, 0.4)'
          }}>
            📖
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em', color: '#f8fafc' }}>
            BookLeaf Support Portal
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
            Author Communication & Ticket Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="card" style={{ padding: '32px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Role selector tabs */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.8)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '24px'
          }}>
            <button
              type="button"
              className={`btn btn-sm ${role === 'author' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px' }}
              onClick={() => { setRole('author'); setError(''); setEmail(''); setPassword(''); }}
            >
              ✍️ Author Portal
            </button>
            <button
              type="button"
              className={`btn btn-sm ${role === 'admin' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: '8px' }}
              onClick={() => { setRole('admin'); setError(''); setEmail(''); setPassword(''); }}
            >
              ⚡ Admin Portal
            </button>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder={role === 'author' ? 'priya.sharma@email.com' : 'admin@bookleaf.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              style={{ marginTop: '24px', padding: '12px', fontSize: '0.95rem' }}
              disabled={loading}
            >
              {loading ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="spinner spinner-sm" /> Authenticating...
                </span>
              ) : (
                `Sign in as ${role === 'admin' ? 'Admin' : 'Author'}`
              )}
            </button>
          </form>

          {/* Quick Demo Logins for Assignment Evaluators */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: 600, marginBottom: '10px' }}>
              ⚡ 1-Click Demo Logins ({role}):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {DEMO_ACCOUNTS[role].map((demo, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    fontSize: '0.8rem',
                    padding: '6px 10px',
                    textAlign: 'left',
                    justifyContent: 'flex-start',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1'
                  }}
                  onClick={() => handleQuickLogin(demo)}
                >
                  <span style={{ color: '#818cf8', marginRight: '6px' }}>➜</span>
                  {demo.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', color: '#475569', fontSize: '0.8rem' }}>
          BookLeaf Publishing Assessment • Secure Authentication
        </div>
      </div>
    </div>
  );
}
