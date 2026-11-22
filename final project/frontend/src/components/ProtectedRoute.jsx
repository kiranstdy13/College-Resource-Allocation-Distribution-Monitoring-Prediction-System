import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const ProtectedRoute = ({ allowedRoles = [], portalRole = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">Authenticating Session...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to portal login based on route or portalRole
  if (!user) {
    const pathname = location.pathname;
    if (portalRole === 'Admin' || pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }
    if (portalRole === 'HOD' || pathname.startsWith('/hod')) {
      return <Navigate to="/hod/login" state={{ from: location }} replace />;
    }
    if (portalRole === 'Staff' || pathname.startsWith('/staff')) {
      return <Navigate to="/staff/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Check role authorization (case-insensitive)
  if (allowedRoles.length > 0) {
    const userRole = user.role?.toLowerCase();
    const isAuthorized = allowedRoles.some((r) => r.toLowerCase() === userRole);
    if (!isAuthorized) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
