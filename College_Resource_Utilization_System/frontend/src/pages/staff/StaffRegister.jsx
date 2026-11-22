import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/client';
import { Users, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';

export const StaffRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    staffId: '',
    employeeId: '',
    email: '',
    mobile: '',
    departmentId: 'MCA',
    designation: 'Lab Instructor',
    password: '',
    confirmPassword: '',
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

    if (!formData.fullName.trim() || !formData.staffId.trim() || !formData.employeeId.trim() || !formData.email.trim() || !formData.mobile.trim() || !formData.departmentId || !formData.designation.trim() || !formData.password) {
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
      const res = await authApi.staffRegister({
        full_name: formData.fullName.trim(),
        staff_id: formData.staffId.trim().toUpperCase(),
        employee_id: formData.employeeId.trim().toUpperCase(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.mobile.trim(),
        department_id: formData.departmentId,
        designation: formData.designation.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
      });

      setSuccess(res.data?.message || 'Staff registration submitted! Your account is pending administrative approval.');
      setTimeout(() => {
        navigate('/staff/login');
      }, 3500);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Registration failed. Staff ID or email may already exist.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 py-8">
      <div className="max-w-lg w-full bg-slate-900 border border-sky-900/40 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex items-center justify-between mb-6">
          <Link to="/staff/login" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Staff Login</span>
          </Link>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Staff Application
          </span>
        </div>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-sky-600/20 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Register Department Staff</h1>
          <p className="text-xs text-slate-400 mt-1">
            Departmental lab technician, assistant or instructor account creation
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs">
            <div className="flex items-center space-x-2 font-bold mb-1">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              <span>Registration Submitted Successfully</span>
            </div>
            <p className="text-sky-200/90 leading-relaxed mb-2">{success}</p>
            <div className="flex items-center space-x-2 text-[11px] text-sky-400/80">
              <Clock className="w-3.5 h-3.5" />
              <span>Redirecting to Staff login in a moment...</span>
            </div>
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
                placeholder="Vikram Singh"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Staff ID *</label>
              <input
                type="text"
                name="staffId"
                required
                value={formData.staffId}
                onChange={handleChange}
                placeholder="STF-MCA-02"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Department *</label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500"
              >
                <option value="MCA">MCA (Computer Applications)</option>
                <option value="MBA">MBA (Management Studies)</option>
                <option value="MTech">MTech (Advanced Engineering)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Designation *</label>
              <input
                type="text"
                name="designation"
                required
                value={formData.designation}
                onChange={handleChange}
                placeholder="Lab Instructor / Assistant"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Employee ID *</label>
              <input
                type="text"
                name="employeeId"
                required
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="EMP-STF-05"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500 uppercase"
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
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email *</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="staff.name@college.edu"
              className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
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
                  className="w-full px-3 py-2 pr-9 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
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
                className="w-full px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800/40 flex items-start space-x-2.5 text-slate-300">
            <Clock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-slate-300">
              <span className="font-bold text-white">Staff Verification:</span> Newly registered staff accounts remain <span className="text-amber-400 font-semibold">pending</span> until verified by the Central Administrator or authorized Department Head.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center space-x-2 mt-4"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>Submit Staff Registration Request</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          <span>Already registered as Staff? </span>
          <Link to="/staff/login" className="text-sky-400 hover:text-sky-300 font-bold ml-1 transition-colors">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
};
