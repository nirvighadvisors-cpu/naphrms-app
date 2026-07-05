import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import {
  createClaimSchema,
  updateClaimSchema,
  addItemSchema,
  reviewClaimSchema,
  updatePaymentSchema,
  expenseQuerySchema,
} from './expense.validation';
import { sendEmail } from '../../lib/email';
import { uploadFile, getSignedUrl } from '../../lib/storage';
import { getHRAdminUserIds, notifyUsers } from '../../services/notification.service';

// ── Helpers ──────────────────────────────────────────────────

const resolveClaimReceipts = async (claim: any) => {
  if (!claim?.items) return claim;
  const items = await Promise.all(
    claim.items.map(async (item: any) => {
      if (item.receiptUrl && item.receiptUrl.startsWith('expense-receipts/')) {
        return { ...item, receiptUrl: await getSignedUrl(item.receiptUrl) };
      }
      return item;
    })
  );
  return { ...claim, items };
};

const processReceiptBase64 = async (receiptBase64: string, employeeId: string): Promise<string | null> => {
  const match = receiptBase64.match(/^data:(image\/[a-zA-Z+]+|application\/pdf);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  let ext = mimeType.split('/')[1];
  if (mimeType === 'application/pdf') ext = 'pdf';
  const fileName = `receipt-${employeeId}-${Date.now()}.${ext}`;
  return await uploadFile('expense-receipts', fileName, buffer, mimeType);
};

// ══════════════════════════════════════════════════════════════
// EMPLOYEE — EXPENSE CLAIMS
// ══════════════════════════════════════════════════════════════

// ── POST /api/expenses ───────────────────────────────────────
export const createClaim = async (req: Request, res: Response): Promise<void> => {
  const parsed = createClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const { title, category, items } = parsed.data;
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const itemsData = await Promise.all(
    items.map(async (item) => {
      let finalReceiptUrl = item.receiptUrl ?? null;
      if ((item as any).receiptBase64) {
        const uploadedPath = await processReceiptBase64((item as any).receiptBase64, employee.id);
        if (uploadedPath) {
          finalReceiptUrl = uploadedPath;
        }
      }
      return {
        description: item.description,
        amount: Math.round(item.amount * 100) / 100,
        date: new Date(item.date),
        receiptUrl: finalReceiptUrl,
      };
    })
  );

  const claim = await prisma.expenseClaim.create({
    data: {
      employeeId: employee.id,
      title,
      category,
      totalAmount: Math.round(totalAmount * 100) / 100,
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      items: {
        create: itemsData,
      },
    },
    include: {
      items: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  res.status(201).json({ data: await resolveClaimReceipts(claim) });

  // Notify HR
  try {
    const hrUserIds = await getHRAdminUserIds();
    if (hrUserIds.length > 0) {
      await notifyUsers({
        userIds: hrUserIds,
        title: '🧾 New Expense Claim',
        message: `${employee.firstName} ${employee.lastName} submitted an expense claim for ₹${claim.totalAmount}.`,
        type: 'EXPENSE',
        linkUrl: '/admin/expenses',
      });
    }
  } catch (err) {
    console.error('Failed to notify HR of expense claim', err);
  }
};

// ── GET /api/expenses/my ─────────────────────────────────────
export const getMyClaims = async (req: Request, res: Response): Promise<void> => {
  const queryParsed = expenseQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: queryParsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const { status, category, paymentStatus, startDate, endDate, page = 1, limit = 20 } = queryParsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.ExpenseClaimWhereInput = {
    employeeId: employee.id,
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
  };

  const [claims, total] = await Promise.all([
    prisma.expenseClaim.findMany({
      where,
      skip,
      take: limit,
      include: {
        items: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.expenseClaim.count({ where }),
  ]);

  const claimsWithUrls = await Promise.all(claims.map(resolveClaimReceipts));

  res.json({
    data: claimsWithUrls,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// ── GET /api/expenses/:id ────────────────────────────────────
export const getClaimById = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const claim = await prisma.expenseClaim.findUnique({
    where: { id },
    include: {
      items: { orderBy: { date: 'asc' } },
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          profilePhotoUrl: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  if (!claim) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense claim not found' } });
    return;
  }

  // Employees can only view their own claims
  if (req.user!.role !== 'HR_ADMIN') {
    const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
    if (!employee || claim.employeeId !== employee.id) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only view your own expense claims' } });
      return;
    }
  }

  res.json({ data: await resolveClaimReceipts(claim) });
};

// ── PATCH /api/expenses/:id ──────────────────────────────────
export const updateClaim = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = updateClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const existing = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense claim not found' } });
    return;
  }

  if (existing.employeeId !== employee.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only edit your own expense claims' } });
    return;
  }

  if (existing.status !== 'PENDING') {
    res.status(400).json({ error: { code: 'NOT_EDITABLE', message: 'Only pending claims can be edited' } });
    return;
  }

  const updated = await prisma.expenseClaim.update({
    where: { id },
    data: parsed.data,
    include: { items: true },
  });

  res.json({ data: await resolveClaimReceipts(updated) });
};

// ── DELETE /api/expenses/:id ─────────────────────────────────
export const deleteClaim = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const existing = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense claim not found' } });
    return;
  }

  if (existing.employeeId !== employee.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only delete your own expense claims' } });
    return;
  }

  if (existing.status !== 'PENDING') {
    res.status(400).json({ error: { code: 'NOT_DELETABLE', message: 'Only pending claims can be deleted' } });
    return;
  }

  // Delete items first (cascade), then the claim
  await prisma.$transaction([
    prisma.expenseItem.deleteMany({ where: { claimId: id } }),
    prisma.expenseClaim.delete({ where: { id } }),
  ]);

  res.json({ data: { message: 'Expense claim deleted successfully' } });
};

// ── POST /api/expenses/:id/items ─────────────────────────────
export const addItem = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const claim = await prisma.expenseClaim.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!claim) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense claim not found' } });
    return;
  }

  if (claim.employeeId !== employee.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only add items to your own expense claims' } });
    return;
  }

  if (claim.status !== 'PENDING') {
    res.status(400).json({ error: { code: 'NOT_EDITABLE', message: 'Only pending claims can be modified' } });
    return;
  }

  const { description, amount, date, receiptUrl } = parsed.data;
  const roundedAmount = Math.round(amount * 100) / 100;
  
  let finalReceiptUrl = receiptUrl ?? null;
  if ((parsed.data as any).receiptBase64) {
    const uploadedPath = await processReceiptBase64((parsed.data as any).receiptBase64, employee.id);
    if (uploadedPath) {
      finalReceiptUrl = uploadedPath;
    }
  }

  const [item] = await prisma.$transaction([
    prisma.expenseItem.create({
      data: {
        claimId: id,
        description,
        amount: roundedAmount,
        date: new Date(date),
        receiptUrl: finalReceiptUrl,
      },
    }),
    prisma.expenseClaim.update({
      where: { id },
      data: {
        totalAmount: { increment: roundedAmount },
      },
    }),
  ]);

  if (item.receiptUrl && item.receiptUrl.startsWith('expense-receipts/')) {
    item.receiptUrl = await getSignedUrl(item.receiptUrl);
  }

  res.status(201).json({ data: item });
};

// ── DELETE /api/expenses/:id/items/:itemId ───────────────────
export const deleteItem = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const itemId = req.params.itemId as string;

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const claim = await prisma.expenseClaim.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!claim) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense claim not found' } });
    return;
  }

  if (claim.employeeId !== employee.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only modify your own expense claims' } });
    return;
  }

  if (claim.status !== 'PENDING') {
    res.status(400).json({ error: { code: 'NOT_EDITABLE', message: 'Only pending claims can be modified' } });
    return;
  }

  const item = claim.items.find((i) => i.id === itemId);
  if (!item) {
    res.status(404).json({ error: { code: 'ITEM_NOT_FOUND', message: 'Expense item not found' } });
    return;
  }

  // Must have at least 1 item remaining
  if (claim.items.length <= 1) {
    res.status(400).json({ error: { code: 'LAST_ITEM', message: 'Cannot delete the last item. Delete the claim instead.' } });
    return;
  }

  await prisma.$transaction([
    prisma.expenseItem.delete({ where: { id: itemId } }),
    prisma.expenseClaim.update({
      where: { id },
      data: {
        totalAmount: { decrement: item.amount },
      },
    }),
  ]);

  res.json({ data: { message: 'Expense item deleted successfully' } });
};

