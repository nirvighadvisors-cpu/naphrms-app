// ============================================================
// NAP HRMS — RBAC Permissions Config
// ============================================================

export const PERMISSIONS = {
  // Employee Management
  EMPLOYEE_VIEW_ALL: 'employee:view_all',
  EMPLOYEE_VIEW_SELF: 'employee:view_self',
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_EDIT_ALL: 'employee:edit_all',
  EMPLOYEE_EDIT_SELF_PARTIAL: 'employee:edit_self_partial',
  EMPLOYEE_TERMINATE: 'employee:terminate',
  EMPLOYEE_INVITE: 'employee:invite',

  // Attendance
  ATTENDANCE_VIEW_ALL: 'attendance:view_all',
  ATTENDANCE_VIEW_SELF: 'attendance:view_self',
  ATTENDANCE_APPROVE: 'attendance:approve',
  ATTENDANCE_CONFIGURE: 'attendance:configure',

  // Leave
  LEAVE_VIEW_ALL: 'leave:view_all',
  LEAVE_VIEW_SELF: 'leave:view_self',
  LEAVE_APPLY: 'leave:apply',
  LEAVE_APPROVE: 'leave:approve',
  LEAVE_CONFIGURE: 'leave:configure',

  // Payroll
  PAYROLL_VIEW_ALL: 'payroll:view_all',
  PAYROLL_VIEW_SELF: 'payroll:view_self',
  PAYROLL_RUN: 'payroll:run',
  PAYROLL_CONFIGURE: 'payroll:configure',

  // Expenses
  EXPENSE_VIEW_ALL: 'expense:view_all',
  EXPENSE_SUBMIT: 'expense:submit',
  EXPENSE_APPROVE: 'expense:approve',

  // Performance
  PERFORMANCE_VIEW_ALL: 'performance:view_all',
  PERFORMANCE_SELF_REVIEW: 'performance:self_review',
  PERFORMANCE_MANAGE: 'performance:manage',

  // Documents
  DOCUMENT_VIEW_ALL: 'document:view_all',
  DOCUMENT_VIEW_SELF: 'document:view_self',
  DOCUMENT_UPLOAD_FOR_EMPLOYEE: 'document:upload_for_employee',
  DOCUMENT_UPLOAD_SELF: 'document:upload_self',
  POLICY_MANAGE: 'document:policy_manage',

  // Reports
  REPORTS_FULL: 'reports:full',

  // Settings
  SETTINGS_MANAGE: 'settings:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  HR_ADMIN: Object.values(PERMISSIONS), // all permissions
  EMPLOYEE: [
    PERMISSIONS.EMPLOYEE_VIEW_SELF,
    PERMISSIONS.EMPLOYEE_EDIT_SELF_PARTIAL,
    PERMISSIONS.ATTENDANCE_VIEW_SELF,
    PERMISSIONS.LEAVE_VIEW_SELF,
    PERMISSIONS.LEAVE_APPLY,
    PERMISSIONS.PAYROLL_VIEW_SELF,
    PERMISSIONS.EXPENSE_SUBMIT,
    PERMISSIONS.PERFORMANCE_SELF_REVIEW,
    PERMISSIONS.DOCUMENT_VIEW_SELF,
    PERMISSIONS.DOCUMENT_UPLOAD_SELF,
  ],
};
