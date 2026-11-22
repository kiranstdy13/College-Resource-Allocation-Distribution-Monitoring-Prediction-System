import React, { useState, useEffect } from 'react';
import { resourceApi } from '../../api/client';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  ListFilter,
  Barcode,
  Info,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export const CentralInventory = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [resourceAssets, setResourceAssets] = useState([]);
  
  const [formData, setFormData] = useState({
    resource_id: '',
    name: '',
    category: 'IT Equipment',
    total_quantity: 10,
    reserved_quantity: 0,
    under_maintenance_quantity: 0,
    damaged_quantity: 0,
    unit: 'Units',
    location: 'Central Warehouse',
    condition: 'Good',
    description: '',
    is_durable: true,
  });

  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await resourceApi.getAll();
      setResources(res.data?.resources || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      resource_id: '',
      name: '',
      category: 'IT Equipment',
      total_quantity: 10,
      reserved_quantity: 0,
      under_maintenance_quantity: 0,
      damaged_quantity: 0,
      unit: 'Units',
      location: 'Central IT Depot',
      condition: 'Excellent',
      description: '',
      is_durable: true,
    });
    setIsAddOpen(true);
  };

  const handleOpenEdit = (res) => {
    setSelectedResource(res);
    setFormData({
      name: res.name,
      category: res.category,
      total_quantity: res.total_quantity,
      reserved_quantity: res.reserved_quantity || 0,
      under_maintenance_quantity: res.under_maintenance_quantity || 0,
      damaged_quantity: res.damaged_quantity || 0,
      unit: res.unit,
      location: res.location || '',
      condition: res.condition || 'Good',
      description: res.description || '',
    });
    setIsEditOpen(true);
  };

  const handleOpenAssets = async (res) => {
    setSelectedResource(res);
    try {
      const r = await resourceApi.getAssets(res.resource_id);
      setResourceAssets(r.data?.assets || []);
      setIsAssetsOpen(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await resourceApi.create(formData);
      setMessage({ text: 'Resource added to central warehouse successfully!', type: 'success' });
      setIsAddOpen(false);
      fetchResources();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to create resource', type: 'error' });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await resourceApi.update(selectedResource.resource_id, formData);
      setMessage({ text: 'Resource updated successfully!', type: 'success' });
      setIsEditOpen(false);
      fetchResources();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to update resource', type: 'error' });
    }
  };

  const handleDelete = async (res) => {
    if (!window.confirm(`Are you sure you want to delete ${res.name}?`)) return;
    try {
      await resourceApi.delete(res.resource_id);
      setMessage({ text: `Resource ${res.name} deleted successfully!`, type: 'success' });
      fetchResources();
    } catch (err) {
      setMessage({ text: err.response?.data?.error || 'Failed to delete resource', type: 'error' });
    }
  };

  const filteredResources = resources.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.resource_id.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || r.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...new Set(resources.map((r) => r.category))];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Central Resource Inventory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Master college asset repository. Manages central stock, reservations and individual asset serials.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Resource</span>
        </button>
      </div>

      {/* Formula note banner */}
      <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 flex items-center space-x-3 text-xs text-indigo-900">
        <Info className="w-5 h-5 text-indigo-600 shrink-0" />
        <div>
          <span className="font-bold">Inventory Calculation Standard: </span>
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-indigo-200 text-indigo-700">
            Available = Total - Allocated - Reserved - UnderMaintenance - Damaged
          </span>
          <span className="ml-2 text-indigo-700 hidden md:inline">
            All allocations perform atomic stock deductions and prevent overselling.
          </span>
        </div>
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by resource name or ID (e.g. Computers, COMP)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">Resource ID</th>
                <th className="py-3 px-4">Name & Category</th>
                <th className="py-3 px-4 text-center">Total</th>
                <th className="py-3 px-4 text-center">Allocated</th>
                <th className="py-3 px-4 text-center">Available</th>
                <th className="py-3 px-4 text-center">Maint / Damaged</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Condition</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResources.map((r) => (
                <tr key={r.resource_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                    {r.resource_id}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{r.name}</p>
                    <div className="flex items-center space-x-1 text-[11px] text-slate-400 mt-0.5">
                      <span>{r.category}</span>
                      <span>•</span>
                      <span>{r.is_durable ? 'Durable Asset' : 'Consumable'}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                    {r.total_quantity} {r.unit}
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-blue-700">
                    {r.allocated_quantity} {r.unit}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`font-extrabold px-2 py-0.5 rounded-lg border ${
                        r.available_quantity > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {r.available_quantity} {r.unit}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center text-[11px] text-slate-500">
                    <span className="text-purple-600 font-semibold">{r.under_maintenance_quantity || 0}</span>
                    <span> / </span>
                    <span className="text-rose-600 font-semibold">{r.damaged_quantity || 0}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{r.location || 'Central Depot'}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={r.condition || 'Good'} size="xs" />
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    {r.is_durable && (
                      <button
                        onClick={() => handleOpenAssets(r)}
                        title="View Asset Serials"
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200"
                      >
                        <Barcode className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEdit(r)}
                      title="Edit Stock / Details"
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      title="Delete Resource"
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Resource Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Resource to Central Inventory">
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Resource ID</label>
              <input
                type="text"
                required
                placeholder="e.g. COMP, FAN, FILE"
                value={formData.resource_id}
                onChange={(e) => setFormData({ ...formData, resource_id: e.target.value.toUpperCase() })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Resource Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Desktop Computers"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Quantity</label>
              <input
                type="number"
                min="0"
                required
                value={formData.total_quantity}
                onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                required
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warehouse Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="New">New</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 text-slate-800 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_durable}
                onChange={(e) => setFormData({ ...formData, is_durable: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Durable Asset (Generate individual asset IDs and serial tracking)</span>
            </label>
            <p className="text-[11px] text-slate-500 ml-6 mt-0.5">
              Uncheck for consumable items (e.g. project files, stationery).
            </p>
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
              Save Resource
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Resource Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Stock: ${selectedResource?.name}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Total Central Quantity</label>
              <input
                type="number"
                min="0"
                value={formData.total_quantity}
                onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reserved Quantity</label>
              <input
                type="number"
                min="0"
                value={formData.reserved_quantity}
                onChange={(e) => setFormData({ ...formData, reserved_quantity: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Under Maintenance</label>
              <input
                type="number"
                min="0"
                value={formData.under_maintenance_quantity}
                onChange={(e) => setFormData({ ...formData, under_maintenance_quantity: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Damaged Stock</label>
              <input
                type="number"
                min="0"
                value={formData.damaged_quantity}
                onChange={(e) => setFormData({ ...formData, damaged_quantity: parseInt(e.target.value) || 0 })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Needs Repair">Needs Repair</option>
              </select>
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
              Update Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Asset Serials Modal */}
      <Modal
        isOpen={isAssetsOpen}
        onClose={() => setIsAssetsOpen(false)}
        title={`Asset Serial Register: ${selectedResource?.name}`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span>Total Registered Assets: <strong>{resourceAssets.length}</strong></span>
            <span>Allocated: <strong>{resourceAssets.filter((a) => a.status === 'Allocated').length}</strong></span>
            <span>In Store: <strong>{resourceAssets.filter((a) => a.status === 'In Central Store').length}</strong></span>
          </div>

          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Asset ID</th>
                  <th className="py-2.5 px-3">Serial Number</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Current Location / Department</th>
                  <th className="py-2.5 px-3">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resourceAssets.map((asset) => (
                  <tr key={asset.asset_id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{asset.asset_id}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{asset.serial_number}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={asset.status} size="xs" />
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {asset.current_department ? (
                        <span className="text-indigo-700 font-bold">{asset.current_department}</span>
                      ) : (
                        <span className="text-slate-400">Central Warehouse</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">{asset.condition || 'Good'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
