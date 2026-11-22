import React, { useState, useEffect } from 'react';
import { cycleApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Boxes,
  PlayCircle,
  StopCircle,
} from 'lucide-react';

export const CycleManagement = () => {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({
    cycle_code: '',
    name: '',
    start_date: '',
    end_date: '',
    submission_deadline: '',
    status: 'Open for Requests',
  });

  const fetchCycles = async () => {
    setLoading(true);
    try {
      const res = await cycleApi.getAll();
      setCycles(res.data?.cycles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const handleOpenAdd = () => {
    const year = new Date().getFullYear();
    setFormData({
      cycle_code: `CYCLE-${year}-H2`,
      name: `Jul - Dec ${year} Resource Distribution Cycle`,
      start_date: `${year}-07-01`,
      end_date: `${year}-12-31`,
      submission_deadline: `${year}-07-20`,
      status: 'Draft',
    });
    setIsAddOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await cycleApi.create(formData);
      setMessage({ text: 'Distribution cycle created successfully!', type: 'success' });
      setIsAddOpen(false);
      fetchCycles();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to create cycle', type: 'error' });
    }
  };

  const handleStatusChange = async (cycleCode, newStatus) => {
    try {
      await cycleApi.updateStatus(cycleCode, newStatus);
      setMessage({ text: `Cycle ${cycleCode} status updated to ${newStatus}`, type: 'success' });
      fetchCycles();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to update status', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Six-Month Distribution Cycles
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administers institutional 6-month allocation periods (Jan–Jun & Jul–Dec), submission windows, and review milestones.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Distribution Cycle</span>
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
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Cycles List */}
      <div className="space-y-4">
        {cycles.map((c) => {
          const isOpen = c.status === 'Open for Requests';
          const isReview = c.status === 'Under Review';
          const isCompleted = c.status === 'Completed';

          return (
            <div
              key={c.cycle_code}
              className={`bg-white rounded-2xl p-5 border transition-all ${
                isOpen ? 'border-indigo-300 shadow-md ring-2 ring-indigo-500/10' : 'border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                      isOpen
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                        : isCompleted
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <h3 className="font-bold text-slate-900 text-base">{c.name}</h3>
                      <StatusBadge status={c.status} size="xs" />
                    </div>
                    <p className="font-mono text-xs font-semibold text-indigo-600 mt-0.5">{c.cycle_code}</p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Period: <strong className="text-slate-800">{c.start_date}</strong> to <strong className="text-slate-800">{c.end_date}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Deadline: <strong className="text-slate-800">{c.submission_deadline || 'Not set'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Requests: <strong className="text-indigo-700">{c.requests_count || 0}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="flex items-center space-x-2 self-start lg:self-center">
                  {c.status === 'Draft' && (
                    <button
                      onClick={() => handleStatusChange(c.cycle_code, 'Open for Requests')}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Open for Requests</span>
                    </button>
                  )}
                  {c.status === 'Open for Requests' && (
                    <button
                      onClick={() => handleStatusChange(c.cycle_code, 'Under Review')}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Close Submissions & Review</span>
                    </button>
                  )}
                  {c.status === 'Under Review' && (
                    <button
                      onClick={() => handleStatusChange(c.cycle_code, 'Distribution Active')}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1"
                    >
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Activate Distribution</span>
                    </button>
                  )}
                  {c.status === 'Distribution Active' && (
                    <button
                      onClick={() => handleStatusChange(c.cycle_code, 'Completed')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Cycle Completed</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Cycle Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create Six-Month Distribution Cycle">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cycle Code</label>
              <input
                type="text"
                required
                placeholder="e.g. CYCLE-2026-H2"
                value={formData.cycle_code}
                onChange={(e) => setFormData({ ...formData, cycle_code: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cycle Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Jul - Dec 2026 Resource Distribution Cycle"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cycle Start Date</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cycle End Date</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Submission Deadline</label>
              <input
                type="date"
                required
                value={formData.submission_deadline}
                onChange={(e) => setFormData({ ...formData, submission_deadline: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="Draft">Draft</option>
              <option value="Open for Requests">Open for Requests</option>
              <option value="Under Review">Under Review</option>
            </select>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Save Cycle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
