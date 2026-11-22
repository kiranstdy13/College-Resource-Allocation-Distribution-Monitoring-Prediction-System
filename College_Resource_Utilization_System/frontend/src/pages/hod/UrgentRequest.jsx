import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requestApi, resourceApi } from '../../api/client';
import {
  Flame,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Boxes,
  HelpCircle,
  Building2,
} from 'lucide-react';

export const UrgentRequest = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('COMP');
  const [quantity, setQuantity] = useState(10);
  const [purpose, setPurpose] = useState('Mid-semester student strength expansion in lab section B');
  const [justification, setJustification] = useState('Enrolled students increased from 105 to 120. Immediate seating deficit.');
  const [transferCheck, setTransferCheck] = useState(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await resourceApi.getAll();
        setResources(res.data?.resources || []);
        if (res.data?.resources?.length > 0) {
          setSelectedResourceId(res.data.resources[0].resource_id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchResources();
  }, []);

  // When resource changes, run transfer and stock availability check
  useEffect(() => {
    if (!selectedResourceId) return;
    const runCheck = async () => {
      setLoadingCheck(true);
      try {
        const res = await requestApi.checkUrgentTransfer(selectedResourceId);
        setTransferCheck(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCheck(false);
      }
    };
    runCheck();
  }, [selectedResourceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestApi.submit({
        cycle_id: 'MID-CYCLE-URGENT',
        is_urgent: true,
        items: [
          {
            resource_id: selectedResourceId,
            requested_quantity: quantity,
            purpose,
            priority: 'Critical',
            justification,
          },
        ],
      });
      setMessage({
        text: 'Urgent mid-cycle requisition logged! Admin notified with stock & potential transfer options.',
        type: 'success',
      });
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to submit urgent request', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Urgent Additional Resource Request
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold flex items-center">
              <Flame className="w-3 h-3 mr-1" /> MID-CYCLE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Department of {deptId} • Requisition urgent stock outside the scheduled 6-month cycle due to unexpected enrollment or lab needs.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Needed Resource</label>
              <select
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              >
                {resources.map((r) => (
                  <option key={r.resource_id} value={r.resource_id}>
                    {r.name} ({r.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Urgent Quantity Needed</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority Classification</label>
                <input
                  type="text"
                  disabled
                  value="Critical (Immediate Review)"
                  className="w-full p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operational Purpose</label>
              <input
                type="text"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Detailed Emergency Justification
              </label>
              <textarea
                rows="4"
                required
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explain why this requirement cannot wait until the next regular 6-month cycle..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-md shadow-rose-600/20 transition-all flex items-center justify-center space-x-2"
            >
              <Flame className="w-4 h-4" />
              <span>Submit Urgent Request to Admin</span>
            </button>
          </form>
        </div>

        {/* Real-Time Stock & Transfer Feasibility Intelligence */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between text-xs space-y-4">
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Boxes className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Distribution Feasibility Intelligence</h3>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Before submitting, the system inspects Central Warehouse stock and checks whether other college departments hold unused surplus for interdepartmental transfer.
            </p>

            {loadingCheck ? (
              <p className="text-slate-400 py-6 text-center">Checking college balances...</p>
            ) : transferCheck ? (
              <div className="mt-4 space-y-3">
                {/* Central stock availability */}
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Central Warehouse Depot</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-medium text-slate-700">Available Stock:</span>
                    <strong className="text-emerald-700 font-extrabold text-sm">
                      {transferCheck.central_available} units
                    </strong>
                  </div>
                </div>

                {/* Other departments surplus check */}
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Interdepartmental Surplus</span>
                  {transferCheck.department_surplus && transferCheck.department_surplus.length > 0 ? (
                    <div className="mt-2 space-y-1.5">
                      {transferCheck.department_surplus.map((surplus) => (
                        <div key={surplus.department_id} className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-800">{surplus.department_id}:</span>
                          <span className="text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded">
                            {surplus.unused_surplus} unused items
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">No surplus reported in other departments.</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>
              If central stock is limited, Admin can authorize an atomic direct transfer from another department possessing idle inventory.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
