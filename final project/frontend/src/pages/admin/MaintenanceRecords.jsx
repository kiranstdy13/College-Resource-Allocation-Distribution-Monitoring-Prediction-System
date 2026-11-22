import React, { useState, useEffect } from 'react';
import { maintenanceApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  Wrench,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Edit2,
  Clock,
} from 'lucide-react';

export const MaintenanceRecords = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('Under Maintenance');
  const [actionNotes, setActionNotes] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await maintenanceApi.getAll();
      setTickets(res.data?.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleOpenUpdate = (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status === 'Reported' ? 'Under Maintenance' : 'Repaired & Restored');
    setActionNotes(ticket.action_taken || '');
    setIsUpdateOpen(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      await maintenanceApi.updateStatus(selectedTicket.ticket_id, {
        status: newStatus,
        action_taken: actionNotes,
      });
      setMessage({ text: `Ticket #${selectedTicket.ticket_id} updated to ${newStatus}`, type: 'success' });
      setIsUpdateOpen(false);
      fetchTickets();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Update failed', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Damage & Maintenance Operations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track damaged, malfunctioning or missing assets, execute technical repair workflows, and manage write-offs.
          </p>
        </div>
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

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Resource & Issue</th>
                <th className="py-3 px-4 text-center">Qty / Asset Serial</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Action Taken</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No open maintenance tickets. All collegiate assets are operational.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.ticket_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {t.ticket_id}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-indigo-700">
                      {t.department_id}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{t.resource_name}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{t.description || t.issue_type}</p>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-800">{t.quantity} unit(s)</span>
                      {t.asset_id && (
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">{t.asset_id}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.status} size="xs" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs max-w-xs truncate" title={t.action_taken}>
                      {t.action_taken || 'Pending technical evaluation'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenUpdate(t)}
                        className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-semibold text-xs border border-indigo-200 transition-colors"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Update Modal */}
      <Modal isOpen={isUpdateOpen} onClose={() => setIsUpdateOpen(false)} title={`Update Ticket #${selectedTicket?.ticket_id}`}>
        <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status Transition</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="Under Maintenance">Under Maintenance (In Workshop)</option>
              <option value="Repaired & Restored">Repaired & Restored (Return to Active Working Stock)</option>
              <option value="Written Off / Disposed">Written Off / Disposed (Scrap from Records)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Technical Resolution Notes</label>
            <textarea
              rows="3"
              required
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder="e.g. Replaced damaged capacitor, diagnostics run and restored to MCA lab..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUpdateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Save Resolution
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
