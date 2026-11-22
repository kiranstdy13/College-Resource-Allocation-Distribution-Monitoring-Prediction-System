import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { inventoryApi, maintenanceApi, utilizationApi } from '../../api/client';
import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  ActivitySquare,
  Wrench,
  RotateCcw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StaffDashboard = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [inventory, setInventory] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, mntRes] = await Promise.all([
        inventoryApi.getDeptInventory(deptId),
        maintenanceApi.getAll({ department_id: deptId }),
      ]);
      setInventory(invRes.data?.inventory || []);
      setTickets(mntRes.data?.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [deptId]);

  const totalWorking = inventory.reduce((acc, i) => acc + (i.working_quantity || 0), 0);
  const totalInUse = inventory.reduce((acc, i) => acc + (i.actively_used_quantity || 0), 0);
  const totalDamaged = inventory.reduce((acc, i) => acc + (i.damaged_quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold">
            STAFF & LAB INCHARGE PORTAL
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold mt-1 text-white">
            {deptId} Laboratory & Resource Operations
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Logged in as <strong>{user?.name}</strong> • Authorized for equipment usage logging and damage reporting.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/staff/usage"
            className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
          >
            <ActivitySquare className="w-4 h-4" />
            <span>Record Usage</span>
          </Link>
          <Link
            to="/staff/damage-report"
            className="px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-1.5"
          >
            <Wrench className="w-4 h-4" />
            <span>Report Damage</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Operational Working"
          value={totalWorking}
          subtitle={`Available in ${deptId}`}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Actively In Use"
          value={totalInUse}
          subtitle="Currently utilized"
          icon={ActivitySquare}
          color="brand"
        />
        <StatCard
          title="Damaged / Faulty"
          value={totalDamaged}
          subtitle="Needs repair/replacement"
          icon={AlertTriangle}
          color="rose"
        />
        <StatCard
          title="Maintenance Tickets"
          value={tickets.length}
          subtitle="Logged with workshop"
          icon={Wrench}
          color="purple"
        />
      </div>

      {/* Department Inventory & Equipment Availability */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{deptId} Equipment Availability</h3>
            <p className="text-xs text-slate-500">Live operational working units and active student usage</p>
          </div>
          <Link to="/staff/usage" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Log Session Usage →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4 text-center">Allocated</th>
                <th className="py-3 px-4 text-center">Working Health</th>
                <th className="py-3 px-4 text-center">Actively Used</th>
                <th className="py-3 px-4 text-center">Damaged</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((item) => (
                <tr key={item.resource_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">
                    {item.resource_name}
                    <span className="block text-[11px] font-normal text-slate-400">{item.category}</span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-700">{item.received_quantity}</td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-emerald-700">
                    {item.working_quantity}
                  </td>
                  <td className="py-3.5 px-4 text-center font-extrabold text-indigo-700">
                    {item.actively_used_quantity}
                  </td>
                  <td className="py-3.5 px-4 text-center text-rose-600 font-bold">
                    {item.damaged_quantity || 0}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link
                      to="/staff/damage-report"
                      className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold text-xs transition-colors"
                    >
                      Report Fault
                    </Link>
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
