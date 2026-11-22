import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut, Home, UserCheck } from 'lucide-react';

export const Unauthorized = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!user) return '/';
    const role = user.role?.toLowerCase();
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'hod') return '/hod/dashboard';
    if (role === 'staff') return '/staff/dashboard';
    return '/';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl text-center backdrop-blur-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 inline-block mb-3">
          403 Access Denied
        </span>

        <h1 className="text-2xl font-bold text-white mb-2">Restricted Portal Access</h1>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          You do not have authorization to view this section. Each portal (Admin, HOD, and Staff) enforces strict role isolation.
        </p>

        {user && (
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700/60 mb-6 text-left">
            <div className="flex items-center space-x-3 mb-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">Current Active Session</span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              <span className="text-slate-400">Name:</span> {user.full_name || user.name}
            </p>
            <p className="text-xs text-slate-300 font-medium">
              <span className="text-slate-400">Current Role:</span>{' '}
              <span className="font-bold text-indigo-400 uppercase">{user.role}</span>
              {user.department_id && ` (${user.department_id})`}
            </p>
            <p className="text-xs text-slate-300 font-medium truncate">
              <span className="text-slate-400">Email:</span> {user.email}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {user ? (
            <Link
              to={getDashboardPath()}
              className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30"
            >
              <span>Return to My Authorized Dashboard</span>
            </Link>
          ) : (
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Go to Main Landing Page</span>
            </Link>
          )}

          {user && (
            <button
              onClick={handleLogout}
              className="w-full inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-all border border-slate-600"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out & Switch Portal</span>
            </button>
          )}

          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
