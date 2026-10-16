import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se especifican roles permitidos, validar
  if (allowedRoles && allowedRoles.length > 0) {
    const isSuper = user?.rol === 'superusuario';
    const isAllowed = allowedRoles.includes(user?.rol);

    if (!isSuper && !isAllowed) {
      // Redirigir al portal trabajador si es trabajador, o al dashboard general
      if (user?.rol === 'trabajador') {
        return <Navigate to="/portal-trabajador" replace />;
      }
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
