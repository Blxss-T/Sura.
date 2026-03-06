import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/reception';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(username, password);
      const home = user.role === 'ADMIN' ? '/admin' : user.role === 'SECURITY' ? '/security' : '/reception';
      navigate(location.state?.from?.pathname || home, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-card login-card-form">
          <div className="login-brand">sura<span className="dot">.</span></div>
          <h1>Welcome Back</h1>
          <p className="login-subtitle">Sign in to your account to continue</p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}

            <label className="login-field">
              <span>Username</span>
              <div className="login-input-wrap">
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span>Password</span>
              <div className="login-input-wrap">
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <span className="login-input-icon" style={{cursor: 'pointer'}}>👁</span>
              </div>
            </label>

            <div className="login-meta">
              <button type="button" className="login-link">
                Forgot password?
              </button>
            </div>

            <button className="login-submit" type="submit">
              Sign in
            </button>
          </form>

          <div className="login-divider">
            <span>Or sign in with</span>
          </div>

          <div className="login-socials" aria-hidden="true">
            <button type="button" className="login-social">Google</button>
            <button type="button" className="login-social">Apple</button>
            <button type="button" className="login-social">Microsoft</button>
          </div>

          <div className="login-footer">
            Don't have an account? <a href="#signup">Contact Admin</a>
          </div>
        </section>

        <section className="login-card login-card-art" aria-hidden="true">
          <div className="login-art">
            <div style={{color: '#fff', fontSize: '3rem', fontWeight: 'bold'}}>VM</div>
          </div>
        </section>
      </div>
    </div>
  );
}
