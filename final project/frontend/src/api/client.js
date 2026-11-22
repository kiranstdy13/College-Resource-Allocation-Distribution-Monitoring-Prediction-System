import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('college_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const path = window.location.pathname;
      if (!path.includes('/login') && !path.includes('/register') && path !== '/') {
        localStorage.removeItem('college_auth_token');
        localStorage.removeItem('college_auth_user');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),

  // Separate Portal Auth
  adminRegister: (data) => api.post('/auth/admin/register', data),
  adminLogin: (credentials) => api.post('/auth/admin/login', credentials),

  hodRegister: (data) => api.post('/auth/hod/register', data),
  hodLogin: (credentials) => api.post('/auth/hod/login', credentials),

  staffRegister: (data) => api.post('/auth/staff/register', data),
  staffLogin: (credentials) => api.post('/auth/staff/login', credentials),

  logout: () => api.post('/auth/logout'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
};

export const adminApi = {
  getPendingUsers: () => api.get('/admin/users/pending'),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  approveUser: (id) => api.put(`/admin/users/${id}/approve`),
  rejectUser: (id, reason) => api.put(`/admin/users/${id}/reject`, { reason }),
  suspendUser: (id) => api.put(`/admin/users/${id}/suspend`),
};

export const hodApi = {
  getProfile: () => api.get('/hod/profile'),
  getDashboard: () => api.get('/hod/dashboard'),
};

export const staffApi = {
  getProfile: () => api.get('/staff/profile'),
  getDashboard: () => api.get('/staff/dashboard'),
};

export const departmentApi = {
  getAll: () => api.get('/departments'),
  getDetail: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
};

export const resourceApi = {
  getAll: () => api.get('/resources'),
  getDetail: (id) => api.get(`/resources/${id}`),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.put(`/resources/${id}`, data),
  delete: (id) => api.delete(`/resources/${id}`),
  getAssets: (id) => api.get(`/resources/${id}/assets`),
};

export const cycleApi = {
  getAll: () => api.get('/cycles'),
  getActive: () => api.get('/cycles/active'),
  create: (data) => api.post('/cycles', data),
  updateStatus: (code, status) => api.put(`/cycles/${code}/status`, { status }),
};

export const requestApi = {
  getAll: (params) => api.get('/requests', { params }),
  submit: (data) => api.post('/requests', data),
  clarification: (id, data) => api.put(`/requests/${id}/clarification`, data),
  checkUrgentTransfer: (resourceId) => api.get(`/requests/urgent-transfer-check/${resourceId}`),
};

export const allocationApi = {
  getShortageSummary: (cycleId) => api.get('/allocations/shortage-summary', { params: { cycle_id: cycleId } }),
  decide: (data) => api.post('/allocations/decide', data),
  execute: (requestIds) => api.post('/allocations/execute', { request_ids: requestIds }),
  getReceipts: () => api.get('/allocations/receipts'),
};

export const inventoryApi = {
  getDeptInventory: (deptId) => api.get(`/inventory/department/${deptId}`),
  getDeptAssets: (deptId) => api.get(`/inventory/department/${deptId}/assets`),
  getAllDepartments: () => api.get('/inventory/all-departments'),
};

export const transferApi = {
  getAll: () => api.get('/transfers'),
  initiate: (data) => api.post('/transfers/initiate', data),
  action: (id, data) => api.put(`/transfers/${id}/action`, data),
  returnToCentral: (data) => api.post('/transfers/return-to-central', data),
};

export const utilizationApi = {
  record: (data) => api.post('/utilization/record', data),
  getDeptUtilization: (deptId) => api.get(`/utilization/department/${deptId}`),
  getCollegeSummary: () => api.get('/utilization/college-summary'),
};

export const maintenanceApi = {
  getAll: (params) => api.get('/maintenance', { params }),
  reportDamage: (data) => api.post('/maintenance/report-damage', data),
  updateStatus: (ticketId, data) => api.put(`/maintenance/${ticketId}/update-status`, data),
};

export const mlApi = {
  predict: (params) => api.get('/ml/predict', { params }),
  evaluation: () => api.get('/ml/evaluation'),
  train: () => api.post('/ml/train'),
};

export const reportApi = {
  getData: (type, deptId) => api.get('/reports/data', { params: { type, department_id: deptId } }),
  getExportUrl: (type, deptId) => `/api/reports/export-csv?type=${type}${deptId ? `&department_id=${deptId}` : ''}`,
};

export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markAllRead: () => api.put('/notifications/mark-all-read'),
};

export const auditApi = {
  getLogs: (params) => api.get('/audit', { params }),
};

export default api;
