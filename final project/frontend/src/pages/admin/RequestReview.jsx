import React, { useState, useEffect } from 'react';
import { requestApi, allocationApi, departmentApi, resourceApi, cycleApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { ShortageAlert } from '../../components/ShortageAlert';
import { Modal } from '../../components/Modal';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  Receipt,
  Printer,
  Sparkles,
  Flame,
  Search,
} from 'lucide-react';

export const RequestReview = () => {
  const [requests, setRequests] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' or 'receipts'
  
  // Filters
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [urgentOnly, setUrgentOnly] = useState(false);

  // Decision Modal
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decisionAction, setDecisionAction] = useState('APPROVE');
  const [approvedQty, setApprovedQty] = useState(0);
  const [adminRemarks, setAdminRemarks] = useState('');
  
  // Clarification Modal
  const [isClarifyOpen, setIsClarifyOpen] = useState(false);
  const [clarifyMessage, setClarifyMessage] = useState('');

  // Selected for execution
  const [selectedForExecution, setSelectedForExecution] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reqRes, shortRes, receiptRes] = await Promise.all([
        requestApi.getAll(),
        allocationApi.getShortageSummary(),
        allocationApi.getReceipts(),
      ]);
      setRequests(reqRes.data?.requests || []);
      setShortages(shortRes.data?.summary || []);
      setReceipts(receiptRes.data?.receipts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDecision = (req, action) => {
    setSelectedRequest(req);
    setDecisionAction(action);
    setApprovedQty(action === 'PARTIAL_APPROVE' ? Math.floor(req.requested_quantity / 2) : req.requested_quantity);
    setAdminRemarks(action === 'REJECT' ? 'Available central stock prioritized for active research labs.' : '');
    setIsDecisionOpen(true);
  };

  const handleDecisionSubmit = async (e) => {
    e.preventDefault();
    try {
      await allocationApi.decide({
        request_id: selectedRequest.request_id,
        action: decisionAction,
        approved_quantity: approvedQty,
        admin_remarks: adminRemarks,
      });
      setMessage({ text: `Request marked as ${decisionAction}`, type: 'success' });
      setIsDecisionOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Decision failed', type: 'error' });
    }
  };

  const handleOpenClarify = (req) => {
    setSelectedRequest(req);
    setClarifyMessage('');
    setIsClarifyOpen(true);
  };

  const handleClarifySubmit = async (e) => {
    e.preventDefault();
    try {
      await requestApi.clarification(selectedRequest.request_id, {
        clarification_requested: clarifyMessage,
      });
      setMessage({ text: 'Clarification query transmitted to department HOD', type: 'success' });
      setIsClarifyOpen(false);
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to request clarification', type: 'error' });
    }
  };

  const handleExecuteAllocation = async () => {
    // Collect all Approved or Partially Approved requests that have not been allocated yet
    const readyRequests = requests
      .filter((r) => ['Approved', 'Partially Approved'].includes(r.status))
      .map((r) => r.request_id);

    if (readyRequests.length === 0) {
      alert("No requests are currently in 'Approved' or 'Partially Approved' state to allocate.");
      return;
    }

    if (!window.confirm(`Execute atomic stock distribution for ${readyRequests.length} approved request(s)? This will decrement central inventory and credit departmental stores.`)) {
      return;
    }

    try {
      const res = await allocationApi.execute(readyRequests);
      setMessage({ text: res.data?.message || 'Allocations executed successfully!', type: 'success' });
      fetchData();
      setActiveTab('receipts');
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Allocation execution failed', type: 'error' });
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesDept = deptFilter === 'All' || r.department_id === deptFilter;
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    const matchesUrgent = !urgentOnly || r.is_urgent;
    return matchesDept && matchesStatus && matchesUrgent;
  });

  const readyToAllocateCount = requests.filter((r) => ['Approved', 'Partially Approved'].includes(r.status)).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Resource Request Review & Distribution
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Evaluate departmental 6-month demands against central stock, student strength, and usage records.
          </p>
        </div>

        {readyToAllocateCount > 0 && (
          <button
            onClick={handleExecuteAllocation}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5 self-start sm:self-auto animate-bounce"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm & Dispatch Stock ({readyToAllocateCount})</span>
          </button>
        )}
      </div>

      {/* Shortage Warning Banner */}
      <ShortageAlert shortages={shortages} />

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

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'requests'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Department Requirements ({requests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'receipts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Allocation Receipts ({receipts.length})</span>
        </button>
      </div>

      {activeTab === 'requests' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-500">Department:</span>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold"
                >
                  <option value="All">All Departments</option>
                  <option value="MCA">MCA</option>
                  <option value="MBA">MBA</option>
                  <option value="MTech">MTech</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold"
                >
                  <option value="All">All Statuses</option>
                  <option value="Submitted">Submitted (Pending Review)</option>
                  <option value="Approved">Approved</option>
                  <option value="Partially Approved">Partially Approved</option>
                  <option value="Allocated">Allocated</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <label className="flex items-center space-x-2 text-slate-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={urgentOnly}
                onChange={(e) => setUrgentOnly(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              />
              <span className="flex items-center text-rose-600 font-semibold">
                <Flame className="w-3.5 h-3.5 mr-1" />
                Urgent Mid-Cycle Demands Only
              </span>
            </label>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Request / Department</th>
                    <th className="py-3 px-4">Resource & Justification</th>
                    <th className="py-3 px-4 text-center">Requested Qty</th>
                    <th className="py-3 px-4 text-center">Central Stock</th>
                    <th className="py-3 px-4 text-center">Dept Existing</th>
                    <th className="py-3 px-4">Priority / Status</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map((r) => {
                    const isAllocated = r.status === 'Allocated';
                    return (
                      <tr key={r.request_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-indigo-700 text-sm">{r.department_id}</span>
                            {r.is_urgent && (
                              <span className="rounded-md bg-rose-100 text-rose-700 px-1.5 py-0.5 text-[10px] font-bold flex items-center">
                                <Flame className="w-2.5 h-2.5 mr-0.5" /> URGENT
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-slate-400 mt-0.5">{r.request_id}</p>
                          <p className="text-[11px] text-slate-500">Students: <strong>{r.student_strength}</strong></p>
                        </td>

                        <td className="py-3.5 px-4 max-w-sm">
                          <p className="font-bold text-slate-900">{r.resource_name}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5 leading-snug line-clamp-2" title={r.justification}>
                            <strong className="text-slate-700">Justification: </strong>{r.justification || 'None stated'}
                          </p>
                          {r.admin_remarks && (
                            <p className="text-amber-800 bg-amber-50 rounded p-1 text-[11px] mt-1 border border-amber-200">
                              <strong>Admin Note: </strong>{r.admin_remarks}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="font-bold text-slate-900 text-sm">{r.requested_quantity}</span>
                          {r.approved_quantity > 0 && r.approved_quantity !== r.requested_quantity && (
                            <p className="text-[10px] text-amber-700 font-semibold">
                              Approved: {r.approved_quantity}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                            r.central_available < r.requested_quantity ? 'text-rose-700 bg-rose-50 font-bold' : 'text-emerald-700'
                          }`}>
                            {r.central_available} avail
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center text-slate-700 text-xs font-medium">
                          {r.dept_existing_working} working
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <StatusBadge status={r.priority} size="xs" />
                            <div><StatusBadge status={r.status} size="xs" /></div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {isAllocated ? (
                            <span className="text-xs font-semibold text-emerald-600 flex items-center justify-end space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Allocated #{r.allocation_receipt}</span>
                            </span>
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleOpenDecision(r, 'APPROVE')}
                                title="Approve Full Quantity"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenDecision(r, 'PARTIAL_APPROVE')}
                                title="Partially Approve"
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold text-xs shadow-sm"
                              >
                                Partial
                              </button>
                              <button
                                onClick={() => handleOpenDecision(r, 'REJECT')}
                                title="Reject"
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-xs"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleOpenClarify(r)}
                                title="Ask Clarification"
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
                              >
                                <HelpCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Allocation Receipts Tab */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Official Allocation Receipts & Audit Vouchers</h3>
              <p className="text-xs text-slate-500">Legally verified stock transfers from Central Store to Academic Departments</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print All Receipts</span>
            </button>
          </div>

          <div className="space-y-4">
            {receipts.map((rec) => (
              <div key={rec.receipt_number} className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-indigo-700 text-sm">{rec.receipt_number}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      VERIFIED DISPATCH
                    </span>
                  </div>
                  <span className="text-slate-500">
                    Dispatched On: <strong>{new Date(rec.allocated_at).toLocaleString()}</strong> by {rec.allocated_by}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Recipient Department</span>
                    <p className="font-bold text-slate-800 text-sm">{rec.department_id}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Resource Name</span>
                    <p className="font-bold text-slate-800 text-sm">{rec.resource_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Allocated Quantity</span>
                    <p className="font-extrabold text-indigo-600 text-sm">{rec.allocated_quantity} {rec.unit}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Distribution Cycle</span>
                    <p className="font-semibold text-slate-700">{rec.cycle_id}</p>
                  </div>
                </div>

                {rec.assigned_assets && rec.assigned_assets.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Durable Serial Numbers:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {rec.assigned_assets.map((assetId) => (
                        <span key={assetId} className="font-mono bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {assetId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision Modal */}
      <Modal
        isOpen={isDecisionOpen}
        onClose={() => setIsDecisionOpen(false)}
        title={`Decision: ${selectedRequest?.department_id} - ${selectedRequest?.resource_name}`}
      >
        <form onSubmit={handleDecisionSubmit} className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between">
            <div>
              <p className="text-slate-500">Requested: <strong>{selectedRequest?.requested_quantity}</strong></p>
              <p className="text-slate-500">Available Central Stock: <strong className="text-emerald-700">{selectedRequest?.central_available}</strong></p>
            </div>
            <div>
              <p className="text-slate-500">Student Strength: <strong>{selectedRequest?.student_strength}</strong></p>
              <p className="text-slate-500">Priority: <strong>{selectedRequest?.priority}</strong></p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Decision Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDecisionAction('APPROVE')}
                className={`p-2 rounded-xl border font-bold text-center transition-all ${
                  decisionAction === 'APPROVE' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Full Approval
              </button>
              <button
                type="button"
                onClick={() => setDecisionAction('PARTIAL_APPROVE')}
                className={`p-2 rounded-xl border font-bold text-center transition-all ${
                  decisionAction === 'PARTIAL_APPROVE' ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Partial Approval
              </button>
              <button
                type="button"
                onClick={() => setDecisionAction('REJECT')}
                className={`p-2 rounded-xl border font-bold text-center transition-all ${
                  decisionAction === 'REJECT' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                Reject Request
              </button>
            </div>
          </div>

          {decisionAction === 'PARTIAL_APPROVE' && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Approved Quantity (Must be between 1 and {selectedRequest?.requested_quantity - 1})
              </label>
              <input
                type="number"
                min="1"
                max={selectedRequest?.requested_quantity - 1}
                required
                value={approvedQty}
                onChange={(e) => setApprovedQty(parseInt(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
              />
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Admin Remarks / Allocation Justification {decisionAction === 'REJECT' && <span className="text-rose-600">* (Mandatory for rejection)</span>}
            </label>
            <textarea
              rows="3"
              required={decisionAction === 'REJECT'}
              value={adminRemarks}
              onChange={(e) => setAdminRemarks(e.target.value)}
              placeholder="State rationale regarding central stock availability, student ratio, or justification..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsDecisionOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Submit Decision
            </button>
          </div>
        </form>
      </Modal>

      {/* Clarification Modal */}
      <Modal
        isOpen={isClarifyOpen}
        onClose={() => setIsClarifyOpen(false)}
        title={`Request Clarification from ${selectedRequest?.department_id} HOD`}
      >
        <form onSubmit={handleClarifySubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Message to Department HOD</label>
            <textarea
              rows="4"
              required
              value={clarifyMessage}
              onChange={(e) => setClarifyMessage(e.target.value)}
              placeholder="e.g. Please clarify if the 40 computer units are for the new AI lab or replacing older systems in Lab 2..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsClarifyOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Send Clarification Request
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
