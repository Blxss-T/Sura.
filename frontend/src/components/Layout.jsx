import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">sura<span className="dot">.</span></div>
        <nav className="sidebar-nav">
          {(user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST') && (
            <NavLink to="/reception" className={({ isActive }) => isActive ? 'sidebar-nav-link active' : 'sidebar-nav-link'}>Reception</NavLink>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'sidebar-nav-link active' : 'sidebar-nav-link'}>Admin</NavLink>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'SECURITY') && (
            <NavLink to="/security" className={({ isActive }) => isActive ? 'sidebar-nav-link active' : 'sidebar-nav-link'}>Security</NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-info">
            <div className="username">{user?.username}</div>
            <div className="role">{user?.role_display}</div>
          </div>
          <button type="button" className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>
      <main className="main-content">
        {children || <Outlet />}
      </main>
    </div>
  );
}
