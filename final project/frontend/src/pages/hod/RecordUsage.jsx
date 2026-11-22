import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { utilizationApi, inventoryApi } from '../../api/client';
import {
  ActivitySquare,
  Clock,
  Boxes,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';

export const RecordUsage = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [inventory, setInventory] = useState([]);
  const [utilHistory, setUtilHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [utilType, setUtilType] = useState('QUANTITY'); // 'QUANTITY' or 'TIME'
  const [selectedResId, setSelectedResId] = useState('');
  
  // Quantity fields
  const [activelyUsedQty, setActivelyUsedQty] = useState(0);
  
  // Time fields
  const [actualUsageHours, setActualUsageHours] = useState(35);
  const [availableHours, setAvailableHours] = useState(40);
  
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, utilRes] = await Promise.all([
        inventoryApi.getDeptInventory(deptId),
        utilizationApi.getDeptUtilization(deptId),
      ]);
      const inv = invRes.data?.inventory || [];
      setInventory(inv);
      if (inv.length > 0 && !selectedResId) {
        setSelectedResId(inv[0].resource_id);
        setActivelyUsedQty(inv[0].working_quantity || 0);
      }
      setUtilHistory(utilRes.data?.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deptId]);

  const selectedItem = inventory.find((i) => i.resource_id === selectedResId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await utilizationApi.record({
        department_id: deptId,
        resource_id: selectedResId,
        utilization_type: utilType,
        actively_used_quantity: activelyUsedQty,
        actual_usage_hours: actualUsageHours,
        available_operating_hours: availableHours,
        notes,
      });
      setMessage({ text: 'Resource utilization recorded successfully!', type: 'success' });
      fetchData();
      setNotes('');
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to record utilization', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Resource Monitoring & Utilization Recording
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department of {deptId} • Manually log physical usage metrics to measure real equipment utilization and prevent idle stockpiles.
          </p>
        </div>
      </div>

      {/* Formula Standards Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 text-xs">
          <div className="flex items-center space-x-2 text-indigo-950 font-bold mb-1">
            <Boxes className="w-4 h-4 text-indigo-600" />
            <span>Quantity Utilization Standard</span>
          </div>
          <p className="font-mono bg-white p-1.5 rounded border border-indigo-200 text-indigo-700 text-[11px]">
            Quantity Utilization = (Actively Used / Allocated Quantity) × 100
          </p>
          <p className="text-slate-500 text-[11px] mt-1.5">
            Applies to computers, tables, fans, and laboratory workstations.
          </p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs">
          <div className="flex items-center space-x-2 text-emerald-950 font-bold mb-1">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Time Utilization Standard</span>
          </div>
          <p className="font-mono bg-white p-1.5 rounded border border-emerald-200 text-emerald-700 text-[11px]">
            Time Utilization = (Actual Usage Hours / Operating Hours) × 100
          </p>
          <p className="text-slate-500 text-[11px] mt-1.5">
            Applies to shared seminar halls, smart auditoriums, and specialized lab slots.
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
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Utilization Entry Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Record Daily / Weekly Usage Entry</h3>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Metric Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUtilType('QUANTITY')}
                  className={`p-2 rounded-xl border font-bold text-center transition-all ${
                    utilType === 'QUANTITY' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Quantity-Based
                </button>
                <button
                  type="button"
                  onClick={() => setUtilType('TIME')}
                  className={`p-2 rounded-xl border font-bold text-center transition-all ${
                    utilType === 'TIME' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Time / Hours-Based
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department Resource</label>
              <select
                value={selectedResId}
                onChange={(e) => {
                  setSelectedResId(e.target.value);
                  const item = inventory.find((i) => i.resource_id === e.target.value);
                  if (item) setActivelyUsedQty(item.working_quantity || 0);
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              >
                {inventory.map((i) => (
                  <option key={i.resource_id} value={i.resource_id}>
                    {i.resource_name} (Allocated: {i.received_quantity}, Working: {i.working_quantity})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {utilType === 'QUANTITY' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total Allocated</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedItem?.received_quantity || 0} units`}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Working Condition</label>
                <input
                  type="text"
                  disabled
                  value={`${selectedItem?.working_quantity || 0} units (${selectedItem?.damaged_quantity || 0} damaged)`}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actively Used Right Now</label>
                <input
                  type="number"
                  min="0"
                  max={selectedItem?.working_quantity || 100}
                  required
                  value={activelyUsedQty}
                  onChange={(e) => setActivelyUsedQty(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-extrabold text-indigo-700 text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Available Operating Hours (Week / Period)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={availableHours}
                  onChange={(e) => setAvailableHours(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Actual Usage Hours Logged</label>
                <input
                  type="number"
                  min="0"
                  max={availableHours}
                  required
                  value={actualUsageHours}
                  onChange={(e) => setActualUsageHours(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-extrabold text-emerald-700 text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Usage Notes / Schedule Session Details</label>
            <input
              type="text"
              placeholder="e.g. MCA Practical Exam sessions and AI Project lab sprints active"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center space-x-2"
          >
            <ActivitySquare className="w-4 h-4" />
            <span>Record Utilization Log</span>
          </button>
        </form>
      </div>

      {/* Utilization History Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Department Utilization Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Log ID</th>
                <th className="py-2.5 px-4">Resource</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-center">Active Quantity / Hours</th>
                <th className="py-2.5 px-4 text-center">Utilization Rate</th>
                <th className="py-2.5 px-4">Logged By / Notes</th>
                <th className="py-2.5 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {utilHistory.map((h) => (
                <tr key={h.record_id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{h.record_id}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{h.resource_name}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      h.utilization_type === 'QUANTITY' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {h.utilization_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-800">
                    {h.utilization_type === 'QUANTITY'
                      ? `${h.actively_used_quantity} / ${h.allocated_quantity} units`
                      : `${h.actual_usage_hours} / ${h.available_operating_hours} hrs`}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {h.utilization_percentage}%
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-500" title={h.notes}>
                    {h.notes || h.recorded_by}
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-400">
                    {new Date(h.timestamp).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
