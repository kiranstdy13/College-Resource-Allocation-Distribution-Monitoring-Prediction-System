import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { ShieldCheck, Eye, EyeOff, AlertCircle, ArrowLeft, Key, Building2, CheckCircle2 } from 'lucide-react';

export const AdminRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    adminId: '',
    collegeName: 'College of Engineering & Technology',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    authKey: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Frontend Validations
    if (!formData.fullName.trim() || !formData.adminId.trim() || !formData.collegeName.trim() || !formData.email.trim() || !formData.mobile.trim() || !formData.password) {
      setError('All required fields must be completed.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.adminRegister({
        full_name: formData.fullName.trim(),
        admin_id: formData.adminId.trim().toUpperCase(),
        college_name: formData.collegeName.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        admin_setup_secret: formData.authKey.trim(),
      });

      setSuccess(res.data?.message || 'Admin account successfully registered! Redirecting to login...');
      setTimeout(() => {
        navigate('/admin/login');
      }, 2000);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Registration failed. Please check your authorization key and details.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 py-8">
      <div className="max-w-lg w-full bg-slate-900 border border-indigo-900/40 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center justify-between mb-6">
          <Link to="/admin/login" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Login</span>
          </Link>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Authorized Setup
          </span>
        </div>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Register Central Administrator</h1>
          <p className="text-xs text-slate-400 mt-1">
            Institutional authorization required to grant central inventory governance
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <div className="flex-1 font-medium">{success}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Dr. Sarah Jenkins"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Admin ID *</label>
              <input
                type="text"
                name="adminId"
                required
                value={formData.adminId}
                onChange={handleChange}
                placeholder="ADM-002"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">College / Institution Name *</label>
            <div className="relative">
              <input
                type="text"
                name="collegeName"
                required
                value={formData.collegeName}
                onChange={handleChange}
                className="w-full px-3 py-2 pl-9 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@college.edu"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (10 digits) *</label>
              <input
                type="tel"
                name="mobile"
                required
                value={formData.mobile}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/40">
            <label className="block text-xs font-bold text-indigo-300 mb-1 flex items-center space-x-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Institutional Authorization Key *</span>
            </label>
            <input
              type="password"
              name="authKey"
              required
              value={formData.authKey}
              onChange={handleChange}
              placeholder="Enter institutional setup secret (Default: COLLEGE_ADMIN_KEY_2026)"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-indigo-700/50 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
            />
            <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
              Security Notice: Unrestricted public admin creation is blocked. An authorization key set by institutional governance is required.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 mt-4"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Authorize & Register Administrator</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          <span>Already have administrator credentials? </span>
          <Link to="/admin/login" className="text-indigo-400 hover:text-indigo-300 font-bold ml-1 transition-colors">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};
