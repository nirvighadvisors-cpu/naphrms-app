import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { getSignedUrl } from '../../lib/storage';
import { uploadEmployeeDocumentSchema, createPolicySchema, updatePolicySchema, replaceDocumentSchema, replacePolicySchema } from './document.validation';
import { broadcastToRole, getHRAdminUserIds, getEmployeeName, notifyUsers } from '../../services/notification.service';

// ── EMPLOYEE DOCUMENTS ────────────────────────────────────────

// GET /api/documents/employee/my
// Get logged-in employee's documents
export const getMyDocuments = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    return;
  }

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: 'desc' },
  });

  const processedDocuments = await Promise.all(documents.map(async (doc) => {
    let downloadUrl = doc.fileUrl;
    if (downloadUrl && !downloadUrl.startsWith('http')) {
      try {
        downloadUrl = await getSignedUrl(downloadUrl, 3600);
      } catch (e) {
        console.error('Failed to sign url', e);
      }
    }
    return { ...doc, fileUrl: downloadUrl };
  }));

  res.json({ data: processedDocuments });
};

// GET /api/documents/employee/:employeeId
// Admin view employee documents
export const getEmployeeDocuments = async (req: Request, res: Response): Promise<void> => {
  const { employeeId } = req.params;

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: employeeId as string },
    orderBy: { createdAt: 'desc' },
  });

  const processedDocuments = await Promise.all(documents.map(async (doc) => {
    let downloadUrl = doc.fileUrl;
    if (downloadUrl && !downloadUrl.startsWith('http')) {
      try {
        downloadUrl = await getSignedUrl(downloadUrl, 3600);
      } catch (e) {
        console.error('Failed to sign url', e);
      }
    }
    return { ...doc, fileUrl: downloadUrl };
  }));

  res.json({ data: processedDocuments });
};

// POST /api/documents/employee/:employeeId?
// Upload a document (Employee themselves or Admin on behalf of Employee)
export const uploadEmployeeDocument = async (req: Request, res: Response): Promise<void> => {
  const parsed = uploadEmployeeDocumentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { type, fileName, fileUrl, fileSize, expiresAt } = parsed.data;
  
  // Determine target employeeId
  let targetEmployeeId = req.params.employeeId;

  // If no employeeId is passed in URL, assume it's the logged-in employee uploading for themselves
  if (!targetEmployeeId) {
    const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Employee not found' } });
      return;
    }
    targetEmployeeId = employee.id;
  }

  try {
    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: targetEmployeeId as string,
        type: type as any,
        fileName,
        fileUrl,
        fileSize,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        uploadedById: req.user!.userId,
      },
    });

    res.status(201).json({ data: document });

    // Notify HR Admins
    // Notify HR Admins if Employee uploads it
    if (req.user!.role !== 'HR_ADMIN') {
      const employeeName = await getEmployeeName(targetEmployeeId as string);
      const hrUserIds = await getHRAdminUserIds();
      await broadcastToRole({
        role: 'HR_ADMIN',
        userIds: hrUserIds,
        title: '📄 New Document Uploaded',
        message: `${employeeName} has uploaded a new document (${type.replace(/_/g, ' ')}).`,
        type: 'SYSTEM',
        linkUrl: `/admin/employees/${targetEmployeeId}`,
      });
    } else {
      // If HR Admin uploads for an employee, notify the employee
      const targetEmployee = await prisma.employee.findUnique({ where: { id: targetEmployeeId as string } });
      if (targetEmployee?.userId && targetEmployee.userId !== req.user!.userId) {
        await notifyUsers({
          userIds: [targetEmployee.userId],
          title: '📄 Document Added',
          message: `HR has added a new document (${type.replace(/_/g, ' ')}) to your profile.`,
          type: 'SYSTEM',
          linkUrl: `/employee/documents`,
        });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: { code: 'CREATE_FAILED', message: 'Failed to upload document', details: error.message } });
  }
};

// DELETE /api/documents/employee/:id
// Delete a document
export const deleteEmployeeDocument = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  
  const existing = await prisma.employeeDocument.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    return;
  }

  // Security: Only Admin or the owner Employee can delete
  if (req.user!.role !== 'HR_ADMIN') {
    const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
    if (!employee || employee.id !== existing.employeeId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to delete this document' } });
      return;
    }
  }

  try {
    await prisma.employeeDocument.delete({ where: { id } });
    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete document', details: error.message } });
  }
};

