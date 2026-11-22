import React, { useState, useEffect } from 'react';
import { departmentApi } from '../../api/client';
import { Modal } from '../../components/Modal';
import {
  Building2,
  Users,
  GraduationCap,
  Plus,
  Edit,
  Boxes,
  CheckCircle,
  AlertCircle,
  PackageSearch,
} from 'lucide-react';

export const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  const [formData, setFormData] = useState({
    dept_id: '',
    name: '',
    student_strength: 100,
    staff_count: 10,
    hod_name: '',
    hod_email: '',
    description: '',
  });

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentApi.getAll();
      setDepartments(res.data?.departments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      dept_id: '',
      name: '',
      student_strength: 100,
      staff_count: 10,
      hod_name: '',
      hod_email: '',
      description: '',
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setSelectedDept(dept);
    setFormData({
      dept_id: dept.dept_id,
      name: dept.name,
      student_strength: dept.student_strength,
      staff_count: dept.staff_count,
      hod_name: dept.hod_name || '',
      hod_email: dept.hod_email || '',
      description: dept.description || '',
    });
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await departmentApi.create(formData);
      setMessage({ text: 'Department created successfully!', type: 'success' });
      setIsAddOpen(false);
      fetchDepartments();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to create department', type: 'error' });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await departmentApi.update(selectedDept.dept_id, formData);
      setMessage({ text: 'Department updated successfully!', type: 'success' });
      setIsEditOpen(false);
      fetchDepartments();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to update department', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Department Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure academic departments, manage HOD assignments and monitor student/staff strengths.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {message.text && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => {
          const inv = dept.inventory_summary || {};
          return (
            <div
              key={dept.dept_id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-extrabold">
                      {dept.dept_id}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">{dept.name}</h3>
                      <p className="text-[11px] text-slate-400 font-medium">{dept.dept_id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenEdit(dept)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-100"
                    title="Edit Department"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                  {dept.description || 'No description provided.'}
                </p>

                {/* HOD Info */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Head of Department:</span>
                  <span className="font-semibold text-slate-900">{dept.hod_name || 'Unassigned'}</span>
                </div>

                {/* Metrics */}
                <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Students</p>
                      <p className="font-bold text-slate-800">{dept.student_strength}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Faculty / Staff</p>
                      <p className="font-bold text-slate-800">{dept.staff_count}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory summary pill */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <Boxes className="w-3.5 h-3.5 text-slate-400" />
                  <span>Allocated Resources:</span>
                </span>
                <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                  {inv.total_allocated || 0} units
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Department Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Create New Department">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department ID</label>
              <input
                type="text"
                required
                placeholder="e.g. MCA, MBA, MTech"
                value={formData.dept_id}
                onChange={(e) => setFormData({ ...formData, dept_id: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Department of Computer Applications"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Student Strength</label>
              <input
                type="number"
                min="1"
                required
                value={formData.student_strength}
                onChange={(e) => setFormData({ ...formData, student_strength: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Staff Count</label>
              <input
                type="number"
                min="0"
                required
                value={formData.staff_count}
                onChange={(e) => setFormData({ ...formData, staff_count: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">HOD Full Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. Ramesh Kumar"
                value={formData.hod_name}
                onChange={(e) => setFormData({ ...formData, hod_name: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">HOD Email</label>
              <input
                type="email"
                placeholder="hod.mca@college.edu"
                value={formData.hod_email}
                onChange={(e) => setFormData({ ...formData, hod_email: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Create Department
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Department Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Department: ${selectedDept?.dept_id}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Department Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Student Strength</label>
              <input
                type="number"
                min="1"
                required
                value={formData.student_strength}
                onChange={(e) => setFormData({ ...formData, student_strength: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Staff Count</label>
              <input
                type="number"
                min="0"
                required
                value={formData.staff_count}
                onChange={(e) => setFormData({ ...formData, staff_count: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">HOD Name</label>
              <input
                type="text"
                value={formData.hod_name}
                onChange={(e) => setFormData({ ...formData, hod_name: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">HOD Email</label>
              <input
                type="email"
                value={formData.hod_email}
                onChange={(e) => setFormData({ ...formData, hod_email: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Update Department
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
