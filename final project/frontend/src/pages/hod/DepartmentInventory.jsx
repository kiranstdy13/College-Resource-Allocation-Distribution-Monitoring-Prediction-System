import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { inventoryApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  PackageSearch,
  Boxes,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ActivitySquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DepartmentInventory = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [inventory, setInventory] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' or 'assets'

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, assetRes] = await Promise.all([
        inventoryApi.getDeptInventory(deptId),
        inventoryApi.getDeptAssets(deptId),
      ]);
      setInventory(invRes.data?.inventory || []);
      setAssets(assetRes.data?.assets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deptId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {deptId} Department Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time balance of resources allocated from Central Inventory, working health, and individual asset tracking.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/hod/record-usage"
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
          >
            <ActivitySquare className="w-3.5 h-3.5" />
            <span>Update Usage / Utilization</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'inventory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock Summary ({inventory.length} Resources)</span>
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'assets'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Assigned Durable Assets ({assets.length} Units)</span>
        </button>
      </div>

      {activeTab === 'inventory' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4 text-center">Received Total</th>
                  <th className="py-3 px-4 text-center">Working Health</th>
                  <th className="py-3 px-4 text-center">Actively Used</th>
                  <th className="py-3 px-4 text-center">Unused (Surplus)</th>
                  <th className="py-3 px-4 text-center">Maint / Damaged</th>
                  <th className="py-3 px-4 text-center">Utilization Rate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => (
                  <tr key={item.resource_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{item.resource_name}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.resource_id} • {item.is_durable ? 'Durable Asset' : 'Consumable Stock'}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {item.received_quantity}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.working_quantity}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-bold text-indigo-700">
                      {item.actively_used_quantity}
                    </td>

                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                      {item.unused_quantity}
                    </td>

                    <td className="py-3.5 px-4 text-center text-xs">
                      <span className="text-purple-600 font-bold">{item.under_maintenance_quantity || 0}</span>
                      <span> / </span>
                      <span className="text-rose-600 font-bold">{item.damaged_quantity || 0}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, item.quantity_utilization_pct || 0)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-800 text-xs">{item.quantity_utilization_pct}%</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to="/hod/transfer"
                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold mr-1"
                      >
                        Transfer
                      </Link>
                      <Link
                        to="/hod/record-usage"
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold"
                      >
                        Log Use
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Durable Asset Tracking List */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">Asset ID</th>
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">Resource ID</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Allocated Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400 font-sans text-xs">
                      No durable asset serials assigned to {deptId} yet.
                    </td>
                  </tr>
                ) : (
                  assets.map((a) => (
                    <tr key={a.asset_id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-indigo-700">{a.asset_id}</td>
                      <td className="py-3 px-4 text-slate-700">{a.serial_number}</td>
                      <td className="py-3 px-4 text-slate-600">{a.resource_id}</td>
                      <td className="py-3 px-4 font-sans text-xs">{a.condition || 'Good'}</td>
                      <td className="py-3 px-4 font-sans text-xs">
                        <StatusBadge status={a.status} size="xs" />
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                        {a.allocation_date ? new Date(a.allocation_date).toLocaleDateString() : 'Initial Allocation'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
