/**
 * Leave Cron Jobs
 * --------------------
 * Runs daily shortly after midnight to automatically toggle employee statuses:
 * 1) ACTIVE -> ON_LEAVE (for approved leaves starting today)
 * 2) ON_LEAVE -> ACTIVE (for approved leaves that ended yesterday)
 */

import prisma from '../../config/database';

export const processDailyLeaveTransitions = async (): Promise<void> => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr); // local time 00:00:00

    // 1. Activate Leaves: employees who are ACTIVE and have a leave starting today
    // Since an employee might have multiple leave requests, we just look for any APPROVED
    // request where startDate <= today and endDate >= today
    const leavesToStart = await prisma.leaveRequest.findMany({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
        employee: {
          status: 'ACTIVE',
        },
      },
      include: {
        employee: true,
      },
    });

    // To prevent duplicate updates if multiple requests overlap
    const employeesToActivateLeave = new Set<string>();
    for (const req of leavesToStart) {
      employeesToActivateLeave.add(req.employeeId);
    }

    if (employeesToActivateLeave.size > 0) {
      const ids = Array.from(employeesToActivateLeave);
      await prisma.employee.updateMany({
        where: { id: { in: ids } },
        data: { status: 'ON_LEAVE' },
      });
      console.log(`[Leave Cron] Transitioned ${ids.length} employees to ON_LEAVE status.`);
    }

    // 2. Deactivate Leaves: employees who are ON_LEAVE, but no longer have an active leave today
    const employeesOnLeave = await prisma.employee.findMany({
      where: { status: 'ON_LEAVE' },
      select: { id: true },
    });

    if (employeesOnLeave.length > 0) {
      const idsToDeactivate: string[] = [];

      for (const emp of employeesOnLeave) {
        // Check if they currently have any active leave for today
        const activeLeaveToday = await prisma.leaveRequest.findFirst({
          where: {
            employeeId: emp.id,
            status: 'APPROVED',
            startDate: { lte: today },
            endDate: { gte: today },
          },
        });

        if (!activeLeaveToday) {
          idsToDeactivate.push(emp.id);
        }
      }

      if (idsToDeactivate.length > 0) {
        await prisma.employee.updateMany({
          where: { id: { in: idsToDeactivate } },
          data: { status: 'ACTIVE' },
        });
        console.log(`[Leave Cron] Transitioned ${idsToDeactivate.length} employees back to ACTIVE status.`);
      }
    }

  } catch (error) {
    console.error('[Leave Cron] Error processing daily leave transitions:', error);
  }
};

export const processProbationLeaveCredits = async (): Promise<void> => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    const employeesToUnlock = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        isProfileComplete: true,
        isProbationLeaveCredited: false,
        probationEndsAt: { lte: today },
      }
    });

    if (employeesToUnlock.length === 0) return;

    const clType = await prisma.leaveType.findFirst({ where: { code: 'CL' } });
    const plType = await prisma.leaveType.findFirst({ where: { code: 'PL' } });
    const year = today.getFullYear();

    for (const emp of employeesToUnlock) {
      if (clType) {
        await prisma.leaveBalance.upsert({
          where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: clType.id, year } },
          create: { employeeId: emp.id, leaveTypeId: clType.id, year, totalDays: 1, remainingDays: 1, usedDays: 0, pendingDays: 0 },
          update: { totalDays: { increment: 1 }, remainingDays: { increment: 1 } },
        });
      }
      if (plType) {
        await prisma.leaveBalance.upsert({
          where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: plType.id, year } },
          create: { employeeId: emp.id, leaveTypeId: plType.id, year, totalDays: 1, remainingDays: 1, usedDays: 0, pendingDays: 0 },
          update: { totalDays: { increment: 1 }, remainingDays: { increment: 1 } },
        });
      }
      await prisma.employee.update({
        where: { id: emp.id },
        data: { isProbationLeaveCredited: true },
      });
      console.log(`[Leave Cron] Unlocked and credited first month probation leaves for ${emp.id}`);
    }
  } catch (error) {
    console.error('[Leave Cron] Error processing probation leave credits:', error);
  }
};

export const processMonthlyLeaveCredits = async (): Promise<void> => {
  try {
    const now = new Date();
    // Only run on the 1st of the month
    if (now.getDate() !== 1) return;

    const todayStr = now.toISOString().split('T')[0];
    const today = new Date(todayStr);

    // Find all active employees who have passed probation
    const eligibleEmployees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        isProfileComplete: true,
        probationEndsAt: { lte: today },
      }
    });

    const clType = await prisma.leaveType.findFirst({ where: { code: 'CL' } });
    const plType = await prisma.leaveType.findFirst({ where: { code: 'PL' } });
    const year = today.getFullYear();

    for (const emp of eligibleEmployees) {
      if (clType) {
        await prisma.leaveBalance.upsert({
          where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: clType.id, year } },
          create: { employeeId: emp.id, leaveTypeId: clType.id, year, totalDays: 1, remainingDays: 1, usedDays: 0, pendingDays: 0 },
          update: { totalDays: { increment: 1 }, remainingDays: { increment: 1 } },
        });
      }
      if (plType) {
        await prisma.leaveBalance.upsert({
          where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: plType.id, year } },
          create: { employeeId: emp.id, leaveTypeId: plType.id, year, totalDays: 1, remainingDays: 1, usedDays: 0, pendingDays: 0 },
          update: { totalDays: { increment: 1 }, remainingDays: { increment: 1 } },
        });
      }
    }
    console.log(`[Leave Cron] Processed monthly leave credits for ${eligibleEmployees.length} eligible employees.`);
  } catch (error) {
    console.error('[Leave Cron] Error processing monthly leave credits:', error);
  }
};


// ── Schedule cron job ─────────────────────────────────────
export const startLeaveCronJobs = (): void => {
  // Use setInterval-based scheduling to run right after midnight (IST)
  // For simplicity we check every 5 minutes and run if it's 12:05 AM IST = 18:35 UTC (approx)
  // Or just run every hour and check if date changed, but it's easier to check time.

  // Let's run it at 00:05 IST -> 18:35 UTC
  const checkAndRunSchedule = () => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();

    // 12:05 AM IST = 18:35 UTC
    if (utcHours === 18 && utcMinutes === 35) {
      console.log('[Leave Cron] Triggering daily tasks (12:05 AM IST)...');
      processDailyLeaveTransitions();
      processProbationLeaveCredits();
      processMonthlyLeaveCredits();
    }
  };

  // Check every minute
  setInterval(checkAndRunSchedule, 60 * 1000);

  // Also run it immediately on boot to catch up in case the server was down at midnight
  console.log('[Leave Cron] Running initial startup check for leave status transitions...');
  processDailyLeaveTransitions();
  processProbationLeaveCredits();
  // We do not run processMonthlyLeaveCredits() on boot to avoid duplicate crediting if server restarts on the 1st

  console.log('⏰ Leave cron jobs scheduled:');
  console.log('   • 12:05 AM IST — Daily Leave Status Transitions (ACTIVE <-> ON_LEAVE)');
};
