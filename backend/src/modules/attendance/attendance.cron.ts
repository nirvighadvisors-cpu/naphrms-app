/**
 * Attendance Cron Jobs
 * --------------------
 * 1) 10:00 PM IST — First reminder notification to employees still punched in
 * 2) 10:15 PM IST — Second (urgent) reminder notification
 * 3) 10:30 PM IST — Auto-punch-out for employees who haven't punched out
 *                    (respects extended deadlines)
 *
 * IST = UTC + 5:30
 * 10:00 PM IST = 4:30 PM UTC = 16:30 UTC
 * 10:15 PM IST = 4:45 PM UTC = 16:45 UTC
 * 10:30 PM IST = 5:00 PM UTC = 17:00 UTC
 */

import prisma from '../../config/database';
import { processCompOffForAttendance } from './attendance.service';

// ── Helper: Returns start-of-day Date for "today" in IST (date-only, no time component). */
const getTodayDate = (): Date => {
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return new Date(`${dateStr}T00:00:00.000Z`);
};

// ── Helper: get default auto-punch-out time (10:30 PM IST = 17:00 UTC) ──
const getDefaultAutoPunchOutTime = (): Date => {
  const today = new Date();
  // 10:30 PM IST = 17:00 UTC
  const deadline = new Date(today.toISOString().split('T')[0]);
  deadline.setUTCHours(17, 0, 0, 0);
  return deadline;
};

// ── Find all employees currently punched in (no punch-out) ─────
const getActivePunchIns = async () => {
  const today = getTodayDate();
  return prisma.attendanceRecord.findMany({
    where: {
      date: today,
      punchInTime: { not: null },
      punchOutTime: null,
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
        },
      },
    },
  });
};

// ── Send reminder notification ─────────────────────────────────
export const sendPunchOutReminders = async (isUrgent: boolean = false): Promise<void> => {
  try {
    const activeRecords = await getActivePunchIns();
    if (activeRecords.length === 0) {
      console.log(`[Cron] No active punch-ins found. Skipping ${isUrgent ? 'urgent ' : ''}reminder.`);
      return;
    }

    const title = isUrgent
      ? '⚠️ Punch Out Time Almost Up!'
      : '🕙 Punch Out Reminder';

    const message = isUrgent
      ? 'Your auto punch-out is in 15 minutes (10:30 PM). Extend your time if you need to work longer.'
      : 'It\'s 10:00 PM. Please punch out soon. Auto punch-out will happen at 10:30 PM.';

    const notifications = activeRecords.map((record) => ({
      userId: record.employee.userId,
      title,
      message,
      type: 'INFO' as any,
      isRead: false,
      linkUrl: '/employee/attendance',
    }));

    await prisma.notification.createMany({ data: notifications });

    console.log(`[Cron] Sent ${isUrgent ? 'urgent ' : ''}punch-out reminders to ${notifications.length} employees.`);
  } catch (error) {
    console.error('[Cron] Error sending punch-out reminders:', error);
  }
};

// ── Auto Punch Out ─────────────────────────────────────────────
export const autoPunchOut = async (): Promise<void> => {
  try {
    const activeRecords = await getActivePunchIns();
    if (activeRecords.length === 0) {
      console.log('[Cron] No active punch-ins found for auto punch-out.');
      return;
    }

    const now = new Date();
    let autoPunchedCount = 0;

    for (const record of activeRecords) {
      // Check if the employee has an extended deadline
      const deadline = record.autoPunchOutTime || getDefaultAutoPunchOutTime();

      // Only auto-punch-out if we've passed their deadline
      if (now < deadline) {
        console.log(`[Cron] Skipping ${record.employee.firstName} ${record.employee.lastName} — deadline is ${deadline.toISOString()}, not yet reached.`);
        continue;
      }

      const punchInTime = record.punchInTime!;
      const workHours = parseFloat(((now.getTime() - punchInTime.getTime()) / (1000 * 60 * 60)).toFixed(2));

      // Update the attendance record
      await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          punchOutTime: now,
          workHours,
          status: 'PRESENT',
          isAutoPunchedOut: true,
          autoPunchOutNote: `Auto-punched out by system at ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST`,
        },
      });

      // Notify the employee
      await prisma.notification.create({
        data: {
          userId: record.employee.userId,
          title: '🔴 Auto Punch-Out',
          message: `You were automatically punched out at ${now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true })} IST. Total work hours: ${workHours.toFixed(1)}h.`,
          type: 'WARNING' as any,
          isRead: false,
          linkUrl: '/employee/attendance',
        },
      });

      autoPunchedCount++;
      console.log(`[Cron] Auto-punched out: ${record.employee.firstName} ${record.employee.lastName} (${workHours.toFixed(1)}h)`);
      
      // Check for Comp Off
      processCompOffForAttendance(record.id).catch(err => console.error(err));
    }

    console.log(`[Cron] Auto-punch-out complete. Processed ${autoPunchedCount}/${activeRecords.length} records.`);
  } catch (error) {
    console.error('[Cron] Error during auto punch-out:', error);
  }
};

// ── Schedule all cron jobs ─────────────────────────────────────
export const startAttendanceCronJobs = (): void => {
  // IST times -> UTC cron schedules
  // 10:00 PM IST = 16:30 UTC -> cron: "30 16 * * *"
  // 10:15 PM IST = 16:45 UTC -> cron: "45 16 * * *"
  // 10:30 PM IST = 17:00 UTC -> cron: "0 17 * * *"
  // Also run auto-punch-out check every 5 minutes from 17:00 to 17:30 UTC
  // to catch extended deadlines: "0,5,10,15,20,25,30 17 * * *"

  // We use setInterval-based scheduling since node-cron is not installed
  // This avoids adding a new dependency

  const checkAndRunSchedule = () => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();

    // 10:00 PM IST = 16:30 UTC
    if (utcHours === 16 && utcMinutes === 30) {
      console.log('[Cron] Triggering 10:00 PM IST reminder...');
      sendPunchOutReminders(false);
    }

    // 10:15 PM IST = 16:45 UTC
    if (utcHours === 16 && utcMinutes === 45) {
      console.log('[Cron] Triggering 10:15 PM IST urgent reminder...');
      sendPunchOutReminders(true);
    }

    // 10:30 PM IST = 17:00 UTC — auto punch-out
    // Also run every 5 min for next 30 min to catch extended deadlines
    if (utcHours === 17 && utcMinutes >= 0 && utcMinutes <= 30 && utcMinutes % 5 === 0) {
      console.log('[Cron] Running auto-punch-out check...');
      autoPunchOut();
    }

    // 11:30 PM IST = 18:00 UTC — final sweep for max extensions
    if (utcHours === 18 && utcMinutes === 0) {
      console.log('[Cron] Final auto-punch-out sweep (11:30 PM IST)...');
      autoPunchOut();
    }
  };

  // Check every minute
  setInterval(checkAndRunSchedule, 60 * 1000);

  console.log('⏰ Attendance cron jobs scheduled:');
  console.log('   • 10:00 PM IST — First punch-out reminder');
  console.log('   • 10:15 PM IST — Urgent punch-out reminder');
  console.log('   • 10:30 PM IST — Auto punch-out (+ every 5 min for extensions)');
  console.log('   • 11:30 PM IST — Final sweep for max-extended sessions');
};