// ── PATCH /api/expenses/:id/cancel ───────────────────────────
export const cancelClaim = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const claim = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!claim) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense claim not found' } });
    return;
  }

  if (claim.employeeId !== employee.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only cancel your own expense claims' } });
    return;
  }

  if (claim.status !== 'PENDING') {
    res.status(400).json({ error: { code: 'CANNOT_CANCEL', message: 'Only pending claims can be cancelled' } });
    return;
  }

  const updated = await prisma.expenseClaim.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: { items: true },
  });

  res.json({ data: updated });
};

// ══════════════════════════════════════════════════════════════
// ADMIN — EXPENSE MANAGEMENT
// ══════════════════════════════════════════════════════════════

// ── GET /api/expenses ────────────────────────────────────────
export const getAllClaims = async (req: Request, res: Response): Promise<void> => {
  const queryParsed = expenseQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: queryParsed.error.flatten() } });
    return;
  }

  const { status, category, paymentStatus, employeeId, startDate, endDate, page = 1, limit = 20 } = queryParsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.ExpenseClaimWhereInput = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(employeeId ? { employeeId } : {}),
    ...(startDate || endDate
      ? {
          createdAt: {
            ...(startDate ? { gte: new Date(startDate) } : {}),
            ...(endDate ? { lte: new Date(endDate) } : {}),
          },
        }
      : {}),
  };

  const [claims, total] = await Promise.all([
    prisma.expenseClaim.findMany({
      where,
      skip,
      take: limit,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            profilePhotoUrl: true,
            department: { select: { name: true } },
          },
        },
        items: true,
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.expenseClaim.count({ where }),
  ]);

  const claimsWithUrls = await Promise.all(claims.map(resolveClaimReceipts));

  res.json({
    data: claimsWithUrls,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// ── PATCH /api/expenses/:id/review ───────────────────────────
export const reviewClaim = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = reviewClaimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { status, remarks } = parsed.data;

  const claim = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!claim) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense claim not found' } });
    return;
  }

  if (claim.status !== 'PENDING') {
    res.status(400).json({ error: { code: 'ALREADY_REVIEWED', message: 'This claim has already been reviewed' } });
    return;
  }

  const approver = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });

  const updated = await prisma.expenseClaim.update({
    where: { id },
    data: {
      status,
      remarks: remarks ?? null,
      approvedById: approver?.id ?? null,
      approvedAt: new Date(),
    },
    include: {
      items: true,
      employee: {
        include: { user: true },
      },
    },
  });

  if (updated.employee.user?.email) {
    sendEmail({
      to: updated.employee.user.email,
      subject: `Expense Claim ${updated.status}`,
      html: `
        <h2>Hi ${updated.employee.firstName},</h2>
        <p>Your expense claim "<strong>${updated.title}</strong>" for ₹${updated.totalAmount} has been <strong>${updated.status}</strong>.</p>
        ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
      `,
    });
  }

  res.json({ data: updated });

  // Notify Employee
  try {
    if (updated.employee.user?.id) {
      await notifyUsers({
        userIds: [updated.employee.user.id],
        title: `🧾 Expense Claim ${status}`,
        message: `Your expense claim for ₹${updated.totalAmount} has been ${status.toLowerCase()}${remarks ? ` with remarks: ${remarks}` : ''}.`,
        type: 'EXPENSE',
        linkUrl: '/employee/expenses',
      });
    }
  } catch (err) {
    console.error('Failed to send expense review notification', err);
  }
};

