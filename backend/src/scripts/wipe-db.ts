import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function wipe() {
  console.log("Starting wipe process...");

  // Find Admin
  const admin = await prisma.user.findFirst({
    where: { 
      role: 'HR_ADMIN',
      employee: {
        firstName: { contains: 'Devang', mode: 'insensitive' },
        lastName: { contains: 'Katwa', mode: 'insensitive' }
      }
    },
    include: { employee: true }
  });

  if (!admin) {
    console.log("No HR_ADMIN 'Devang Katwa' found, aborting.");
    return;
  }

  console.log(`Admin found: ${admin.email}, Employee ID: ${admin.employee?.id}`);

  const excludeUserId = admin.id;
  const excludeEmployeeId = admin.employee?.id;

  // Wipe dependencies first
  console.log("Deleting Leave Requests...");
  await prisma.leaveRequest.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });
  
  console.log("Deleting Leave Balances...");
  await prisma.leaveBalance.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Regularization Requests...");
  await prisma.regularizationRequest.deleteMany({ where: { attendance: { employeeId: { not: excludeEmployeeId } } } });

  console.log("Deleting Attendance Records...");
  await prisma.attendanceRecord.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Payslips...");
  await prisma.payslip.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Expenses...");
  await prisma.expenseClaim.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Reviews...");
  await prisma.review.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Goals...");
  await prisma.goal.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Employee Documents...");
  await prisma.employeeDocument.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Status History...");
  await prisma.employeeStatusHistory.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Tickets and Comments...");
  await prisma.ticketComment.deleteMany({ where: { authorId: { not: excludeUserId } } });
  await prisma.ticket.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Surveys...");
  await prisma.surveyResponse.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  console.log("Deleting Announcements and Reads...");
  await prisma.announcementRead.deleteMany({ where: { userId: { not: excludeUserId } } });
  await prisma.announcement.deleteMany({ where: { authorId: { not: excludeUserId } } });

  console.log("Deleting Notifications and Audit Logs...");
  await prisma.notification.deleteMany({ where: { userId: { not: excludeUserId } } });
  await prisma.auditLog.deleteMany({ where: { userId: { not: excludeUserId } } });

  console.log("Deleting Daily Logs...");
  await prisma.dailyLog.deleteMany({ where: { employeeId: { not: excludeEmployeeId } } });

  // Unlink managers
  console.log("Unlinking managers...");
  await prisma.employee.updateMany({
    where: { managerId: { not: null } },
    data: { managerId: null }
  });

  console.log("Deleting Employees...");
  await prisma.employee.deleteMany({ where: { id: { not: excludeEmployeeId } } });

  console.log("Deleting Users...");
  await prisma.user.deleteMany({ where: { id: { not: excludeUserId } } });

  // Reset sequence to 2
  console.log("Resetting sequence...");
  await prisma.globalSequence.update({
    where: { id: 1 },
    data: { nextValue: 2 }
  });

  // Wipe Supabase Storage (employees bucket)
  console.log("Wiping Supabase Storage...");
  const { data: files, error } = await supabase.storage.from('employees').list();
  if (error) {
    console.log("Error listing files:", error.message);
  } else if (files && files.length > 0) {
    const folders = files.filter(f => !f.id); 
    for (const folder of folders) {
      const { data: subFiles } = await supabase.storage.from('employees').list(folder.name);
      if (subFiles) {
        const filePaths = subFiles.map(f => `${folder.name}/${f.name}`);
        if (filePaths.length > 0) {
          await supabase.storage.from('employees').remove(filePaths);
          console.log(`Removed ${filePaths.length} files from ${folder.name}`);
        }
      }
      const { data: docFiles } = await supabase.storage.from('employees').list(`${folder.name}/documents`);
      if (docFiles && docFiles.length > 0) {
        const docPaths = docFiles.map(f => `${folder.name}/documents/${f.name}`);
        await supabase.storage.from('employees').remove(docPaths);
        console.log(`Removed ${docPaths.length} files from ${folder.name}/documents`);
      }
    }
  }

  console.log("Done! Everything wiped except Devang Katwa.");
}

wipe().catch(console.error);
