import { Navigate } from 'react-router-dom';

function getRole(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.role || null;
  } catch {
    return null;
  }
}

export default function RoleRoute({ allowedRoles, children, redirectTo = '/dashboard' }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;

  const role = getRole(token);
  if (Array.isArray(allowedRoles) && allowedRoles.includes(role)) {
    return children;
  }

  return <Navigate to={redirectTo} />;
}
