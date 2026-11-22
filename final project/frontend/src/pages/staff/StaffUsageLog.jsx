import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { utilizationApi, inventoryApi } from '../../api/client';
import { ActivitySquare, CheckCircle2, AlertCircle } from 'lucide-react';

export const StaffUsageLog = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [inventory, setInventory] = useState([]);
  const [selectedResId, setSelectedResId] = useState('');
  const [activelyUsedQty, setActivelyUsedQty] = useState(0);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchData = async () => {
    try {
      const res = await inventoryApi.getDeptInventory(deptId);
      const inv = res.data?.inventory || [];
      setInventory(inv);
      if (inv.length > 0 && !selectedResId) {
        setSelectedResId(inv[0].resource_id);
        setActivelyUsedQty(inv[0].working_quantity || 0);
      }
    } catch (err) {
      console.error(err);
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
        utilization_type: 'QUANTITY',
        actively_used_quantity: activelyUsedQty,
        notes,
      });
      setMessage({ text: 'Resource active usage logged successfully!', type: 'success' });
      fetchData();
      setNotes('');
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to record usage', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Record Daily Equipment Usage</h1>
        <p className="text-xs text-slate-500 mt-1">
          Update the active student count or working workstations in use for {deptId} laboratories.
        </p>
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

      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Laboratory Resource</label>
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
                  {i.resource_name} (Working Health: {i.working_quantity} units)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Operational Working Units</label>
              <input
                type="text"
                disabled
                value={`${selectedItem?.working_quantity || 0} units`}
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Units Actively In Use</label>
              <input
                type="number"
                min="0"
                max={selectedItem?.working_quantity || 100}
                required
                value={activelyUsedQty}
                onChange={(e) => setActivelyUsedQty(parseInt(e.target.value) || 0)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-extrabold text-indigo-700 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Laboratory Session / Class Incharge Notes</label>
            <input
              type="text"
              placeholder="e.g. MCA Semester 2 Cloud Computing practical batch A in session"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <ActivitySquare className="w-4 h-4" />
            <span>Save Utilization Log</span>
          </button>
        </form>
      </div>
    </div>
  );
};
