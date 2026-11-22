import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../api/client';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState('admin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim()) {
      setError('Please enter your Registered Email or User ID.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword({
        identifier: identifier.trim(),
        new_password: newPassword,
        role: role.toLowerCase(),
      });
      setSuccess(res.data?.message || 'Password has been reset successfully. You may now log in.');
      setIdentifier('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const getLoginPath = () => {
    if (role === 'admin') return '/admin/login';
    if (role === 'hod') return '/hod/login';
    return '/staff/login';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-5">
          <KeyRound className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-white text-center mb-1">Password Recovery</h1>
        <p className="text-xs text-slate-400 text-center mb-6">
          Reset your credentials for the college resource management portals.
        </p>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <div className="flex items-center space-x-2 font-bold mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Password Reset Successful</span>
            </div>
            <p className="mb-3">{success}</p>
            <Link
              to={getLoginPath()}
              className="inline-block px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
            >
              Proceed to {role.toUpperCase()} Login &rarr;
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Portal / Role</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  role === 'admin'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole('hod')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  role === 'hod'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                HOD
              </button>
              <button
                type="button"
                onClick={() => setRole('staff')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  role === 'staff'
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                Staff
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Official Email or {role.toUpperCase()} ID
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={role === 'admin' ? 'admin@college.edu or ADM-001' : role === 'hod' ? 'hod.mca@college.edu or HOD-MCA-01' : 'staff.mca@college.edu or STF-MCA-01'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
          <Link to="/" className="inline-flex items-center space-x-1 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Main Landing</span>
          </Link>
          <Link to={getLoginPath()} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
            Back to {role.toUpperCase()} Login &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
