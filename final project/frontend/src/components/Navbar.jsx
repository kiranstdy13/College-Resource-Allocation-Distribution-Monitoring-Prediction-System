import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cycleApi } from '../api/client';
import { NotificationBell } from './NotificationBell';
import { LogOut, User, RefreshCw, Layers, ShieldCheck, ChevronDown, Home } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [activeCycle, setActiveCycle] = useState(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const fetchActiveCycle = async () => {
      try {
        const res = await cycleApi.getActive();
        if (res.data?.cycle) {
          setActiveCycle(res.data.cycle);
        }
      } catch (err) {
        console.error("Failed to load active cycle", err);
      }
    };
    fetchActiveCycle();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleQuickSwitch = async (roleType, email, pwd) => {
    setSwitching(true);
    try {
      const u = await login(email, pwd);
      if (roleType === 'Admin') navigate('/admin/dashboard');
      else if (roleType === 'HOD') navigate('/hod/dashboard');
      else if (roleType === 'Staff') navigate('/staff/dashboard');
      else navigate('/');
    } catch (err) {
      console.error("Quick switch failed", err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5">
      <div className="flex items-center justify-between">
        {/* Left: System branding & Cycle indicator */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight leading-none block">
                College<span className="text-brand-600">Resource</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Distribution & Demand Prediction
              </span>
            </div>
          </div>

          {/* Active 6-Month Cycle Badge */}
          {activeCycle && (
            <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Cycle:</span>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-1.5 animate-pulse"></span>
                {activeCycle.cycle_code} ({activeCycle.status})
              </span>
            </div>
          )}
        </div>

        {/* Right: Quick Role Switcher (for demo evaluation), Notifications & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Quick Demo Switcher */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-slate-100/90 p-1 rounded-xl text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 px-2 tracking-wider">Demo User:</span>
            <button
              onClick={() => handleQuickSwitch('Admin', 'admin@college.edu', 'Admin@123')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                user?.role === 'Admin' ? 'bg-white shadow-sm text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickSwitch('HOD', 'hod.mca@college.edu', 'Hod@123')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                user?.role === 'HOD' && user?.department_id === 'MCA' ? 'bg-white shadow-sm text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HOD MCA
            </button>
            <button
              onClick={() => handleQuickSwitch('HOD', 'hod.mba@college.edu', 'Hod@123')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                user?.role === 'HOD' && user?.department_id === 'MBA' ? 'bg-white shadow-sm text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HOD MBA
            </button>
            <button
              onClick={() => handleQuickSwitch('Staff', 'staff.mca@college.edu', 'Staff@123')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                user?.role === 'Staff' ? 'bg-white shadow-sm text-indigo-700 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff
            </button>
          </div>

          <NotificationBell />

          {/* User Profile Pill */}
          <div className="flex items-center space-x-2 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <p className="font-semibold text-slate-900 leading-tight truncate max-w-[140px]">{user?.name}</p>
              <div className="flex items-center space-x-1 text-[11px] text-slate-500">
                <span className="font-medium text-brand-600">{user?.role}</span>
                {user?.department_id && <span>• {user.department_id}</span>}
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
