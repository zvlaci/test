import { Navigate } from 'react-router-dom';

function getRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.role || null;
  } catch {
    return null;
  }
}

export default function StaffRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;

  const role = getRoleFromToken(token);
  if (role === 'admin' || role === 'restaurant') {
    return children;
  }

  // user role (or unknown) gets redirected away from staff pages
  return <Navigate to="/dashboard" />;
}
