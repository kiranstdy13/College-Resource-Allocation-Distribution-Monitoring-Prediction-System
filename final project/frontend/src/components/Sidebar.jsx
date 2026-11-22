import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Boxes,
  Building2,
  CalendarDays,
  FileCheck2,
  ArrowLeftRight,
  Wrench,
  BrainCircuit,
  FileText,
  History,
  SendHorizontal,
  Flame,
  ActivitySquare,
  PackageSearch,
  Sparkles,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role;
  const lowerRole = role?.toLowerCase();

  const adminNav = [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Central Inventory', path: '/admin/inventory', icon: Boxes },
    { name: 'Departments', path: '/admin/departments', icon: Building2 },
    { name: 'Distribution Cycles', path: '/admin/cycles', icon: CalendarDays },
    { name: 'Request Review & Allocation', path: '/admin/requests', icon: FileCheck2 },
    { name: 'Interdept Transfers', path: '/admin/transfers', icon: ArrowLeftRight },
    { name: 'Damage & Maintenance', path: '/admin/maintenance', icon: Wrench },
    { name: 'ML Demand Prediction', path: '/admin/predictions', icon: BrainCircuit },
    { name: 'Reports & Export', path: '/admin/reports', icon: FileText },
    { name: 'Audit Logs', path: '/admin/audit', icon: History },
  ];

  const hodNav = [
    { name: 'HOD Dashboard', path: '/hod/dashboard', icon: LayoutDashboard },
    { name: 'Department Inventory', path: '/hod/inventory', icon: PackageSearch },
    { name: 'Submit 6-Month Demands', path: '/hod/submit-request', icon: SendHorizontal },
    { name: 'Urgent Additional Request', path: '/hod/urgent-request', icon: Flame },
    { name: 'Transfer Request', path: '/hod/transfer', icon: ArrowLeftRight },
    { name: 'Record Resource Usage', path: '/hod/record-usage', icon: ActivitySquare },
    { name: 'AI Demand Predictions', path: '/hod/predictions', icon: Sparkles },
  ];

  const staffNav = [
    { name: 'Staff Dashboard', path: '/staff/dashboard', icon: LayoutDashboard },
    { name: 'Record Resource Usage', path: '/staff/usage', icon: ActivitySquare },
    { name: 'Report Damage / Issue', path: '/staff/damage-report', icon: Wrench },
    { name: 'Maintenance Status', path: '/staff/maintenance', icon: History },
  ];

  let currentNav = [];
  if (lowerRole === 'admin') currentNav = adminNav;
  else if (lowerRole === 'hod') currentNav = hodNav;
  else if (lowerRole === 'staff') currentNav = staffNav;

  const accentColor =
    lowerRole === 'admin'
      ? 'bg-indigo-600 shadow-indigo-600/30'
      : lowerRole === 'hod'
      ? 'bg-emerald-600 shadow-emerald-600/30'
      : 'bg-sky-600 shadow-sky-600/30';

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-57px)] border-r border-slate-800">
      {/* Department/Role Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation Portal</p>
        <p className="text-sm font-semibold text-white mt-0.5 flex items-center justify-between">
          <span className="capitalize">{role} Console</span>
          {user?.department_id && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {user.department_id}
            </span>
          )}
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {currentNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path.endsWith('/dashboard')}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? `${accentColor} text-white shadow-md font-semibold`
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-400 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span>Version 1.0.0</span>
          <span className="text-emerald-400 font-medium">● Online</span>
        </div>
      </div>
    </aside>
  );
};
