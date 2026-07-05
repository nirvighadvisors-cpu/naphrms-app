import { Request, Response } from 'express';
import prisma from '../../config/database';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Total active employees
    const totalEmployees = await prisma.employee.count({
      where: { status: 'ACTIVE' },
    });

    // 2. Attendance rate today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const activeLeavesToday = await prisma.leaveRequest.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: endOfToday },
        endDate: { gte: startOfToday },
      },
    });

    // 3. Expenses this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const expenseAgg = await prisma.expenseClaim.aggregate({
      _sum: { totalAmount: true },
      where: {
        createdAt: { gte: startOfMonth },
        status: 'APPROVED',
      },
    });

    // 4. Average Performance Rating
    const performanceAgg = await prisma.review.aggregate({
      _avg: { finalRating: true },
      where: { status: 'COMPLETED' },
    });

    res.json({
      data: {
        totalEmployees,
        activeLeavesToday,
        totalExpensesThisMonth: expenseAgg._sum.totalAmount || 0,
        averagePerformanceRating: performanceAgg._avg.finalRating || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats', details: error.message } });
  }
};

export const getDepartmentDistribution = async (req: Request, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: {
          select: { employees: { where: { status: 'ACTIVE' } } },
        },
      },
    });

    const data = departments.map((dept) => ({
      name: dept.name,
      value: dept._count.employees,
    }));

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch department distribution', details: error.message } });
  }
};

export const getExpenseTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    // We'll fetch all approved expenses from the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const claims = await prisma.expenseClaim.findMany({
      where: {
        status: 'APPROVED',
        createdAt: { gte: sixMonthsAgo },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    // Group by YYYY-MM in JS
    const grouped: Record<string, number> = {};

    claims.forEach((claim) => {
      const month = `${claim.createdAt.getFullYear()}-${String(claim.createdAt.getMonth() + 1).padStart(2, '0')}`;
      grouped[month] = (grouped[month] || 0) + claim.totalAmount;
    });

    // Format for charts
    const data = Object.keys(grouped)
      .sort()
      .map((month) => ({
        month, // e.g. "2026-06"
        amount: grouped[month],
      }));

    res.json({ data });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch expense trends', details: error.message } });
  }
};
