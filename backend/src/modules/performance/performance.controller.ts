import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import {
  createCycleSchema,
  updateCycleStatusSchema,
  createGoalSchema,
  updateGoalProgressSchema,
  submitSelfReviewSchema,
  submitHrReviewSchema,
  cycleQuerySchema,
  reviewQuerySchema,
} from './performance.validation';
import { notifyUsers } from '../../services/notification.service';

// ══════════════════════════════════════════════════════════════
// ADMIN: REVIEW CYCLES
// ══════════════════════════════════════════════════════════════

// ── POST /api/performance/cycles ─────────────────────────────
export const createCycle = async (req: Request, res: Response): Promise<void> => {
  const parsed = createCycleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  // Prevent multiple active cycles
  const activeCycle = await prisma.reviewCycle.findFirst({ where: { status: 'ACTIVE' } });
  if (activeCycle) {
    res.status(400).json({ error: { code: 'ACTIVE_CYCLE_EXISTS', message: 'There is already an active review cycle. Please close it first.' } });
    return;
  }

  const { name, startDate, endDate } = parsed.data;

  // Create cycle and initialize reviews for all active employees
  const cycle = await prisma.$transaction(async (tx) => {
    const newCycle = await tx.reviewCycle.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'ACTIVE',
      },
    });

    const activeEmployees = await tx.employee.findMany({ where: { status: 'ACTIVE' } });

    if (activeEmployees.length > 0) {
      await tx.review.createMany({
        data: activeEmployees.map(emp => ({
          employeeId: emp.id,
          cycleId: newCycle.id,
          status: 'SELF_REVIEW_PENDING',
        })),
      });
    }

    return newCycle;
  });

  res.status(201).json({ data: cycle });

  // Notify Employees
  try {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE', userId: { not: undefined } },
      select: { userId: true },
    });
    const userIds = employees.map(e => e.userId).filter(Boolean) as string[];
    if (userIds.length > 0) {
      await notifyUsers({
        userIds,
        title: '📊 New Performance Review Cycle',
        message: `The ${name} performance review cycle has started. Please submit your self-reviews.`,
        type: 'SYSTEM',
        linkUrl: '/employee/performance',
      });
    }
  } catch (err) {
    console.error('Failed to send performance cycle notification', err);
  }
};

// ── GET /api/performance/cycles ──────────────────────────────
export const getCycles = async (req: Request, res: Response): Promise<void> => {
  const parsed = cycleQuerySchema.safeParse(req.query);
  const status = parsed.success ? parsed.data.status : undefined;

  const cycles = await prisma.reviewCycle.findMany({
    where: status ? { status } : {},
    include: {
      _count: { select: { reviews: true, goals: true } },
    },
    orderBy: { startDate: 'desc' },
  });

  res.json({ data: cycles });
};

// ── GET /api/performance/cycles/active ───────────────────────
export const getActiveCycle = async (_req: Request, res: Response): Promise<void> => {
  const cycle = await prisma.reviewCycle.findFirst({
    where: { status: 'ACTIVE' },
    include: {
      _count: { select: { reviews: true, goals: true } },
    },
  });

  if (!cycle) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No active review cycle found' } });
    return;
  }

  res.json({ data: cycle });
};

// ── PATCH /api/performance/cycles/:id/status ─────────────────
export const updateCycleStatus = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = updateCycleStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const cycle = await prisma.reviewCycle.findUnique({ where: { id } });
  if (!cycle) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review cycle not found' } });
    return;
  }

  const updated = await prisma.reviewCycle.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  res.json({ data: updated });
};

// ══════════════════════════════════════════════════════════════
// EMPLOYEE: GOALS
// ══════════════════════════════════════════════════════════════

// ── POST /api/performance/goals ──────────────────────────────
export const createGoal = async (req: Request, res: Response): Promise<void> => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const { cycleId, title, description, targetDate } = parsed.data;

  // Check cycle
  const cycle = await prisma.reviewCycle.findUnique({ where: { id: cycleId } });
  if (!cycle || cycle.status !== 'ACTIVE') {
    res.status(400).json({ error: { code: 'INVALID_CYCLE', message: 'Can only add goals to an active review cycle' } });
    return;
  }

  const goal = await prisma.goal.create({
    data: {
      employeeId: employee.id,
      cycleId,
      title,
      description,
      targetDate: targetDate ? new Date(targetDate) : null,
      status: 'NOT_STARTED',
      progress: 0,
    },
  });

  res.status(201).json({ data: goal });
};

// ── GET /api/performance/goals/my ────────────────────────────
export const getMyGoals = async (req: Request, res: Response): Promise<void> => {
  const { cycleId } = req.query;

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const where: Prisma.GoalWhereInput = {
    employeeId: employee.id,
    ...(cycleId ? { cycleId: String(cycleId) } : {}),
  };

  const goals = await prisma.goal.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: goals });
};

