import { PrismaClient } from '@prisma/client';
import supabase from '../config/supabase';

const prisma = new PrismaClient();

async function deleteStorageFiles(folder: string) {
  const { data: files, error: listError } = await supabase.storage.from('hrms-documents').list(folder);
  if (listError) {
    console.error(`Error listing files in ${folder}:`, listError);
    return;
  }
  
  if (files && files.length > 0) {
    // Only delete actual files, skipping placeholders like .emptyFolderPlaceholder
    const filesToDelete = files.map(f => `${folder}/${f.name}`);
    
    // Deleting in batches of 100 to avoid limits
    for (let i = 0; i < filesToDelete.length; i += 100) {
      const batch = filesToDelete.slice(i, i + 100);
      const { error: delError } = await supabase.storage.from('hrms-documents').remove(batch);
      if (delError) {
        console.error(`Error deleting files in ${folder}:`, delError);
      } else {
        console.log(`Deleted ${batch.length} files from ${folder}`);
      }
    }
  }
}

async function cleanStorage() {
  console.log('Cleaning up Supabase Storage...');
  
  // Exclude these folders
  const excludeFolders = ['policy-documents', 'offer-letters', 'payslips'];
  
  // Common folders used in the system
  const foldersToCheck = [
    'pan-cards',
    'aadhaar',
    'bank-passbooks',
    'profile-photos',
    'cancelled-cheques',
    'education-certs',
    'experience-certs',
    'signatures',
    'fitness-certs',
    'receipts' // from ExpenseItem? we don't have explicit folder map for that but let's check
  ];
  
  for (const folder of foldersToCheck) {
    if (!excludeFolders.includes(folder)) {
      await deleteStorageFiles(folder);
    }
  }
}

async function main() {
  console.log('Starting system reset...');

  // 1. Identify Admin
  const admin = await prisma.employee.findFirst({
    where: {
      user: {
        email: 'nirvighadvisors@gmail.com'
      }
    }
  });

  if (!admin) {
    throw new Error('Admin employee not found!');
  }

  console.log(`Found Admin: ${admin.firstName} ${admin.lastName} (ID: ${admin.id})`);

  // 2. Identify all other employees
  const otherEmployees = await prisma.employee.findMany({
    where: {
      id: { not: admin.id }
    },
    include: {
      user: true
    }
  });

  const otherEmployeeIds = otherEmployees.map(e => e.id);
  const otherUserIds = otherEmployees.map(e => e.userId);

  console.log(`Found ${otherEmployees.length} other employee(s) to delete.`);

  if (otherEmployees.length > 0) {
    // Re-assign specific EmployeeDocuments and Payslips to Admin before deletion
    console.log('Re-assigning OFFER_LETTER and PAYSLIP to Admin...');
    await prisma.employeeDocument.updateMany({
      where: {
        employeeId: { in: otherEmployeeIds },
        type: 'OFFER_LETTER'
      },
      data: {
        employeeId: admin.id
      }
    });

    await prisma.payslip.updateMany({
      where: {
        employeeId: { in: otherEmployeeIds }
      },
      data: {
        employeeId: admin.id
      }
    });

    console.log('Deleting dependent records...');

    // Delete related records for other employees
    await prisma.dailyLog.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });
    
    // Tickets
    await prisma.ticketComment.deleteMany({ where: { authorId: { in: otherUserIds } } });
    await prisma.ticket.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });
    await prisma.ticket.deleteMany({ where: { assignedToId: { in: otherUserIds } } });
    
    // Surveys
    await prisma.surveyAnswer.deleteMany({ where: { response: { employeeId: { in: otherEmployeeIds } } } });
    await prisma.surveyResponse.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });
    
    // Recognition
    await prisma.recognition.deleteMany({ where: { senderId: { in: otherEmployeeIds } } });
    await prisma.recognition.deleteMany({ where: { receiverId: { in: otherEmployeeIds } } });

    // Attendance
    await prisma.regularizationRequest.deleteMany({ where: { attendance: { employeeId: { in: otherEmployeeIds } } } });
    await prisma.attendanceRecord.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });

    // Leave
    await prisma.leaveBalance.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });
    await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });

    // Expenses
    await prisma.expenseItem.deleteMany({ where: { claim: { employeeId: { in: otherEmployeeIds } } } });
    await prisma.expenseClaim.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });

    // Documents (excluding the re-assigned ones)
    await prisma.employeeDocument.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });

    // Goals & Reviews
    await prisma.goal.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });
    await prisma.review.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });

    // Employee Status History
    await prisma.employeeStatusHistory.deleteMany({ where: { employeeId: { in: otherEmployeeIds } } });
    await prisma.employeeStatusHistory.updateMany({ 
      where: { changedById: { in: otherUserIds } },
      data: { changedById: null }
    });

    // Delete the employees
    console.log('Deleting Employee records...');
    await prisma.employee.deleteMany({
      where: { id: { in: otherEmployeeIds } }
    });

    console.log('Cleaning up User foreign keys...');
    await prisma.auditLog.deleteMany({ where: { userId: { in: otherUserIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: otherUserIds } } });
    await prisma.announcementRead.deleteMany({ where: { userId: { in: otherUserIds } } });
    await prisma.announcement.updateMany({
      where: { authorId: { in: otherUserIds } },
      data: { authorId: admin.userId }
    });
    await prisma.ticket.updateMany({
      where: { assignedToId: { in: otherUserIds } },
      data: { assignedToId: null }
    });

    // Delete the users
    console.log('Deleting User records associated with employees...');
    await prisma.user.deleteMany({
      where: { id: { in: otherUserIds } }
    });
  }

  // Delete any remaining users except Admin
  console.log('Deleting any orphaned User records...');
  const allUsers = await prisma.user.findMany();
  const orphanedUserIds = allUsers.filter(u => u.id !== admin.userId).map(u => u.id);
  
  if (orphanedUserIds.length > 0) {
    console.log(`Found ${orphanedUserIds.length} orphaned users.`);
    await prisma.auditLog.deleteMany({ where: { userId: { in: orphanedUserIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: orphanedUserIds } } });
    await prisma.announcementRead.deleteMany({ where: { userId: { in: orphanedUserIds } } });
    await prisma.announcement.updateMany({
      where: { authorId: { in: orphanedUserIds } },
      data: { authorId: admin.userId }
    });
    await prisma.ticket.updateMany({
      where: { assignedToId: { in: orphanedUserIds } },
      data: { assignedToId: null }
    });
    
    await prisma.user.deleteMany({
      where: { id: { in: orphanedUserIds } }
    });
  }

  // 3. Reset GlobalSequence to 2
  console.log('Resetting GlobalSequence...');
  await prisma.globalSequence.updateMany({
    where: { id: 1 },
    data: { nextValue: 2 }
  });

  // 4. Clean Storage
  await cleanStorage();

  // Verification queries
  const employeeCount = await prisma.employee.count();
  const sequence = await prisma.globalSequence.findFirst();

  console.log('--- System Reset Complete ---');
  console.log(`Remaining Employees: ${employeeCount}`);
  console.log(`Next Employee ID Value: ${sequence?.nextValue}`);
}

main()
  .catch(e => {
    console.error('Error during reset:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
