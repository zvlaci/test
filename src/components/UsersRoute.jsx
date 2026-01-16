import { Navigate } from 'react-router-dom';

function getRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.role || null;
  } catch {
    return null;
  }
}

export default function UsersRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;

  const role = getRoleFromToken(token);
  if (role === 'admin' || role === 'user') {
    return children;
  }

  // restaurants dont need users page
  return <Navigate to="/dashboard" />;
}
