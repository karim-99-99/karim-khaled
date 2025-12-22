import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../services/storageService';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;












