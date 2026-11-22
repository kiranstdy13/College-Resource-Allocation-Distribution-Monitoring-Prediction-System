import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { inventoryApi, requestApi, cycleApi, mlApi, utilizationApi } from '../../api/client';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  SendHorizontal,
  Flame,
  ActivitySquare,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const HodDashboard = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, reqRes, cycleRes, mlRes] = await Promise.all([
        inventoryApi.getDeptInventory(deptId),
        requestApi.getAll({ department_id: deptId }),
        cycleApi.getActive(),
        mlApi.predict({ department_id: deptId }),
      ]);
      setInventory(invRes.data?.inventory || []);
      setRequests(reqRes.data?.requests || []);
      setActiveCycle(cycleRes.data?.cycle);
      setPredictions(mlRes.data?.predictions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deptId]);

  const totalReceived = inventory.reduce((acc, i) => acc + (i.received_quantity || 0), 0);
  const totalWorking = inventory.reduce((acc, i) => acc + (i.working_quantity || 0), 0);
  const totalActivelyUsed = inventory.reduce((acc, i) => acc + (i.actively_used_quantity || 0), 0);
  const totalDamaged = inventory.reduce((acc, i) => acc + (i.damaged_quantity || 0), 0);
  
  const pendingRequests = requests.filter((r) => ['Submitted', 'Under Review'].includes(r.status));
  const urgentRequests = requests.filter((r) => r.is_urgent);

  const overallUtilizationPct = totalReceived > 0 ? Math.round((totalActivelyUsed / totalReceived) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
              DEPARTMENT PORTAL: {deptId}
            </span>
            {activeCycle && (
              <span className="text-indigo-200 text-xs">
                • Active Cycle: <strong>{activeCycle.cycle_code}</strong>
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold mt-1 text-white">
            {user?.department?.name || `Department of ${deptId}`}
          </h1>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            Head of Department: <strong>{user?.name}</strong> • Student Strength: <strong>{user?.department?.student_strength || 120}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/hod/submit-request"
            className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
          >
            <SendHorizontal className="w-4 h-4" />
            <span>Submit 6-Month Demands</span>
          </Link>
          <Link
            to="/hod/urgent-request"
            className="px-3.5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
          >
            <Flame className="w-4 h-4" />
            <span>Urgent Request</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Resources Received"
          value={totalReceived}
          subtitle="From Central Inventory"
          icon={Boxes}
          color="brand"
        />
        <StatCard
          title="Operational Working"
          value={totalWorking}
          subtitle={`${totalDamaged} reported damaged`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Actively In Use"
          value={totalActivelyUsed}
          subtitle={`Quantity Utilization: ${overallUtilizationPct}%`}
          icon={ActivitySquare}
          color="blue"
        />
        <StatCard
          title="Pending Requirements"
          value={pendingRequests.length}
          subtitle={`${urgentRequests.length} urgent mid-cycle`}
          icon={SendHorizontal}
          color="amber"
        />
      </div>

      {/* Two Column Grid: Current Inventory & Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Inventory Snapshot */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Current Departmental Inventory</h3>
                <p className="text-xs text-slate-500">Working status and utilization breakdown</p>
              </div>
              <Link to="/hod/inventory" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                Full Details →
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {inventory.map((item) => (
                <div key={item.resource_id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{item.resource_name}</p>
                    <p className="text-slate-400 text-[11px]">
                      Received: <strong>{item.received_quantity}</strong> • Working: <strong className="text-emerald-700">{item.working_quantity}</strong>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {item.actively_used_quantity} in use ({item.quantity_utilization_pct}%)
                    </span>
                    {item.damaged_quantity > 0 && (
                      <span className="block text-[10px] text-rose-600 font-semibold mt-0.5">
                        {item.damaged_quantity} damaged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Need to report usage or damage?</span>
            <Link to="/hod/record-usage" className="font-semibold text-indigo-600 hover:text-indigo-800">
              Record Usage Log →
            </Link>
          </div>
        </div>

        {/* Requests & Approval Status */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Cycle Resource Demands</h3>
                <p className="text-xs text-slate-500">Status of requests submitted to Central Admin</p>
              </div>
              <Link to="/hod/submit-request" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View All →
              </Link>
            </div>

            <div className="space-y-3">
              {requests.slice(0, 4).map((r) => (
                <div key={r.request_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{r.resource_name}</span>
                      {r.is_urgent && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">
                          URGENT
                        </span>
                      )}
                    </div>
                    <StatusBadge status={r.status} size="xs" />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Requested: <strong>{r.requested_quantity}</strong> units</span>
                    {r.approved_quantity > 0 && (
                      <span className="text-emerald-700 font-bold">Approved: {r.approved_quantity} units</span>
                    )}
                  </div>
                  {r.admin_remarks && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded mt-1.5 border border-amber-200">
                      <strong>Admin: </strong>{r.admin_remarks}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Next Cycle Recommendations for this Department */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Machine Learning Forecast for {deptId}</h3>
              <p className="text-xs text-slate-500">
                Recommended future demand based on student enrollment, active utilization and asset wear rate.
              </p>
            </div>
          </div>
          <Link to="/hod/predictions" className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center space-x-1">
            <span>Detailed Forecast</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {predictions.map((p, idx) => (
            <div key={idx} className="bg-purple-50/40 border border-purple-100 rounded-xl p-3.5">
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-800">{p.resource_name}</span>
                <span className="font-extrabold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200 text-xs">
                  {p.predicted_demand} {p.unit}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 line-clamp-2" title={p.rationale}>
                {p.rationale}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