// PATCH /api/documents/employee/:id/replace
// Replace an existing document
export const replaceEmployeeDocument = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = replaceDocumentSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const existing = await prisma.employeeDocument.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Document not found' } });
    return;
  }

  // Security: Only Admin or the owner Employee can replace
  if (req.user!.role !== 'HR_ADMIN') {
    const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
    if (!employee || employee.id !== existing.employeeId) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to replace this document' } });
      return;
    }
  }

  try {
    const updatedDocument = await prisma.employeeDocument.update({
      where: { id },
      data: {
        fileName: parsed.data.fileName,
        fileUrl: parsed.data.fileUrl,
        fileSize: parsed.data.fileSize,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DOCUMENT_REPLACED',
        targetId: id,
        targetType: 'EmployeeDocument',
        status: 'SUCCESS',
        details: {
          employeeId: existing.employeeId,
          oldFileName: existing.fileName,
          newFileName: parsed.data.fileName,
          oldFileUrl: existing.fileUrl,
          newFileUrl: parsed.data.fileUrl,
        },
      },
    });

    res.json({ data: updatedDocument });

    // Send notifications if the user replacing is HR but the owner is an employee
    if (req.user!.role === 'HR_ADMIN' && existing.employeeId) {
      const targetEmployee = await prisma.employee.findUnique({ where: { id: existing.employeeId } });
      if (targetEmployee?.userId && targetEmployee.userId !== req.user!.userId) {
        await notifyUsers({
          userIds: [targetEmployee.userId],
          title: '🔄 Document Replaced',
          message: `HR has updated/replaced your document (${existing.type.replace(/_/g, ' ')}).`,
          type: 'SYSTEM',
          linkUrl: `/employee/documents`,
        });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: { code: 'REPLACE_FAILED', message: 'Failed to replace document', details: error.message } });
  }
};


// ── COMPANY POLICIES ──────────────────────────────────────────

// GET /api/documents/policies
// Get all policies (Employees only see active, Admins see all)
export const getPolicies = async (req: Request, res: Response): Promise<void> => {
  const where: Prisma.PolicyDocumentWhereInput = {};

  if (req.user!.role !== 'HR_ADMIN') {
    where.isActive = true;
  }

  const policies = await prisma.policyDocument.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
  });

  res.json({ data: policies });
};

// POST /api/documents/policies
// Admin upload a new policy
export const createPolicy = async (req: Request, res: Response): Promise<void> => {
  const parsed = createPolicySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { title, description, fileUrl, version, isActive } = parsed.data;

  try {
    const policy = await prisma.policyDocument.create({
      data: {
        title,
        description,
        fileUrl,
        version,
        isActive,
      },
    });

    res.status(201).json({ data: policy });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'CREATE_FAILED', message: 'Failed to create policy', details: error.message } });
  }
};

// PATCH /api/documents/policies/:id
// Admin update policy status
export const updatePolicy = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = updatePolicySchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  try {
    const policy = await prisma.policyDocument.update({
      where: { id },
      data: parsed.data,
    });

    res.json({ data: policy });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: 'Failed to update policy', details: error.message } });
  }
};

// DELETE /api/documents/policies/:id
// Admin delete policy
export const deletePolicy = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  
  const existing = await prisma.policyDocument.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
    return;
  }

  try {
    await prisma.policyDocument.delete({ where: { id } });
    res.json({ message: 'Policy deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete policy', details: error.message } });
  }
};

// PATCH /api/documents/policies/:id/replace
// Admin replace policy
export const replacePolicy = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = replacePolicySchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const existing = await prisma.policyDocument.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
    return;
  }

  try {
    const updatedPolicy = await prisma.policyDocument.update({
      where: { id },
      data: {
        fileUrl: parsed.data.fileUrl,
        version: parsed.data.version,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'POLICY_REPLACED',
        targetId: id,
        targetType: 'PolicyDocument',
        status: 'SUCCESS',
        details: {
          oldVersion: existing.version,
          newVersion: parsed.data.version,
          oldFileUrl: existing.fileUrl,
          newFileUrl: parsed.data.fileUrl,
        },
      },
    });

    res.json({ data: updatedPolicy });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'REPLACE_FAILED', message: 'Failed to replace policy', details: error.message } });
  }
};
