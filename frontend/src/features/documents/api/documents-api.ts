export type DocumentType = 'PAN_CARD' | 'AADHAAR_CARD' | 'PASSPORT' | 'OFFER_LETTER' | 'EXPERIENCE_LETTER' | 'EDUCATION_CERTIFICATE' | 'FITNESS_CERTIFICATE' | 'OTHER';

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  uploadedById: string;
  expiresAt: string | null;
  createdAt: string;
}

export interface PolicyDocument {
  id: string;
  title: string;
  description: string | null;
  fileUrl: string;
  version: string;
  isActive: boolean;
  publishedAt: string;
  createdAt: string;
}

export interface UploadDocumentInput {
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  expiresAt?: string | null;
}

export interface CreatePolicyInput {
  title: string;
  description?: string;
  fileUrl: string;
  version: string;
  isActive?: boolean;
}

import apiClient from '@/lib/api-client';

export const documentApi = {
  // Employee Documents
  getMyDocuments: () => apiClient.get<{ data: EmployeeDocument[] }>('/documents/employee/my').then(res => res.data.data),
  getEmployeeDocuments: (employeeId: string) => apiClient.get<{ data: EmployeeDocument[] }>(`/documents/employee/${employeeId}`).then(res => res.data.data),
  uploadMyDocument: (data: UploadDocumentInput) => apiClient.post<{ data: EmployeeDocument }>('/documents/employee', data).then(res => res.data.data),
  uploadEmployeeDocument: (employeeId: string, data: UploadDocumentInput) => apiClient.post<{ data: EmployeeDocument }>(`/documents/employee/${employeeId}`, data).then(res => res.data.data),
  deleteDocument: (id: string) => apiClient.delete(`/documents/employee/${id}`),
  replaceEmployeeDocument: (id: string, data: { fileName: string; fileUrl: string; fileSize?: number }) => apiClient.patch<{ data: EmployeeDocument }>(`/documents/employee/${id}/replace`, data).then(res => res.data.data),

  // Policies
  getPolicies: () => apiClient.get<{ data: PolicyDocument[] }>('/documents/policies').then(res => res.data.data),
  createPolicy: (data: CreatePolicyInput) => apiClient.post<{ data: PolicyDocument }>('/documents/policies', data).then(res => res.data.data),
  updatePolicy: (id: string, data: { isActive: boolean }) => apiClient.patch<{ data: PolicyDocument }>(`/documents/policies/${id}`, data).then(res => res.data.data),
  deletePolicy: (id: string) => apiClient.delete(`/documents/policies/${id}`),
  replacePolicy: (id: string, data: { fileUrl: string; version: string }) => apiClient.patch<{ data: PolicyDocument }>(`/documents/policies/${id}/replace`, data).then(res => res.data.data),
};
