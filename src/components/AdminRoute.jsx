import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    return <Navigate to="/login" />;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    if (payload.role === 'admin') {
      return children;
    }
    
    // If not admin, redirect to dashboard
    return <Navigate to="/dashboard" />;
  } catch (err) {
    console.error('Invalid token format:', err);
    return <Navigate to="/login" />;
  }
}
