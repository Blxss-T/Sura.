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
          <div className="login-brand">Razor</div>
          <h1>Agent Login</h1>
          <p className="login-subtitle">Hey, Enter your details to get sign in to your account</p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}

            <label className="login-field">
              <span>Enter Email / Phone No</span>
              <div className="login-input-wrap">
                <input
                  type="text"
                  placeholder="Enter Email / Phone No"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label className="login-field">
              <span>Passcode</span>
              <div className="login-input-wrap">
                <input
                  type="password"
                  placeholder="Enter password"
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
                Having trouble in sign in?
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
            <button type="button" className="login-social">Apple ID</button>
            <button type="button" className="login-social">Facebook</button>
          </div>

          <div className="login-footer">
            Don't have an account? <a href="#signup">Request Now</a>
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
