import React, { useState, useEffect } from 'react';
import { transferApi, departmentApi, resourceApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  ArrowLeftRight,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  Building2,
  Boxes,
} from 'lucide-react';

export const InterdeptTransfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({
    source_department: 'MCA',
    destination_department: 'MBA',
    resource_id: 'COMP',
    quantity: 5,
    reason: 'Surplus re-allocation for semester lab project',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, deptRes, resRes] = await Promise.all([
        transferApi.getAll(),
        departmentApi.getAll(),
        resourceApi.getAll(),
      ]);
      setTransfers(txRes.data?.transfers || []);
      setDepartments(deptRes.data?.departments || []);
      setResources(resRes.data?.resources || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInitiateSubmit = async (e) => {
    e.preventDefault();
    try {
      await transferApi.initiate(formData);
      setMessage({ text: 'Interdepartmental transfer executed successfully!', type: 'success' });
      setIsNewOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Transfer initiation failed', type: 'error' });
    }
  };

  const handleAction = async (transferId, action) => {
    try {
      await transferApi.action(transferId, { action });
      setMessage({ text: `Transfer ${action === 'APPROVE' ? 'approved and executed' : 'rejected'}`, type: 'success' });
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Action failed', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Interdepartmental Resource Transfers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Redistribute surplus or unused equipment between departments to optimize college-wide utilization.
          </p>
        </div>
        <button
          onClick={() => setIsNewOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Initiate Direct Transfer</span>
        </button>
      </div>

      {message.text && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Transfers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Transfer ID</th>
                <th className="py-3 px-4">Movement Route</th>
                <th className="py-3 px-4">Resource & Quantity</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Initiated / Approved By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No interdepartmental transfer records found.
                  </td>
                </tr>
              ) : (
                transfers.map((tx) => (
                  <tr key={tx.transfer_id || tx.return_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {tx.transfer_id || tx.return_id}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2 text-xs font-semibold">
                        <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {tx.source_department}
                        </span>
                        <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {tx.destination_department}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{tx.resource_name}</p>
                      <p className="text-indigo-600 font-extrabold text-xs mt-0.5">
                        {tx.quantity} units
                      </p>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-500" title={tx.reason}>
                      {tx.reason || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusBadge status={tx.status} size="xs" />
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      <p>{tx.initiated_by || tx.returned_by}</p>
                      <p className="text-slate-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {tx.status === 'Pending Admin Approval' ? (
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => handleAction(tx.transfer_id, 'APPROVE')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(tx.transfer_id, 'REJECT')}
                            className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold rounded-lg text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-medium">Logged</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transfer Modal */}
      <Modal isOpen={isNewOpen} onClose={() => setIsNewOpen(false)} title="Initiate Resource Transfer">
        <form onSubmit={handleInitiateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Source Department</label>
              <select
                value={formData.source_department}
                onChange={(e) => setFormData({ ...formData, source_department: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {departments.map((d) => (
                  <option key={d.dept_id} value={d.dept_id}>
                    {d.dept_id} - {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination Department</label>
              <select
                value={formData.destination_department}
                onChange={(e) => setFormData({ ...formData, destination_department: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {departments.map((d) => (
                  <option key={d.dept_id} value={d.dept_id}>
                    {d.dept_id} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Resource</label>
              <select
                value={formData.resource_id}
                onChange={(e) => setFormData({ ...formData, resource_id: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                {resources.map((r) => (
                  <option key={r.resource_id} value={r.resource_id}>
                    {r.resource_id} - {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Quantity to Transfer</label>
              <input
                type="number"
                min="1"
                required
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transfer Justification / Reason</label>
            <textarea
              rows="3"
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Execute Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
