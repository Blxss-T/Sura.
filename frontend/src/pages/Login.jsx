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
          <div className="login-brand">SVMS</div>
          <h1>Welcome home</h1>
          <p className="login-subtitle">Please enter your details.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}

            <label className="login-field">
              <span>Username</span>
              <div className="login-input-wrap">
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
                <span className="login-input-icon">U</span>
              </div>
            </label>

            <label className="login-field">
              <span>Password</span>
              <div className="login-input-wrap">
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <span className="login-input-icon">O</span>
              </div>
            </label>

            <div className="login-meta">
              <label className="login-checkbox">
                <input type="checkbox" defaultChecked />
                <span>Remember for 30 days</span>
              </label>
              <button type="button" className="login-link">
                Forgot password?
              </button>
            </div>

            <button className="login-submit" type="submit">
              Login
            </button>
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          <div className="login-socials" aria-hidden="true">
            <button type="button" className="login-social">A</button>
            <button type="button" className="login-social">G</button>
            <button type="button" className="login-social">F</button>
          </div>
        </section>

        <section className="login-card login-card-art" aria-hidden="true">
          <div className="login-art">
            <div className="login-art-blob login-art-blob-top" />
            <div className="login-art-blob login-art-blob-left" />
            <div className="login-art-wave" />
            <div className="login-art-glow" />
          </div>
        </section>
      </div>
    </div>
  );
}
