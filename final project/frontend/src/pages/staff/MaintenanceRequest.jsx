import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { maintenanceApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { Wrench, Clock, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MaintenanceRequest = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await maintenanceApi.getAll({ department_id: deptId });
      setTickets(res.data?.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [deptId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Department Maintenance & Repair Tickets
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track workshop progress on faulty equipment submitted by {deptId} staff.
          </p>
        </div>

        <Link
          to="/staff/damage-report"
          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Wrench className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4 text-center">Quantity / Serial</th>
                <th className="py-3 px-4">Issue Description</th>
                <th className="py-3 px-4">Workshop Status</th>
                <th className="py-3 px-4">Technical Action Taken</th>
                <th className="py-3 px-4">Date Logged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-400">
                    No active maintenance tickets for {deptId}.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.ticket_id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{t.ticket_id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{t.resource_name}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-800">{t.quantity} unit(s)</span>
                      {t.asset_id && <p className="font-mono text-[10px] text-slate-400">{t.asset_id}</p>}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-slate-600">{t.description || t.issue_type}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={t.status} size="xs" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {t.action_taken || 'Scheduled for technician inspection'}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-400">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
