import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';

import { ProtectedRoute } from '@/components/auth/protected-route';
import { AuthLayout } from '@/components/layout/auth-layout';
import { AuthInitializer } from '@/components/auth/auth-initializer';
import { LoginPage } from '@/features/auth/pages/login-page';
import { ActivateAccountPage } from '@/features/auth/pages/activate-page';
import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page';
import { ResetPasswordPage } from '@/features/auth/pages/reset-password-page';
import { Toaster } from '@/components/ui/toaster';

// Pages
import { AdminDashboardPage } from '@/features/dashboard/pages/admin-dashboard-page';
import { EmployeeListPage } from '@/features/employees/pages/employee-list-page';
import { EmployeeCreatePage } from '@/features/employees/pages/employee-create-page';
import { EmployeeEditPage } from '@/features/employees/pages/employee-edit-page';
import { EmployeeDetailPage } from '@/features/employees/pages/employee-detail-page';
import { EmployeeProfilePage } from '@/features/employees/pages/employee-profile-page';
import { EmployeeDirectoryPage } from '@/features/employees/pages/employee-directory-page';
import { EmployeeDirectoryProfilePage } from '@/features/employees/pages/employee-directory-profile-page';
import { EmployeeDashboardPage } from '@/features/dashboard/pages/employee-dashboard-page';
import { EmployeeNotificationsPage } from '@/features/notifications/pages/employee-notifications-page';
import { AdminAttendancePage } from '@/features/attendance/pages/admin-attendance-page';
import { EmployeeAttendancePage } from '@/features/attendance/pages/employee-attendance-page';
import { AdminLeavePage } from '@/features/leave/pages/admin-leave-page';
import { EmployeeLeavePage } from '@/features/leave/pages/employee-leave-page';
import { AdminPayrollPage } from '@/features/payroll/pages/admin-payroll-page';
import { EmployeePayslipsPage } from '@/features/payroll/pages/employee-payslips-page';
import { AdminExpensePage } from '@/features/expense/pages/admin-expense-page';
import { EmployeeExpensePage } from '@/features/expense/pages/employee-expense-page';
import { AdminPerformancePage } from '@/features/performance/pages/admin-performance-page';
import { EmployeePerformancePage } from '@/features/performance/pages/employee-performance-page';
import { AdminDocumentsPage } from '@/features/documents/pages/admin-documents-page';
import { EmployeeDocumentsPage } from '@/features/documents/pages/employee-documents-page';
import { AdminReportsPage } from '@/features/reports/pages/admin-reports-page';
import { EmployeeTimesheetPage } from '@/features/timesheet/pages/employee-timesheet-page';
import { AdminSettingsPage } from '@/features/settings/pages/admin-settings-page';
import { AdminDepartmentsPage } from '@/features/departments/pages/admin-departments-page';
import { OnboardingPage } from '@/features/onboarding/pages/onboarding-page';
import { AdminAnnouncementsPage } from '@/features/dashboard/pages/admin-announcements-page';
import { AdminTicketsPage } from '@/features/helpdesk/pages/admin-tickets-page';
import { EmployeeTicketsPage } from '@/features/helpdesk/pages/employee-tickets-page';
import { AdminCompliancePage } from '@/features/compliance/pages/admin-compliance-page';
import { AdminSurveysPage } from '@/features/surveys/pages/admin-surveys-page';
import { EmployeeSurveysPage } from '@/features/surveys/pages/employee-surveys-page';
import { AdminRecognitionPage } from '@/features/recognition/pages/admin-recognition-page';
import { PolicyManagementPage } from '@/features/settings/pages/policy-management-page';

// ── Placeholder Pages ────
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="text-center">
      <h1 className="font-display text-page-title text-text mb-2">{title}</h1>
      <p className="text-text-muted font-body">Coming in the next phase...</p>
    </div>
  </div>
);

// Auth Placeholder
const AuthPlaceholder = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <AuthLayout title={title} subtitle={subtitle}>
    <div className="text-center py-8">
      <p className="text-text-muted">Form implementation coming in Phase 3</p>
    </div>
  </AuthLayout>
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false } },
});

import { OfflineBanner } from '@/components/pwa/offline-banner';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineBanner />
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
          <Route path="/activate" element={<ActivateAccountPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Onboarding Route */}
          <Route 
            path="/onboarding" 
            element={
              <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                <OnboardingPage />
              </ProtectedRoute>
            } 
          />

          {/* HR Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['HR_ADMIN', 'EMPLOYEE']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/employees" 
            element={
              <ProtectedRoute allowedRoles={['HR_ADMIN', 'EMPLOYEE']}>
                <EmployeeListPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/employees/new" 
            element={
              <ProtectedRoute allowedRoles={['HR_ADMIN']}>
                <EmployeeCreatePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/employees/:id" 
            element={
              <ProtectedRoute allowedRoles={['HR_ADMIN', 'EMPLOYEE']}>
                <EmployeeDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/employees/:id/edit" 
            element={
              <ProtectedRoute allowedRoles={['HR_ADMIN']}>
                <EmployeeEditPage />
              </ProtectedRoute>
            } 
          />
          <Route element={<ProtectedRoute allowedRoles={['HR_ADMIN']} />}>
            <Route path="/admin/attendance" element={<AdminAttendancePage />} />
            <Route path="/admin/leave" element={<AdminLeavePage />} />
            <Route path="/admin/payroll" element={<AdminPayrollPage />} />
            <Route path="/admin/expenses" element={<AdminExpensePage />} />
            <Route path="/admin/performance" element={<AdminPerformancePage />} />
            <Route path="/admin/documents/policies" element={<AdminDocumentsPage />} />
            <Route path="/admin/company-policies" element={<PolicyManagementPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/departments" element={<AdminDepartmentsPage />} />
            <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
            <Route path="/admin/helpdesk" element={<AdminTicketsPage />} />
            <Route path="/admin/compliance" element={<AdminCompliancePage />} />
            <Route path="/admin/surveys" element={<AdminSurveysPage />} />
            <Route path="/admin/recognition" element={<AdminRecognitionPage />} />
          </Route>

          {/* Employee Routes */}
          <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
            <Route path="/employee/timesheet" element={<EmployeeTimesheetPage />} />
            <Route path="/employee/profile" element={<EmployeeProfilePage />} />
            <Route path="/employee/employees" element={<EmployeeDirectoryPage />} />
            <Route path="/employee/employees/:id" element={<EmployeeDirectoryProfilePage />} />
            <Route path="/employee/attendance" element={<EmployeeAttendancePage />} />
            <Route path="/employee/leave" element={<EmployeeLeavePage />} />
            <Route path="/employee/payslips" element={<EmployeePayslipsPage />} />
            <Route path="/employee/expenses" element={<EmployeeExpensePage />} />
            <Route path="/employee/performance" element={<EmployeePerformancePage />} />
            <Route path="/employee/documents" element={<EmployeeDocumentsPage />} />
            <Route path="/employee/notifications" element={<EmployeeNotificationsPage />} />
            <Route path="/employee/helpdesk" element={<EmployeeTicketsPage />} />
            <Route path="/employee/surveys" element={<EmployeeSurveysPage />} />
          </Route>

          {/* Default Redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<AuthPlaceholder title="404" subtitle="Page not found" />} />
        </Routes>
        </AuthInitializer>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
