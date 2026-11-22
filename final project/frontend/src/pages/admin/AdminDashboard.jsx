import React, { useState, useEffect } from 'react';
import { resourceApi, departmentApi, requestApi, allocationApi, cycleApi, mlApi } from '../../api/client';
import { StatCard } from '../../components/StatCard';
import { ShortageAlert } from '../../components/ShortageAlert';
import { StatusBadge } from '../../components/StatusBadge';
import { UserApprovalSection } from '../../components/UserApprovalSection';
import {
  Boxes,
  Building2,
  FileCheck2,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  BrainCircuit,
  ArrowRight,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [shortages, setShortages] = useState([]);
  const [activeCycle, setActiveCycle] = useState(null);
  const [predictions, setPredictions] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resData, deptData, reqData, shortData, cycleData, mlData] = await Promise.all([
        resourceApi.getAll(),
        departmentApi.getAll(),
        requestApi.getAll(),
        allocationApi.getShortageSummary(),
        cycleApi.getActive(),
        mlApi.predict(),
      ]);

      setResources(resData.data?.resources || []);
      setDepartments(deptData.data?.departments || []);
      setRequests(reqData.data?.requests || []);
      setShortages(shortData.data?.summary || []);
      setActiveCycle(cycleData.data?.cycle);
      setPredictions(mlData.data?.predictions?.slice(0, 5) || []);
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute aggregate numbers
  const totalStock = resources.reduce((acc, r) => acc + (r.total_quantity || 0), 0);
  const totalAllocated = resources.reduce((acc, r) => acc + (r.allocated_quantity || 0), 0);
  const totalAvailable = resources.reduce((acc, r) => acc + (r.available_quantity || 0), 0);
  const totalDamaged = resources.reduce((acc, r) => acc + (r.damaged_quantity || 0), 0);
  const totalUnderMaint = resources.reduce((acc, r) => acc + (r.under_maintenance_quantity || 0), 0);
  const pendingRequestsCount = requests.filter((r) => r.status === 'Submitted' || r.status === 'Under Review').length;

  // Chart data: Department comparison
  const deptChartData = departments.map((d) => ({
    name: d.dept_id,
    Allocated: d.inventory_summary?.total_allocated || 0,
    Working: d.inventory_summary?.total_working || 0,
    ActiveUse: d.inventory_summary?.total_actively_used || 0,
    Damaged: d.inventory_summary?.total_damaged || 0,
  }));

  // Chart data: Central stock breakdown
  const stockBreakdownData = [
    { name: 'Available Central Stock', value: totalAvailable, color: '#10b981' },
    { name: 'Allocated to Departments', value: totalAllocated, color: '#6366f1' },
    { name: 'Under Maintenance', value: totalUnderMaint, color: '#a855f7' },
    { name: 'Damaged / Unusable', value: totalDamaged, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Aggregating Central College Metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Cycle Status */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Central College Resource Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monitoring, 6-month allocation cycle management, and predictive planning.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 text-xs flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/requests"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Process Allocations ({pendingRequestsCount})</span>
          </Link>
        </div>
      </div>

      {/* Shortage Alert */}
      <ShortageAlert shortages={shortages} />

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Central Stock"
          value={totalStock}
          subtitle={`${resources.length} unique catalog items`}
          icon={Boxes}
          color="brand"
        />
        <StatCard
          title="Available in Depot"
          value={totalAvailable}
          subtitle="Ready for distribution"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Allocated to Depts"
          value={totalAllocated}
          subtitle={`Across ${departments.length} departments`}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Pending Demands"
          value={pendingRequestsCount}
          subtitle="Awaiting admin decision"
          icon={FileCheck2}
          color="amber"
        />
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Allocation Comparison Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Department Resource Allocation & Usage</h3>
              <p className="text-xs text-slate-500">Comparison of allocated, working and active utilization</p>
            </div>
            <Link to="/admin/reports" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View Report →
            </Link>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Allocated" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Working" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="ActiveUse" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Damaged" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Central Inventory Stock Breakdown Pie Chart */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Inventory Distribution State</h3>
            <p className="text-xs text-slate-500">Central stock vs commitments</p>
          </div>
          <div className="h-52 w-full my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stockBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {stockBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '10px', color: '#fff', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
            {stockBreakdownData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                  {item.name}
                </span>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Registration Requests & Account Approvals */}
      <UserApprovalSection />

      {/* Machine Learning Demand Forecast Preview */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">ML-Based Next Cycle Demand Forecast</h3>
              <p className="text-xs text-slate-500">
                Advisory predictions powered by Gradient Boosting Regressor trained on historical records.
              </p>
            </div>
          </div>
          <Link
            to="/admin/predictions"
            className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center space-x-1"
          >
            <span>Full ML Model Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-y border-slate-100 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Resource</th>
                <th className="py-2.5 px-4">Student Strength</th>
                <th className="py-2.5 px-4">Current Working</th>
                <th className="py-2.5 px-4">Predicted Demand</th>
                <th className="py-2.5 px-4">Confidence</th>
                <th className="py-2.5 px-4">Recommendation Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {predictions.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{p.department_id}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{p.resource_name}</td>
                  <td className="py-3 px-4">{p.student_strength} students</td>
                  <td className="py-3 px-4">{p.current_working} {p.unit}</td>
                  <td className="py-3 px-4">
                    <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                      {p.predicted_demand} {p.unit}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-emerald-600 font-semibold">{Math.round(p.confidence_score * 100)}%</td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-500" title={p.rationale}>
                    {p.rationale}
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
