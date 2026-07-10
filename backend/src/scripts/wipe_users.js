const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function wipe() {
  const employeesToWipe = await prisma.employee.findMany({
    where: { user: { role: { not: 'HR_ADMIN' } } }
  });

  const empIds = employeesToWipe.map(e => e.id);
  const userIds = employeesToWipe.map(e => e.userId);

  console.log('Employees to wipe:', empIds);
  console.log('Users to wipe:', userIds);

  if (empIds.length === 0) {
    console.log('No employees to wipe');
    return;
  }

  // Set managers to null to break self-relations
  await prisma.employee.updateMany({
    where: { managerId: { in: empIds } },
    data: { managerId: null }
  });

  // Delete related data for Employees
  await prisma.dailyLog.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.ticket.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.surveyResponse.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.recognition.deleteMany({ where: { senderId: { in: empIds } } });
  await prisma.recognition.deleteMany({ where: { receiverId: { in: empIds } } });
  await prisma.attendanceRecord.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.leaveBalance.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.leaveRequest.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.payslip.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.expenseClaim.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.employeeDocument.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.goal.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.review.deleteMany({ where: { employeeId: { in: empIds } } });
  await prisma.employeeStatusHistory.deleteMany({ where: { employeeId: { in: empIds } } });

  // Delete the employees
  await prisma.employee.deleteMany({ where: { id: { in: empIds } } });

  // Delete related data for Users
  await prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log('Wipe complete');
}

wipe().catch(console.error).finally(() => prisma.$disconnect());