// ── PATCH /api/expenses/:id/payment ──────────────────────────
export const updatePayment = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = updatePaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { paymentStatus } = parsed.data;

  const claim = await prisma.expenseClaim.findUnique({ where: { id } });
  if (!claim) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Expense claim not found' } });
    return;
  }

  if (claim.status !== 'APPROVED') {
    res.status(400).json({ error: { code: 'NOT_APPROVED', message: 'Only approved claims can have their payment status updated' } });
    return;
  }

  // Validate payment status transition
  if (paymentStatus === 'PAID' && claim.paymentStatus !== 'APPROVED_FOR_PAYMENT') {
    res.status(400).json({ error: { code: 'INVALID_TRANSITION', message: 'Claim must be approved for payment before marking as paid' } });
    return;
  }

  const updated = await prisma.expenseClaim.update({
    where: { id },
    data: {
      paymentStatus,
      paidAt: paymentStatus === 'PAID' ? new Date() : null,
    },
    include: {
      employee: { include: { user: true } },
    },
  });

  if (updated.employee.user?.email && paymentStatus === 'PAID') {
    sendEmail({
      to: updated.employee.user.email,
      subject: `Expense Claim Paid`,
      html: `
        <h2>Hi ${updated.employee.firstName},</h2>
        <p>Great news! Your approved expense claim "<strong>${updated.title}</strong>" for ₹${updated.totalAmount} has been <strong>PAID</strong>.</p>
        <p>The amount should reflect in your bank account shortly.</p>
      `,
    });
  }

  res.json({ data: updated });

  // Notify Employee
  try {
    if (updated.employee.user?.id && paymentStatus === 'PAID') {
      await notifyUsers({
        userIds: [updated.employee.user.id],
        title: `💸 Expense Claim Paid`,
        message: `Your approved expense claim for ₹${updated.totalAmount} has been paid.`,
        type: 'EXPENSE',
        linkUrl: '/employee/expenses',
      });
    }
  } catch (err) {
    console.error('Failed to send expense payment notification', err);
  }
};

