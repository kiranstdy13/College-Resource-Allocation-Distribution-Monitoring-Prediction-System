import React from 'react';

export const StatusBadge = ({ status, size = 'sm' }) => {
  const getStyle = (s) => {
    switch (s?.toLowerCase()) {
      case 'approved':
      case 'completed':
      case 'active':
      case 'working':
      case 'repaired & restored':
      case 'open for requests':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'partially approved':
      case 'distribution active':
      case 'under review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'submitted':
      case 'reported':
      case 'pending admin approval':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'rejected':
      case 'damaged':
      case 'missing':
      case 'written off / disposed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'under maintenance':
      case 'in repair':
      case 'malfunctioning':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'allocated':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300 font-semibold';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'draft':
      case 'closed':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const sizeClasses = size === 'xs' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${sizeClasses} ${getStyle(status)}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70"></span>
      {status || 'Unknown'}
    </span>
  );
};
