import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Landing & Common Auth
import { LandingPage } from './pages/landing/LandingPage';
import { Unauthorized } from './pages/auth/Unauthorized';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Admin Portal Pages
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminRegister } from './pages/admin/AdminRegister';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CentralInventory } from './pages/admin/CentralInventory';
import { DepartmentManagement } from './pages/admin/DepartmentManagement';
import { CycleManagement } from './pages/admin/CycleManagement';
import { RequestReview } from './pages/admin/RequestReview';
import { InterdeptTransfers } from './pages/admin/InterdeptTransfers';
import { MaintenanceRecords } from './pages/admin/MaintenanceRecords';
import { MLPredictions } from './pages/admin/MLPredictions';
import { ReportsAnalytics } from './pages/admin/ReportsAnalytics';
import { AuditLogs } from './pages/admin/AuditLogs';

// HOD Portal Pages
import { HODLogin } from './pages/hod/HODLogin';
import { HODRegister } from './pages/hod/HODRegister';
import { HodDashboard } from './pages/hod/HodDashboard';
import { SubmitCycleRequest } from './pages/hod/SubmitCycleRequest';
import { UrgentRequest } from './pages/hod/UrgentRequest';
import { DepartmentInventory } from './pages/hod/DepartmentInventory';
import { TransferRequest } from './pages/hod/TransferRequest';
import { RecordUsage } from './pages/hod/RecordUsage';
import { HodPredictions } from './pages/hod/HodPredictions';

// Staff Portal Pages
import { StaffLogin } from './pages/staff/StaffLogin';
import { StaffRegister } from './pages/staff/StaffRegister';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import { StaffUsageLog } from './pages/staff/StaffUsageLog';
import { DamageReport } from './pages/staff/DamageReport';
import { MaintenanceRequest } from './pages/staff/MaintenanceRequest';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Main Landing & Common Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* =========================================
              ADMIN PORTAL
              ========================================= */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/register" element={<AdminRegister />} />
          
          <Route element={<ProtectedRoute allowedRoles={['Admin']} portalRole="Admin" />}>
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/inventory" element={<CentralInventory />} />
            <Route path="/admin/departments" element={<DepartmentManagement />} />
            <Route path="/admin/cycles" element={<CycleManagement />} />
            <Route path="/admin/requests" element={<RequestReview />} />
            <Route path="/admin/transfers" element={<InterdeptTransfers />} />
            <Route path="/admin/maintenance" element={<MaintenanceRecords />} />
            <Route path="/admin/predictions" element={<MLPredictions />} />
            <Route path="/admin/reports" element={<ReportsAnalytics />} />
            <Route path="/admin/audit" element={<AuditLogs />} />
          </Route>

          {/* =========================================
              HOD PORTAL
              ========================================= */}
          <Route path="/hod/login" element={<HODLogin />} />
          <Route path="/hod/register" element={<HODRegister />} />

          <Route element={<ProtectedRoute allowedRoles={['HOD']} portalRole="HOD" />}>
            <Route path="/hod" element={<Navigate to="/hod/dashboard" replace />} />
            <Route path="/hod/dashboard" element={<HodDashboard />} />
            <Route path="/hod/inventory" element={<DepartmentInventory />} />
            <Route path="/hod/submit-request" element={<SubmitCycleRequest />} />
            <Route path="/hod/urgent-request" element={<UrgentRequest />} />
            <Route path="/hod/transfer" element={<TransferRequest />} />
            <Route path="/hod/record-usage" element={<RecordUsage />} />
            <Route path="/hod/predictions" element={<HodPredictions />} />
          </Route>

          {/* =========================================
              STAFF PORTAL
              ========================================= */}
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff/register" element={<StaffRegister />} />

          <Route element={<ProtectedRoute allowedRoles={['Staff']} portalRole="Staff" />}>
            <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
            <Route path="/staff/usage" element={<StaffUsageLog />} />
            <Route path="/staff/damage-report" element={<DamageReport />} />
            <Route path="/staff/maintenance" element={<MaintenanceRequest />} />
          </Route>

          {/* Catch-all redirect to Landing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
