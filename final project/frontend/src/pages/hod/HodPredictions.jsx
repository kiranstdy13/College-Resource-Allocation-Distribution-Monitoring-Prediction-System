import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mlApi } from '../../api/client';
import { Sparkles, BrainCircuit, ArrowRight, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HodPredictions = () => {
  const { user } = useAuth();
  const deptId = user?.department_id || 'MCA';
  const [predictions, setPredictions] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPreds = async () => {
      setLoading(true);
      try {
        const res = await mlApi.predict({ department_id: deptId });
        setPredictions(res.data?.predictions || []);
        setMetrics(res.data?.metrics_summary);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPreds();
  }, [deptId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              AI Demand Predictions for {deptId}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase">
              Advisory Forecasting
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Machine learning forecast of your department's upcoming resource requirements for next semester.
          </p>
        </div>

        <Link
          to="/hod/submit-request"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <span>Use in 6-Month Requisition</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Model Rationale Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Predictive Model Intelligence</h3>
            <p className="text-xs text-purple-200 mt-1 leading-relaxed max-w-3xl">
              Trained on multi-cycle college allocation and usage data. The algorithms analyze your department's
              student strength growth (+5% projected), previous actual usage rates, and equipment wear rates to
              generate suggested allocation numbers.
            </p>
          </div>
        </div>
      </div>

      {/* Predictions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {predictions.map((p, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">{p.category}</span>
                  <h3 className="font-bold text-slate-900 text-base">{p.resource_name}</h3>
                </div>
                <span className="font-extrabold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200 text-sm">
                  {p.predicted_demand} {p.unit}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Working</span>
                  <p className="font-bold text-slate-800">{p.current_working} {p.unit}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Damaged</span>
                  <p className="font-bold text-rose-600">{p.current_damaged} {p.unit}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Confidence</span>
                  <p className="font-bold text-emerald-600">{Math.round(p.confidence_score * 100)}%</p>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Forecast Rationale:</span>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{p.rationale}</p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Model: {p.model_algorithm}</span>
              <Link to="/hod/submit-request" className="font-semibold text-indigo-600 hover:text-indigo-800">
                Requisition This →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
