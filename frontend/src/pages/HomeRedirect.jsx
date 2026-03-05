import { Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  const to = user.role === 'ADMIN' ? '/admin' : user.role === 'SECURITY' ? '/security' : '/reception';
  return <Navigate to={to} replace />;
}
