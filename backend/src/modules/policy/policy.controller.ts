import { Request, Response } from 'express';
import { prisma } from '../../config/database';
import { uploadFile, deleteFile } from '../../lib/storage';
import { PDFDocument } from 'pdf-lib';
import { notifyUsers } from '../../services/notification.service';


// POST /api/policies
export const uploadPolicy = async (req: Request, res: Response): Promise<void> => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: { code: 'NO_FILE', message: 'No policy file uploaded' } });
    return;
  }

  // Enforce 1MB limit for PDFs
  if (file.size > 1 * 1024 * 1024) {
    res.status(400).json({ error: { code: 'FILE_TOO_LARGE', message: 'Policy PDF must be less than 1MB' } });
    return;
  }

  if (file.mimetype !== 'application/pdf') {
    res.status(400).json({ error: { code: 'INVALID_TYPE', message: 'Policy file must be a PDF' } });
    return;
  }

  const { title, description } = req.body;
  if (!title) {
    res.status(400).json({ error: { code: 'NO_TITLE', message: 'Policy title is required' } });
    return;
  }

  try {
    const storagePath = await uploadFile('policy-documents', file.originalname, file.buffer, file.mimetype);

    const policy = await prisma.policyDocument.create({
      data: {
        title,
        description,
        fileUrl: storagePath,
      },
    });

    res.status(201).json({ data: policy });

    // Notify all active employees about new policy
    try {
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE', userId: { not: undefined } },
        select: { userId: true },
      });
      const userIds = employees.map(e => e.userId).filter(Boolean) as string[];
      if (userIds.length > 0) {
        await notifyUsers({
          userIds,
          title: '📋 New Company Policy',
          message: `A new policy has been published: ${title}`,
          type: 'SYSTEM',
          linkUrl: '/employee/policies',
        });
      }
    } catch (err) {
      console.error('Failed to send policy notification', err);
    }
  } catch (error: any) {
    console.error('Error uploading policy:', error);
    res.status(500).json({ error: { code: 'UPLOAD_FAILED', message: 'Failed to upload policy', details: error.message } });
  }
};

// GET /api/policies
export const getPolicies = async (req: Request, res: Response): Promise<void> => {
  try {
    const policies = await prisma.policyDocument.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: policies });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: 'Failed to fetch policies' } });
  }
};

// DELETE /api/policies/:id
export const deletePolicy = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  try {
    const policy = await prisma.policyDocument.findUnique({ where: { id } });
    if (!policy) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
      return;
    }

    // Mark as inactive instead of deleting to keep history if needed
    // Or hard delete if preferred. We'll do hard delete + storage removal here for cleaner state.
    await prisma.policyDocument.delete({ where: { id } });
    
    // Attempt to delete from storage
    try {
      await deleteFile(policy.fileUrl);
    } catch (e) {
      console.warn('Failed to delete file from storage:', e);
    }

    res.json({ data: { success: true } });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'DELETE_FAILED', message: 'Failed to delete policy' } });
  }
};

// GET /api/policies/merged
export const getMergedPolicies = async (req: Request, res: Response): Promise<void> => {
  try {
    const policies = await prisma.policyDocument.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }, // Older policies first, or could order by title
    });

    if (policies.length === 0) {
      res.status(404).send('No policies found.');
      return;
    }

    // We need to fetch each PDF buffer from Supabase using signed URLs or public URLs.
    // If the bucket is private, we must generate signed URLs.
    const { getSignedUrl } = await import('../../lib/storage');

    const mergedPdf = await PDFDocument.create();

    for (const policy of policies) {
      try {
        let downloadUrl = policy.fileUrl;
        
        // If it's a relative storage path from our uploadFile function
        if (!downloadUrl.startsWith('http')) {
          downloadUrl = await getSignedUrl(downloadUrl, 300); // 5 mins
        }
        
        // Fetch the PDF using native fetch
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
        const pdfBytes = await response.arrayBuffer();
        
        const policyPdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(policyPdf, policyPdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      } catch (err: any) {
        console.error(`Failed to process policy ${policy.id}:`, err.message);
        // Continue merging the rest
      }
    }

    const mergedPdfBytes = await mergedPdf.save();
    const buffer = Buffer.from(mergedPdfBytes);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="merged_policies.pdf"');
    res.send(buffer);
  } catch (error: any) {
    console.error('Error merging policies:', error);
    res.status(500).send('Failed to merge policies.');
  }
};
