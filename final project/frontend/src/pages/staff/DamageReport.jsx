import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { maintenanceApi, inventoryApi } from '../../api/client';
import { Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const DamageReport = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [inventory, setInventory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedResId, setSelectedResId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [issueType, setIssueType] = useState('Damaged');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchData = async () => {
    try {
      const [invRes, assetRes] = await Promise.all([
        inventoryApi.getDeptInventory(deptId),
        inventoryApi.getDeptAssets(deptId),
      ]);
      const inv = invRes.data?.inventory || [];
      setInventory(inv);
      if (inv.length > 0 && !selectedResId) {
        setSelectedResId(inv[0].resource_id);
      }
      setAssets(assetRes.data?.assets || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deptId]);

  const selectedItem = inventory.find((i) => i.resource_id === selectedResId);
  const relevantAssets = assets.filter((a) => a.resource_id === selectedResId && a.status === 'Allocated');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await maintenanceApi.reportDamage({
        department_id: deptId,
        resource_id: selectedResId,
        quantity,
        asset_id: selectedAssetId || undefined,
        issue_type: issueType,
        description,
      });
      setMessage({ text: `Maintenance Ticket #${res.data?.ticket?.ticket_id} created. Item logged for technical repair!`, type: 'success' });
      setDescription('');
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to submit report', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-2">
          <Wrench className="w-5 h-5 text-rose-600" />
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Report Damaged / Non-Working Resource</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Department of {deptId} • Non-functional items are automatically deducted from available working inventory and routed to the central maintenance division.
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
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Select Affected Equipment</label>
            <select
              value={selectedResId}
              onChange={(e) => {
                setSelectedResId(e.target.value);
                setSelectedAssetId('');
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              {inventory.map((i) => (
                <option key={i.resource_id} value={i.resource_id}>
                  {i.resource_name} (Working: {i.working_quantity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Issue Classification</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Damaged">Damaged (Physical Breakage)</option>
                <option value="Malfunctioning">Malfunctioning (Power/Boot Failure)</option>
                <option value="Missing">Missing / Unaccounted</option>
                <option value="Routine Maintenance">Routine Maintenance Required</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Defective Quantity</label>
              <input
                type="number"
                min="1"
                max={selectedItem?.working_quantity || 50}
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          {relevantAssets.length > 0 && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Specific Asset ID / Serial Number (Optional)
              </label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              >
                <option value="">-- Choose specific serial if known --</option>
                {relevantAssets.map((a) => (
                  <option key={a.asset_id} value={a.asset_id}>
                    {a.asset_id} ({a.serial_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Technical Fault Description</label>
            <textarea
              rows="3"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail symptoms: e.g. SMPS blown, monitor displays horizontal flicker, table leg bent..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <Wrench className="w-4 h-4" />
            <span>Submit Damage Report to Maintenance Depot</span>
          </button>
        </form>
      </div>
    </div>
  );
};
