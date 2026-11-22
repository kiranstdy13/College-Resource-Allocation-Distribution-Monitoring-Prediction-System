import React, { useState, useEffect } from 'react';
import { reportApi, departmentApi } from '../../api/client';
import {
  FileText,
  Download,
  Printer,
  Table,
  Filter,
  Layers,
  Building2,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const ReportsAnalytics = () => {
  const [reportType, setReportType] = useState('central_stock');
  const [reportTitle, setReportTitle] = useState('Central Stock Inventory Report');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');

  const reportTypes = [
    { id: 'central_stock', name: 'Central Stock Report', desc: 'Complete warehouse inventory with availability calculations' },
    { id: 'department_allocation', name: 'Department-wise Allocation Report', desc: 'Historical allocations, receipt numbers and approval dates' },
    { id: 'requested_vs_approved', name: 'Requested vs Approved Quantity Report', desc: 'Audit comparison of initial requirements against decisions' },
    { id: 'utilization', name: 'Resource Utilization Report', desc: 'Quantity utilization percentages and active usage vs idle stock' },
    { id: 'damaged_maintenance', name: 'Damaged & Maintenance Report', desc: 'Breakage records, repair workflows and disposal histories' },
    { id: 'interdepartmental_transfers', name: 'Interdepartmental Transfer Report', desc: 'Asset movements and re-allocations between departments' },
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getData(reportType, selectedDept);
      setReportData(res.data?.data || []);
      setReportTitle(res.data?.title || 'College Report');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const d = await departmentApi.getAll();
        setDepartments(d.data?.departments || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedDept]);

  const handlePrint = () => {
    window.print();
  };

  const columns = reportData.length > 0 ? Object.keys(reportData[0]) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm no-print">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Institutional Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate, preview, export CSV spreadsheets and print official college resource distribution documents.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <a
            href={reportApi.getExportUrl(reportType, selectedDept)}
            download
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center space-x-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Select Report Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 no-print">
        {reportTypes.map((rt) => (
          <button
            key={rt.id}
            onClick={() => setReportType(rt.id)}
            className={`p-3.5 rounded-2xl text-left border transition-all ${
              reportType === rt.id
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm'
                : 'bg-white border-slate-200 hover:bg-slate-50/70'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText className={`w-4 h-4 ${reportType === rt.id ? 'text-indigo-600' : 'text-slate-400'}`} />
              <h4 className={`text-xs font-bold ${reportType === rt.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                {rt.name}
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{rt.desc}</p>
          </button>
        ))}
      </div>

      {/* Department Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 text-xs no-print">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600">Filter Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.dept_id} value={d.dept_id}>
                {d.dept_id} - {d.name}
              </option>
            ))}
          </select>
        </div>
        <span className="text-slate-400 text-[11px]">Showing {reportData.length} records</span>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 print:p-0 print:border-none print-container">
        {/* Printable Official Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
              COLLEGE OF ENGINEERING & MANAGEMENT
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Office of the Central Inventory Administrator • Resource Management Division
            </p>
            <h3 className="text-sm font-bold text-indigo-700 mt-2">{reportTitle}</h3>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p>Generated: <strong>{new Date().toLocaleDateString()}</strong></p>
            <p>Distribution Cycle: <strong>CYCLE-2026-H1</strong></p>
            <p className="font-mono text-[10px] text-slate-400">DOC-REF: {reportType.toUpperCase()}</p>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Generating institutional report...
          </div>
        ) : reportData.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No records found for the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-700 border-b border-slate-300 font-bold">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="py-2.5 px-3 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    {columns.map((col) => (
                      <td key={col} className="py-2.5 px-3 whitespace-nowrap text-slate-800">
                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Official Signatures for print */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-3 text-center text-xs text-slate-600">
          <div>
            <p className="font-semibold text-slate-800">Prepared By</p>
            <div className="h-10"></div>
            <p className="text-[11px] text-slate-400">System Records In-Charge</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Verified By</p>
            <div className="h-10"></div>
            <p className="text-[11px] text-slate-400">Department HOD / Representative</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800">Approved By</p>
            <div className="h-10"></div>
            <p className="text-[11px] text-slate-400">Central College Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
};
