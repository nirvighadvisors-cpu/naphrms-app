import prisma from '../../config/database';

export const processCompOffForAttendance = async (attendanceId: string) => {
  try {
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceId },
    });

    if (!record || record.isCompOffCredited || !record.punchOutTime) {
      return;
    }

    // Ensure we are checking for the holiday exactly at midnight UTC
    const dateAtMidnight = new Date(record.date);
    dateAtMidnight.setUTCHours(0, 0, 0, 0);

    const holiday = await prisma.holiday.findFirst({
      where: { date: dateAtMidnight },
    });

    const isWeekend = dateAtMidnight.getUTCDay() === 0 || dateAtMidnight.getUTCDay() === 6;

    if (!holiday && !isWeekend) {
      return; // Not a holiday and not a weekend
    }

    const reason = holiday ? holiday.name : 'Weekend';

    const year = dateAtMidnight.getUTCFullYear();

    // 1. Ensure Comp-Off leave type exists
    let compOffType = await prisma.leaveType.findUnique({
      where: { code: 'COMP_OFF' }
    });

    if (!compOffType) {
      compOffType = await prisma.leaveType.create({
        data: {
          name: 'Comp-Off',
          code: 'COMP_OFF',
          description: 'Compensatory Off for working on a holiday',
          isPaid: true,
          maxDaysPerYear: 365,
          carryForward: true, // Commonly carry forward, or not, but true is safer if unused
          requiresDoc: false,
          noticeDays: 0,
        }
      });
    }

    // 2. Find or create leave balance
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: record.employeeId,
          leaveTypeId: compOffType.id,
          year: year
        }
      }
    });

    if (!balance) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: record.employeeId,
          leaveTypeId: compOffType.id,
          year: year,
          totalDays: 1,
          usedDays: 0,
          pendingDays: 0,
          remainingDays: 1,
        }
      });
    } else {
      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          totalDays: { increment: 1 },
          remainingDays: { increment: 1 },
        }
      });
    }

    // 3. Mark attendance as credited
    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { isCompOffCredited: true }
    });

    console.log(`[Comp-Off] Credited 1 Comp Off to employee ${record.employeeId} for working on ${reason} (${dateAtMidnight.toISOString()})`);

  } catch (error) {
    console.error('[Comp-Off] Error processing comp off for attendance:', error);
  }
};
