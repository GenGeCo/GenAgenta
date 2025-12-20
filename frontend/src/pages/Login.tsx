// GenAgenTa - Login Page

import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Se già autenticato, redirect
  if (isAuthenticated) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">GenAgenTa</h1>
        <p className="login-subtitle">Rete Neurale delle Relazioni Commerciali</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@esempio.it"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <p style={{
          marginTop: '24px',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          Non hai un account?{' '}
          <Link to="/register" style={{ color: 'var(--primary)' }}>
            Registrati
          </Link>
        </p>

        <p style={{
          marginTop: '16px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          Demo: admin@gruppogea.net / admin123
        </p>
      </div>
    </div>
  );
}
