import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting full database wipe of users and employee records...');

  // 1. Delete all child records associated with employees/users
  await prisma.payslip.deleteMany({});
  await prisma.expenseItem.deleteMany({});
  await prisma.expenseClaim.deleteMany({});
  await prisma.regularizationRequest.deleteMany({});
  await prisma.attendanceRecord.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.goal.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.employeeDocument.deleteMany({});
  await prisma.dailyLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // 2. Delete all employees and users
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('Successfully deleted all existing employees, users, and their related records.');

  // 3. Ensure we have the "Accounts" department since that's usually where HR admins sit
  let accounts = await prisma.department.findUnique({ where: { code: 'ACC' } });
  if (!accounts) {
    accounts = await prisma.department.create({
      data: {
        name: 'Accounts',
        code: 'ACC',
        codeInitial: 'A',
      },
    });
  }

  // 4. Create the new main admin HR user
  const email = 'nirvighadvisors@gmail.com';
  const rawPassword = '#Devangsir9321027727';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const adminUser = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'HR_ADMIN',
      status: 'ACTIVE',
    },
  });

  await prisma.employee.create({
    data: {
      userId: adminUser.id,
      employeeCode: 'NAPA-0001',
      firstName: 'Devang',
      lastName: 'Katwa',
      departmentId: accounts.id,
      dateOfJoining: new Date(),
      designation: 'HR Administrator',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      isProfileComplete: true,
    },
  });

  // 5. Reset global sequence
  await prisma.globalSequence.upsert({
    where: { id: 1 },
    update: { nextValue: 2 },
    create: { id: 1, nextValue: 2 }
  });

  console.log('Successfully created new HR Admin: Devang Katwa');
  console.log(`Email: ${email}`);
  console.log(`Password: ${rawPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
