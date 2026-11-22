import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { requestApi, resourceApi, cycleApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  SendHorizontal,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
} from 'lucide-react';

export const SubmitCycleRequest = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [resources, setResources] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [pastRequests, setPastRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Clarification reply modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Form state
  const [items, setItems] = useState([
    {
      resource_id: 'COMP',
      requested_quantity: 10,
      purpose: 'Lab Enhancement for Curriculum Expansion',
      priority: 'High',
      justification: 'Additional systems required for hands-on student coursework.',
    },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRes, cycleRes, reqRes] = await Promise.all([
        resourceApi.getAll(),
        cycleApi.getActive(),
        requestApi.getAll({ department_id: deptId }),
      ]);
      setResources(resRes.data?.resources || []);
      setActiveCycle(cycleRes.data?.cycle);
      setPastRequests(reqRes.data?.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deptId]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        resource_id: resources[0]?.resource_id || 'COMP',
        requested_quantity: 5,
        purpose: '',
        priority: 'Medium',
        justification: '',
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeCycle) {
      setMessage({ text: 'No active distribution cycle found to submit to.', type: 'error' });
      return;
    }

    try {
      await requestApi.submit({
        cycle_id: activeCycle.cycle_code,
        is_urgent: false,
        items: items,
      });
      setMessage({ text: 'Six-month requirements submitted successfully to Central Admin!', type: 'success' });
      fetchData();
      // Reset items to single blank
      setItems([
        {
          resource_id: 'COMP',
          requested_quantity: 5,
          purpose: '',
          priority: 'Medium',
          justification: '',
        },
      ]);
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to submit requirements', type: 'error' });
    }
  };

  const handleOpenReply = (req) => {
    setSelectedRequest(req);
    setReplyText('');
    setIsReplyOpen(true);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    try {
      await requestApi.clarification(selectedRequest.request_id, {
        clarification_response: replyText,
      });
      setMessage({ text: 'Clarification reply submitted to Admin!', type: 'success' });
      setIsReplyOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Reply failed', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Six-Month Resource Requirement Submission
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Department of {deptId} • Institutional cycle requirement requisition.
          </p>
        </div>

        {activeCycle && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-xs flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <div>
              <p className="font-bold text-indigo-900">{activeCycle.name}</p>
              <p className="text-[10px] text-indigo-600 font-medium">Code: {activeCycle.cycle_code} ({activeCycle.status})</p>
            </div>
          </div>
        )}
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

      {/* Submission Form */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Specify Department Demands</h3>
            <p className="text-xs text-slate-500">Provide quantity, purpose and clear justification for Admin review</p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item Row</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Requirement #{idx + 1}</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-500 hover:text-rose-700 font-medium flex items-center space-x-1 text-[11px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Resource</label>
                    <select
                      value={item.resource_id}
                      onChange={(e) => handleItemChange(idx, 'resource_id', e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    >
                      {resources.map((r) => (
                        <option key={r.resource_id} value={r.resource_id}>
                          {r.name} ({r.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Requested Quantity</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.requested_quantity}
                      onChange={(e) => handleItemChange(idx, 'requested_quantity', parseInt(e.target.value) || 0)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                    <select
                      value={item.priority}
                      onChange={(e) => handleItemChange(idx, 'priority', e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Purpose of Requisition</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lab upgrade for Machine Learning elective"
                      value={item.purpose}
                      onChange={(e) => handleItemChange(idx, 'purpose', e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Detailed Justification</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Student intake has expanded by 15%, existing lab capacity exhausted"
                      value={item.justification}
                      onChange={(e) => handleItemChange(idx, 'justification', e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-2"
            >
              <SendHorizontal className="w-4 h-4" />
              <span>Submit All Demands to Central Admin</span>
            </button>
          </div>
        </form>
      </div>

      {/* Submitted Requests Track Record */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Submitted Requirements Status</h3>
          <p className="text-xs text-slate-500">Track approvals, partial allocations and Admin feedback</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Cycle / ID</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4 text-center">Requested Qty</th>
                <th className="py-3 px-4 text-center">Approved Qty</th>
                <th className="py-3 px-4">Priority / Status</th>
                <th className="py-3 px-4">Admin Remarks</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pastRequests.map((r) => (
                <tr key={r.request_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-mono font-bold text-slate-800">{r.request_id}</p>
                    <p className="text-[10px] text-slate-400">{r.cycle_id}</p>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{r.resource_name}</td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-800">{r.requested_quantity}</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-indigo-700">
                    {r.approved_quantity || 0}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      <StatusBadge status={r.priority} size="xs" />
                      <div><StatusBadge status={r.status} size="xs" /></div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs text-slate-600 text-[11px]">
                    {r.admin_remarks || 'Pending Admin evaluation'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {r.clarification_requested && !r.clarification_response && (
                      <button
                        onClick={() => handleOpenReply(r)}
                        className="px-2 py-1 bg-amber-500 text-white rounded-lg font-semibold text-[11px]"
                      >
                        Reply to Query
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reply Clarification Modal */}
      <Modal
        isOpen={isReplyOpen}
        onClose={() => setIsReplyOpen(false)}
        title={`Admin Query on ${selectedRequest?.resource_name}`}
      >
        <form onSubmit={handleReplySubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
            <span className="font-bold">Admin Query: </span>
            <span>{selectedRequest?.clarification_requested}</span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Your Clarification Response</label>
            <textarea
              rows="4"
              required
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Provide exact lab setup specifics or scheduling justifications..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReplyOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Transmit Response
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
