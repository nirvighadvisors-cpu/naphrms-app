import { PrismaClient, DocumentType } from '@prisma/client';
import supabase from '../config/supabase';

const prisma = new PrismaClient();
const BUCKET_NAME = 'hrms-documents';

async function cleanup() {
  console.log('Starting cleanup process...');

  try {
    // 1. Find the main admin (Devang Katwa)
    const adminEmployee = await prisma.employee.findFirst({
      where: {
        firstName: 'Devang',
        lastName: 'Katwa'
      },
      include: { user: true }
    });

    if (!adminEmployee) {
        console.log('Could not find Devang Katwa employee record.');
        return;
    }

    const adminUser = adminEmployee.user;
    console.log(`Preserving admin user: ${adminUser.email} (Employee: ${adminEmployee.firstName} ${adminEmployee.lastName})`);

    // Get all users EXCEPT the admin
    const usersToDelete = await prisma.user.findMany({
      where: {
        id: { not: adminUser.id }
      },
      include: { employee: true }
    });

    const userIds = usersToDelete.map(u => u.id);
    const employeeIds = usersToDelete.map(u => u.employee?.id).filter(id => id) as string[];

    console.log(`Found ${userIds.length} users and ${employeeIds.length} employees to delete.`);

    // 2. Clean up Supabase Storage for Document Vault (KYC)
    // We only delete files in storage for the deleted employees if they are KYC docs.
    if (employeeIds.length > 0) {
      const docsToDelete = await prisma.employeeDocument.findMany({
        where: { employeeId: { in: employeeIds } }
      });

      const storagePathsToDelete: string[] = [];

      for (const doc of docsToDelete) {
        if (doc.type !== DocumentType.OFFER_LETTER && doc.type !== DocumentType.APPOINTMENT_LETTER) {
           // doc.fileUrl is the storagePath stored in DB (e.g. 'documents/filename.pdf')
           storagePathsToDelete.push(doc.fileUrl);
        } else {
           console.log(`Preserved (not deleted from storage): ${doc.fileUrl}`);
        }
      }

      if (storagePathsToDelete.length > 0) {
        console.log(`Deleting ${storagePathsToDelete.length} files from Supabase Storage...`);
        const { error } = await supabase.storage.from(BUCKET_NAME).remove(storagePathsToDelete);
        if (error) {
           console.error('Failed to delete files from Supabase:', error);
        } else {
           console.log('Successfully deleted files from Supabase.');
        }
      }
    }

    // 3. Delete database records. Order matters due to FK constraints.
    console.log('Deleting database records...');
    
    if (employeeIds.length > 0) {
      // Delete Employee Status History
      await prisma.employeeStatusHistory.deleteMany({ where: { employeeId: { in: employeeIds } } });
      
      // Delete Daily Logs
      await prisma.dailyLog.deleteMany({ where: { employeeId: { in: employeeIds } } });
      
      // Delete Ticket Comments & Tickets
      await prisma.ticketComment.deleteMany({ where: { authorId: { in: userIds } } });
      await prisma.ticket.deleteMany({ where: { employeeId: { in: employeeIds } } });
      
      // Delete Survey Responses
      await prisma.surveyResponse.deleteMany({ where: { employeeId: { in: employeeIds } } });
      
      // Delete Recognitions
      await prisma.recognition.deleteMany({
          where: { OR: [ { senderId: { in: employeeIds } }, { receiverId: { in: employeeIds } } ] }
      });
      
      // Delete Attendance & Regularization
      const attendances = await prisma.attendanceRecord.findMany({ where: { employeeId: { in: employeeIds } } });
      if (attendances.length > 0) {
         await prisma.regularizationRequest.deleteMany({ where: { attendanceId: { in: attendances.map(a => a.id) } } });
      }
      await prisma.attendanceRecord.deleteMany({ where: { employeeId: { in: employeeIds } } });

      // Delete Leaves
      await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: employeeIds } } });
      await prisma.leaveBalance.deleteMany({ where: { employeeId: { in: employeeIds } } });

      // Delete Payslips & Line Items
      const payslips = await prisma.payslip.findMany({ where: { employeeId: { in: employeeIds } } });
      if (payslips.length > 0) {
         await prisma.payslipLineItem.deleteMany({ where: { payslipId: { in: payslips.map(p => p.id) } } });
      }
      await prisma.payslip.deleteMany({ where: { employeeId: { in: employeeIds } } });

      // Delete Expenses & Items
      const expenses = await prisma.expenseClaim.findMany({ where: { employeeId: { in: employeeIds } } });
      if (expenses.length > 0) {
         await prisma.expenseItem.deleteMany({ where: { claimId: { in: expenses.map(e => e.id) } } });
      }
      await prisma.expenseClaim.deleteMany({ where: { employeeId: { in: employeeIds } } });

      // Delete Goals & Reviews
      await prisma.goal.deleteMany({ where: { employeeId: { in: employeeIds } } });
      await prisma.review.deleteMany({ where: { employeeId: { in: employeeIds } } });

      // Delete Documents
      await prisma.employeeDocument.deleteMany({ where: { employeeId: { in: employeeIds } } });

      // Remove Manager relations first to avoid constraint issues
      await prisma.employee.updateMany({
          where: { managerId: { in: employeeIds } },
          data: { managerId: null }
      });

      // Delete Employees
      await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
    }

    if (userIds.length > 0) {
      // Delete Notifications
      await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.announcementRead.deleteMany({ where: { userId: { in: userIds } } });

      // Delete Audit logs
      await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });

      // Delete Users
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
