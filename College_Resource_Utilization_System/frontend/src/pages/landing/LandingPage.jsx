import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Users,
  Boxes,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  FileCheck2,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-white tracking-tight">
                College<span className="text-indigo-400">Resource</span>
              </span>
              <span className="text-xs text-slate-400 block -mt-1 font-medium">
                Allocation & Demand Prediction System
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2"></span>
              Centralized Six-Month Cycle Active
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-semibold mb-4">
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
            <span>AI-Powered Institutional Resource Optimization</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight sm:leading-tight">
            College Resource Allocation, Distribution, Monitoring & Prediction System
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            Centralized inventory distribution across MCA, MBA, and MTech departments. Manage six-month cycles, track physical asset health, and forecast departmental demand using Machine Learning.
          </p>
        </div>

        {/* 3 Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto w-full">
          {/* Admin Portal Card */}
          <div className="relative group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 rounded-3xl p-7 transition-all duration-300 shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-3">
                Central Authority
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Admin Portal</h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Centralized college resource and departmental management. Review requests, allocate quotas, monitor shortages, authorize user accounts, and execute ML predictions.
              </p>

              <ul className="space-y-2 text-xs text-slate-300 mb-8">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Central stock & 6-month cycle management</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>Review departmental demands & allocations</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>User registration verification & audit trails</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-700/60">
              <Link
                to="/admin/login"
                className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-600/30 group-hover:shadow-indigo-600/40"
              >
                <span>Admin Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="text-center">
                <Link
                  to="/admin/register"
                  className="text-xs text-indigo-300 hover:text-indigo-200 font-medium inline-block transition-colors"
                >
                  Authorized Admin Registration &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* HOD Portal Card */}
          <div className="relative group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/60 rounded-3xl p-7 transition-all duration-300 shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 mb-3">
                Department Heads
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">HOD Portal</h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Department resource requests, inventory and allocation tracking. Submit 6-month demands based on student strength, request urgent transfers, and inspect AI suggestions.
              </p>

              <ul className="space-y-2 text-xs text-slate-300 mb-8">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Submit biannual departmental requirements</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Real-time department inventory tracking</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Urgent cycle requests & transfer coordination</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-700/60">
              <Link
                to="/hod/login"
                className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 group-hover:shadow-emerald-600/40"
              >
                <span>HOD Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="text-center">
                <Link
                  to="/hod/register"
                  className="text-xs text-emerald-300 hover:text-emerald-200 font-medium inline-block transition-colors"
                >
                  Register as Department HOD &rarr;
                </Link>
              </div>
            </div>
          </div>

          {/* Staff Portal Card */}
          <div className="relative group bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-500/60 rounded-3xl p-7 transition-all duration-300 shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 rounded-2xl bg-sky-600/20 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <Users className="w-8 h-8" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/20 mb-3">
                Operational Staff
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Staff Portal</h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Department resource usage, damage reporting and maintenance. Log active equipment hours, file incident tickets, and track physical item returns.
              </p>

              <ul className="space-y-2 text-xs text-slate-300 mb-8">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Log resource utilization by class/lab</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Report damaged items & maintenance requests</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Department equipment availability inspection</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 pt-4 border-t border-slate-700/60">
              <Link
                to="/staff/login"
                className="w-full inline-flex items-center justify-center space-x-2 px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-all shadow-lg shadow-sky-600/30 group-hover:shadow-sky-600/40"
              >
                <span>Staff Login</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="text-center">
                <Link
                  to="/staff/register"
                  className="text-xs text-sky-300 hover:text-sky-200 font-medium inline-block transition-colors"
                >
                  Register as Staff Member &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* System Credentials Quick Guide */}
        <div className="mt-16 bg-slate-800/40 border border-slate-800 rounded-2xl p-6 max-w-4xl mx-auto w-full text-center">
          <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 uppercase tracking-widest font-bold mb-3">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Default Institutional Evaluation Credentials</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-indigo-400 block mb-1">Central Admin</span>
              <p className="text-slate-300">ID: <code className="text-white font-mono">ADM-001</code> / <code className="text-white font-mono">admin@college.edu</code></p>
              <p className="text-slate-400">Pass: <code className="text-white font-mono">Admin@123</code></p>
            </div>
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-emerald-400 block mb-1">HOD (MCA / MBA / MTech)</span>
              <p className="text-slate-300">ID: <code className="text-white font-mono">HOD-MCA-01</code> / <code className="text-white font-mono">hod.mca@college.edu</code></p>
              <p className="text-slate-400">Pass: <code className="text-white font-mono">Hod@123</code></p>
            </div>
            <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-sky-400 block mb-1">Department Staff</span>
              <p className="text-slate-300">ID: <code className="text-white font-mono">STF-MCA-01</code> / <code className="text-white font-mono">staff.mca@college.edu</code></p>
              <p className="text-slate-400">Pass: <code className="text-white font-mono">Staff@123</code></p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} College Resource Allocation, Distribution & Demand Prediction System. All rights reserved.</p>
      </footer>
    </div>
  );
};
