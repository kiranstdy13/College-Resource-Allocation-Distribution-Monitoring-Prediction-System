import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/client';
import {
  Users,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Check,
  X,
  ShieldCheck,
  Building2
} from 'lucide-react';

export const UserApprovalSection = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('pending');
  const [rejectModal, setRejectModal] = useState({ open: false, userId: null, name: '', reason: '' });
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllUsers({ status: filterStatus });
      setUsers(res.data?.users || []);
    } catch (err) {
      console.error('Failed to load user registrations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterStatus]);

  const handleApprove = async (userId, name) => {
    setActionLoading(userId);
    try {
      await adminApi.approveUser(userId);
      setNotification({ type: 'success', message: `Account for ${name} has been approved.` });
      fetchUsers();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to approve user.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenReject = (userId, name) => {
    setRejectModal({ open: true, userId, name, reason: 'Department requirements or credentials verification failed.' });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.userId) return;
    setActionLoading(rejectModal.userId);
    try {
      await adminApi.rejectUser(rejectModal.userId, rejectModal.reason);
      setNotification({ type: 'success', message: `Registration for ${rejectModal.name} rejected.` });
      setRejectModal({ open: false, userId: null, name: '', reason: '' });
      fetchUsers();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to reject user.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to suspend access for ${name}?`)) return;
    setActionLoading(userId);
    try {
      await adminApi.suspendUser(userId);
      setNotification({ type: 'success', message: `Account for ${name} has been suspended.` });
      fetchUsers();
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to suspend user.' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole !== 'all' && u.role?.toLowerCase() !== filterRole.toLowerCase()) return false;
    return true;
  });

  const pendingCount = users.filter((u) => u.account_status === 'pending').length;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-900">User Registration Authorization & Management</h3>
              {pendingCount > 0 && filterStatus === 'pending' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                  {pendingCount} Pending Approval
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Review and verify HOD and Department Staff account registrations before granting access.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === 'pending' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === 'approved' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === 'rejected' ? 'bg-white shadow-sm text-rose-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterStatus === 'all' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Users
            </button>
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-700 bg-white font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="hod">HODs</option>
            <option value="staff">Staff</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Notifications */}
      {notification.message && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification({ type: '', message: '' })} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500">Loading registrations...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          No user accounts found matching status: <span className="font-semibold text-slate-700">{filterStatus}</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-y border-slate-100 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Applicant / Name</th>
                <th className="py-2.5 px-4">Role & ID</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Official Email & Mobile</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Date Registered</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const statusColor =
                  u.account_status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : u.account_status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : u.account_status === 'suspended'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200';

                const roleBadge =
                  u.role?.toLowerCase() === 'admin'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : u.role?.toLowerCase() === 'hod'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200';

                return (
                  <tr key={u.user_id || u._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.full_name || u.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Emp ID: {u.employee_id || 'N/A'} {u.designation ? `• ${u.designation}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${roleBadge}`}>
                        {u.role}
                      </span>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {u.admin_id || u.hod_id || u.staff_id || u.user_id || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {u.department_id ? (
                        <span className="font-semibold text-slate-800">{u.department_id}</span>
                      ) : (
                        <span className="text-slate-400 italic">Central (All)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{u.email}</div>
                      <div className="text-[11px] text-slate-400">{u.mobile || 'No mobile listed'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border capitalize ${statusColor}`}>
                        {u.account_status === 'pending' && <Clock className="w-3 h-3 mr-1 text-amber-600 animate-pulse" />}
                        {u.account_status === 'approved' && <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />}
                        {u.account_status === 'rejected' && <XCircle className="w-3 h-3 mr-1 text-rose-600" />}
                        {u.account_status || 'approved'}
                      </span>
                      {u.rejection_reason && (
                        <div className="text-[10px] text-rose-500 truncate max-w-xs mt-0.5" title={u.rejection_reason}>
                          Reason: {u.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {u.account_status !== 'approved' && (
                          <button
                            onClick={() => handleApprove(u.user_id || u._id, u.full_name || u.name)}
                            disabled={actionLoading === (u.user_id || u._id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] transition-all flex items-center space-x-1 shadow-sm"
                            title="Approve User Registration"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        {u.account_status === 'pending' && (
                          <button
                            onClick={() => handleOpenReject(u.user_id || u._id, u.full_name || u.name)}
                            disabled={actionLoading === (u.user_id || u._id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition-all flex items-center space-x-1"
                            title="Reject Registration"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}

                        {u.account_status === 'approved' && u.role?.toLowerCase() !== 'admin' && (
                          <button
                            onClick={() => handleSuspend(u.user_id || u._id, u.full_name || u.name)}
                            disabled={actionLoading === (u.user_id || u._id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-[11px] transition-all flex items-center space-x-1"
                            title="Suspend User Access"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Suspend</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-1">Reject Registration Request</h4>
            <p className="text-xs text-slate-500 mb-4">
              Specify reason for rejecting account of <span className="font-bold text-slate-800">{rejectModal.name}</span>:
            </p>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 mb-4"
              placeholder="e.g. Existing department HOD already assigned or invalid institutional credentials."
            />
            <div className="flex justify-end space-x-2 text-xs">
              <button
                onClick={() => setRejectModal({ open: false, userId: null, name: '', reason: '' })}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
