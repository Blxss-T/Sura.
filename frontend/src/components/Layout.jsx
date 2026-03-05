import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <h1 className="logo">Visitor Management</h1>
        <nav className="nav">
          {(user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST') && (
            <NavLink to="/reception" className={({ isActive }) => isActive ? 'active' : ''}>Reception</NavLink>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin" className={({ isActive }) => isActive ? 'active' : ''}>Admin</NavLink>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'SECURITY') && (
            <NavLink to="/security" className={({ isActive }) => isActive ? 'active' : ''}>Security</NavLink>
          )}
        </nav>
        <div className="user-bar">
          <span>{user?.username} ({user?.role_display})</span>
          <button type="button" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