// ── GET /api/expenses/summary ────────────────────────────────
export const getExpenseSummary = async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [
    totalPending,
    totalApproved,
    totalRejected,
    pendingAmount,
    approvedAmount,
    paidClaims,
  ] = await Promise.all([
    prisma.expenseClaim.count({ where: { status: 'PENDING' } }),
    prisma.expenseClaim.count({
      where: {
        status: 'APPROVED',
        approvedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.expenseClaim.count({
      where: {
        status: 'REJECTED',
        approvedAt: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.expenseClaim.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'PENDING' },
    }),
    prisma.expenseClaim.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'APPROVED' },
    }),
    prisma.expenseClaim.aggregate({
      _sum: { totalAmount: true },
      where: { paymentStatus: 'PAID' },
    }),
  ]);

  // Category breakdown for the current month
  const categoryBreakdown = await prisma.expenseClaim.groupBy({
    by: ['category'],
    _sum: { totalAmount: true },
    _count: { id: true },
    where: {
      status: { in: ['APPROVED', 'PENDING'] },
      createdAt: { gte: monthStart, lte: monthEnd },
    },
    orderBy: { _sum: { totalAmount: 'desc' } },
  });

  res.json({
    data: {
      totalPending,
      totalApproved,
      totalRejected,
      pendingAmount: pendingAmount._sum.totalAmount ?? 0,
      approvedAmount: approvedAmount._sum.totalAmount ?? 0,
      paidAmount: paidClaims._sum.totalAmount ?? 0,
      categoryBreakdown: categoryBreakdown.map((cat) => ({
        category: cat.category,
        totalAmount: cat._sum.totalAmount ?? 0,
        count: cat._count.id,
      })),
    },
  });
};
