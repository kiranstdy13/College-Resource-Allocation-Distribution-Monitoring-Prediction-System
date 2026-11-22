import React, { useState, useEffect } from 'react';
import { mlApi, departmentApi } from '../../api/client';
import {
  BrainCircuit,
  TrendingUp,
  Cpu,
  RefreshCw,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart2,
  Layers,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const MLPredictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [deptFilter, setDeptFilter] = useState('All');
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [predRes, evalRes] = await Promise.all([
        mlApi.predict(),
        mlApi.evaluation(),
      ]);
      setPredictions(predRes.data?.predictions || []);
      setMetrics(evalRes.data?.evaluation || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetrain = async () => {
    setTraining(true);
    setMessage({ text: 'Executing ML pipeline (Feature extraction, Train/Test split, 3-model cross-evaluation)...', type: 'info' });
    try {
      const res = await mlApi.train();
      setMessage({ text: 'ML Models retrained successfully! Winner selected based on lowest RMSE.', type: 'success' });
      fetchData();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Training failed', type: 'error' });
    } finally {
      setTraining(false);
    }
  };

  const filteredPredictions = predictions.filter(
    (p) => deptFilter === 'All' || p.department_id === deptFilter
  );

  // Group for visualization: resource demand across departments
  const resourceNames = [...new Set(predictions.map((p) => p.resource_name))];
  const chartData = resourceNames.map((resName) => {
    const row = { resource: resName };
    predictions.filter((p) => p.resource_name === resName).forEach((p) => {
      row[p.department_id] = p.predicted_demand;
    });
    return row;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Machine Learning Demand Prediction
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase">
              Scikit-Learn Powered
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Predictive modeling of next 6-month departmental requirements based on historical cycles, student enrollment growth and utilization rates.
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={training}
          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center space-x-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${training ? 'animate-spin' : ''}`} />
          <span>{training ? 'Training Models...' : 'Retrain & Evaluate Models'}</span>
        </button>
      </div>

      {message.text && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : message.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Model Benchmark Comparison Table */}
      {metrics && metrics.metrics && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Algorithm Benchmark & Model Selection</h3>
                <p className="text-xs text-slate-400">
                  Trained on {metrics.dataset_size} historical college cycle records ({metrics.training_samples} train / {metrics.test_samples} test split).
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
              <span className="text-slate-300">Active Winner:</span>
              <strong className="text-emerald-400 font-extrabold">{metrics.selected_model}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            {Object.entries(metrics.metrics).map(([name, m]) => {
              const isSelected = name === metrics.selected_model;
              return (
                <div
                  key={name}
                  className={`rounded-xl p-4 border transition-all ${
                    isSelected
                      ? 'bg-purple-900/40 border-purple-400/80 shadow-md ring-1 ring-purple-400/50'
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs text-white">{name}</h4>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        BEST FIT
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-semibold">MAE</span>
                      <strong className="text-white font-mono text-xs">{m.mae}</strong>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-semibold">RMSE</span>
                      <strong className="text-amber-400 font-mono text-xs">{m.rmse}</strong>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2">
                      <span className="text-[10px] text-slate-400 block font-semibold">R² Score</span>
                      <strong className="text-emerald-400 font-mono text-xs">{m.r2}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual Chart: Predicted Demand Across Departments */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Predicted Demand Distribution by Resource</h3>
            <p className="text-xs text-slate-500">Next 6-month projected allocation requirement</p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="resource" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="MCA" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="MBA" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              <Bar dataKey="MTech" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Predictions Detail Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Predicted Resource Requirements</h3>
            <p className="text-xs text-slate-500">Individual department projections with recommendation rationale</p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-semibold text-slate-500">Filter Department:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800"
            >
              <option value="All">All Departments</option>
              <option value="MCA">MCA</option>
              <option value="MBA">MBA</option>
              <option value="MTech">MTech</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Resource</th>
                <th className="py-3 px-4 text-center">Student Strength</th>
                <th className="py-3 px-4 text-center">Current Working</th>
                <th className="py-3 px-4 text-center">Predicted Demand</th>
                <th className="py-3 px-4 text-center">Model Confidence</th>
                <th className="py-3 px-4">Decision Support Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPredictions.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-indigo-700 text-sm">{p.department_id}</td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{p.resource_name}</p>
                    <p className="text-[11px] text-slate-400">{p.category}</p>
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-800">
                    {p.student_strength} students
                  </td>
                  <td className="py-3.5 px-4 text-center text-slate-700 font-medium">
                    {p.current_working} {p.unit}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="font-extrabold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 text-xs inline-block">
                      {p.predicted_demand} {p.unit}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 text-xs">
                      {Math.round(p.confidence_score * 100)}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 max-w-sm text-slate-600 leading-relaxed text-[11px]">
                    {p.rationale}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Disclaimer */}
        <div className="bg-slate-50/70 p-3.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            <strong>Institutional Governance Standard:</strong> Machine Learning recommendations are strictly advisory and provide quantitative guidance. In accordance with system safety constraints, models cannot automatically transfer inventory without authorized Admin approval.
          </span>
        </div>
      </div>
    </div>
  );
};
