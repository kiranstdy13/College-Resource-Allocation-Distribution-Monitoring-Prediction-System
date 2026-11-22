import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { transferApi, departmentApi, inventoryApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import {
  ArrowLeftRight,
  RotateCcw,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';

export const TransferRequest = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [inventory, setInventory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [activeMode, setActiveMode] = useState('interdept'); // 'interdept' or 'return_central'
  const [message, setMessage] = useState({ text: '', type: '' });

  // Transfer Form
  const [destDept, setDestDept] = useState('MBA');
  const [selectedResId, setSelectedResId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  
  // Return Central Form
  const [returnCondition, setReturnCondition] = useState('Working');

  const fetchData = async () => {
    try {
      const [invRes, deptRes, txRes] = await Promise.all([
        inventoryApi.getDeptInventory(deptId),
        departmentApi.getAll(),
        transferApi.getAll(),
      ]);
      const inv = invRes.data?.inventory || [];
      setInventory(inv);
      if (inv.length > 0 && !selectedResId) {
        setSelectedResId(inv[0].resource_id);
      }
      setDepartments((deptRes.data?.departments || []).filter((d) => d.dept_id !== deptId));
      setTransfers(txRes.data?.transfers || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deptId]);

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    try {
      await transferApi.initiate({
        source_department: deptId,
        destination_department: destDept,
        resource_id: selectedResId,
        quantity,
        reason,
      });
      setMessage({ text: 'Transfer request submitted to Central Admin for approval!', type: 'success' });
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Transfer request failed', type: 'error' });
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    try {
      await transferApi.returnToCentral({
        department_id: deptId,
        resource_id: selectedResId,
        quantity,
        condition: returnCondition,
        reason,
      });
      setMessage({ text: `Successfully returned ${quantity} units back to Central Store!`, type: 'success' });
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Return failed', type: 'error' });
    }
  };

  const selectedItem = inventory.find((i) => i.resource_id === selectedResId);
  const maxAvailableToTransfer = selectedItem ? Math.max(0, (selectedItem.working_quantity || 0) - (selectedItem.actively_used_quantity || 0)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Asset Transfers & Returns
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department of {deptId} • Reallocate idle surplus to other academic departments or return stock to central repository.
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

      {/* Mode Selector */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveMode('interdept')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
            activeMode === 'interdept'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowLeftRight className="w-4 h-4" />
          <span>Interdepartmental Transfer Request</span>
        </button>
        <button
          onClick={() => setActiveMode('return_central')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
            activeMode === 'return_central'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Return Stock to Central Store</span>
        </button>
      </div>

      {/* Main Content Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        {activeMode === 'interdept' ? (
          <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Request Interdepartmental Transfer</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Department Inventory Item</label>
                <select
                  value={selectedResId}
                  onChange={(e) => setSelectedResId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {inventory.map((i) => (
                    <option key={i.resource_id} value={i.resource_id}>
                      {i.resource_name} (Unused Working: {Math.max(0, i.working_quantity - i.actively_used_quantity)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Surplus un-utilized units available for transfer: <strong className="text-indigo-600">{maxAvailableToTransfer}</strong>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient Department</label>
                <select
                  value={destDept}
                  onChange={(e) => setDestDept(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {departments.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>
                      {d.dept_id} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity to Transfer</label>
                <input
                  type="number"
                  min="1"
                  max={maxAvailableToTransfer}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Transfer Justification</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Surplus systems transferred to assist MBA student analytics project"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={maxAvailableToTransfer <= 0}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Submit Transfer Request to Admin</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Return Items to Central Store Depot</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Resource</label>
                <select
                  value={selectedResId}
                  onChange={(e) => setSelectedResId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {inventory.map((i) => (
                    <option key={i.resource_id} value={i.resource_id}>
                      {i.resource_name} (Received: {i.received_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity to Return</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Return Condition</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="Working">Working (Surplus / Unused)</option>
                  <option value="Damaged">Damaged / Non-Functional</option>
                  <option value="Surplus">Semester End Surplus</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason for Return</label>
              <textarea
                rows="3"
                required
                placeholder="State reason for returning stock to central warehouse..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Confirm Return to Central Store</span>
            </button>
          </form>
        )}
      </div>

      {/* Department Transfer History */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Transfer & Movement History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Transfer ID</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Resource</th>
                <th className="py-2.5 px-4 text-center">Quantity</th>
                <th className="py-2.5 px-4">From → To</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {transfers.map((tx) => (
                <tr key={tx.transfer_id || tx.return_id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900">{tx.transfer_id || tx.return_id}</td>
                  <td className="py-3 px-4 font-sans text-xs">{tx.transaction_type}</td>
                  <td className="py-3 px-4 font-sans text-xs font-semibold text-slate-800">{tx.resource_name}</td>
                  <td className="py-3 px-4 text-center font-bold text-indigo-700">{tx.quantity}</td>
                  <td className="py-3 px-4 font-sans text-xs">
                    {tx.source_department} → {tx.destination_department}
                  </td>
                  <td className="py-3 px-4 font-sans text-xs">
                    <StatusBadge status={tx.status} size="xs" />
                  </td>
                  <td className="py-3 px-4 font-sans text-[11px] text-slate-400">
                    {new Date(tx.timestamp).toLocaleDateString()}
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
