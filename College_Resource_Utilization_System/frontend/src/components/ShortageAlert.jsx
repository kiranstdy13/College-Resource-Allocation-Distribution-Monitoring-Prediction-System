import React from 'react';
import { AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ShortageAlert = ({ shortages = [], onReviewClick }) => {
  const activeShortages = shortages.filter((s) => s.has_shortage);

  if (activeShortages.length === 0) {
    return (
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-emerald-900">Central Inventory Stock Balanced</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Available central quantities satisfy all active departmental requirements without deficit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm animate-pulse">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-sm sm:text-base font-bold text-slate-900">
                Resource Shortage Warning ({activeShortages.length} Item Deficit)
              </h4>
              <span className="rounded-full bg-rose-100 text-rose-800 px-2 py-0.5 text-xs font-semibold">
                Action Required
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Total departmental demand exceeds central warehouse available stock. In accordance with college policy,
              arbitrary allocation is prevented. Admin must make a justified full, partial or deferred approval decision.
            </p>
          </div>
        </div>

        {onReviewClick ? (
          <button
            onClick={onReviewClick}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            <span>Review Shortages</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <Link
            to="/admin/requests"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
          >
            <span>Review & Allocate</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Shortage breakdown pills */}
      <div className="mt-4 pt-3 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {activeShortages.map((s) => (
          <div key={s.resource_id} className="bg-white/80 rounded-xl p-3 border border-amber-200/80 text-xs">
            <div className="flex justify-between items-center font-semibold text-slate-800">
              <span>{s.resource_name}</span>
              <span className="text-rose-600 font-bold">Deficit: -{s.shortage} {s.unit}</span>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-slate-500">
              <span>Available: <strong className="text-slate-800">{s.central_available}</strong></span>
              <span>Requested: <strong className="text-slate-800">{s.total_requested}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