// ── PATCH /api/performance/goals/:id/progress ────────────────
export const updateGoalProgress = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = updateGoalProgressSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const goal = await prisma.goal.findUnique({ where: { id } });
  if (!goal) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } });
    return;
  }

  if (goal.employeeId !== employee.id) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only update your own goals' } });
    return;
  }

  const updated = await prisma.goal.update({
    where: { id },
    data: parsed.data,
  });

  res.json({ data: updated });
};

// ══════════════════════════════════════════════════════════════
// EMPLOYEE & ADMIN: REVIEWS
// ══════════════════════════════════════════════════════════════

// ── GET /api/performance/reviews/my/:cycleId ─────────────────
export const getMyReview = async (req: Request, res: Response): Promise<void> => {
  const cycleId = req.params.cycleId as string;

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const review = await prisma.review.findFirst({
    where: { employeeId: employee.id, cycleId },
    include: { cycle: true },
  });

  if (!review) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No review found for this cycle' } });
    return;
  }

  res.json({ data: review });
};

// ── PATCH /api/performance/reviews/my/:cycleId ───────────────
export const submitSelfReview = async (req: Request, res: Response): Promise<void> => {
  const cycleId = req.params.cycleId as string;
  const parsed = submitSelfReviewSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
  if (!employee) {
    res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
    return;
  }

  const review = await prisma.review.findFirst({
    where: { employeeId: employee.id, cycleId },
  });

  if (!review) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review record not found for this cycle' } });
    return;
  }

  if (review.status === 'COMPLETED' || review.status === 'HR_REVIEW_PENDING') {
    res.status(400).json({ error: { code: 'ALREADY_SUBMITTED', message: 'You have already submitted your self-review.' } });
    return;
  }

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: {
      selfRating: parsed.data.selfRating,
      selfComments: parsed.data.selfComments,
      status: 'SELF_SUBMITTED',
      submittedAt: new Date(),
    },
  });

  res.json({ data: updated });
};

// ── GET /api/performance/reviews ─────────────────────────────
export const getAllReviews = async (req: Request, res: Response): Promise<void> => {
  const parsed = reviewQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: parsed.error.flatten() } });
    return;
  }

  const { cycleId, status, employeeId, page = 1, limit = 20 } = parsed.data;
  const skip = (page - 1) * limit;

  const where: Prisma.ReviewWhereInput = {
    ...(cycleId ? { cycleId } : {}),
    ...(status ? { status } : {}),
    ...(employeeId ? { employeeId } : {}),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
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
            department: { select: { name: true } },
            profilePhotoUrl: true,
          },
        },
        cycle: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.review.count({ where }),
  ]);

  res.json({
    data: reviews,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
};

// ── PATCH /api/performance/reviews/:id/hr ────────────────────
export const submitHrReview = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = submitHrReviewSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Review not found' } });
    return;
  }

  if (review.status === 'COMPLETED') {
    res.status(400).json({ error: { code: 'ALREADY_COMPLETED', message: 'This review has already been completed by HR.' } });
    return;
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
      hrRating: parsed.data.hrRating,
      hrComments: parsed.data.hrComments,
      finalRating: parsed.data.finalRating,
      status: 'COMPLETED',
      completedAt: new Date(),
    },
    include: {
      employee: {
        select: { firstName: true, lastName: true },
      },
      cycle: true,
    },
  });

  res.json({ data: updated });
};

// ── GET /api/performance/summary ─────────────────────────────
export const getPerformanceSummary = async (_req: Request, res: Response): Promise<void> => {
  const activeCycle = await prisma.reviewCycle.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  const [
    totalCycles,
    totalReviews,
    pendingHrReviews,
    completedReviews,
  ] = await Promise.all([
    prisma.reviewCycle.count(),
    activeCycle ? prisma.review.count({ where: { cycleId: activeCycle.id } }) : 0,
    activeCycle ? prisma.review.count({ where: { cycleId: activeCycle.id, status: 'SELF_SUBMITTED' } }) : 0,
    activeCycle ? prisma.review.count({ where: { cycleId: activeCycle.id, status: 'COMPLETED' } }) : 0,
  ]);

  // Calculate average rating if there are completed reviews in the active cycle
  let averageRating = 0;
  if (activeCycle) {
    const agg = await prisma.review.aggregate({
      where: { cycleId: activeCycle.id, status: 'COMPLETED' },
      _avg: { finalRating: true },
    });
    averageRating = agg._avg.finalRating ?? 0;
  }

  res.json({
    data: {
      activeCycle: activeCycle ?? null,
      totalCycles,
      activeCycleStats: {
        totalReviews,
        pendingHrReviews,
        completedReviews,
        averageRating: Math.round(averageRating * 10) / 10,
        completionRate: totalReviews > 0 ? Math.round((completedReviews / totalReviews) * 100) : 0,
      },
    },
  });
};
