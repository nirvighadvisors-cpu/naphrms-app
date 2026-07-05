import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database (Phase 4)...');

  // 1. Seed Global Sequence
  await prisma.globalSequence.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nextValue: 2, // Admin takes 1
    },
  });
  console.log('GlobalSequence seeded.');

  // 2. Seed Departments
  const sales = await prisma.department.upsert({
    where: { code: 'SALES' },
    update: {},
    create: {
      name: 'Sales',
      code: 'SALES',
      codeInitial: 'S',
    },
  });

  await prisma.department.upsert({
    where: { code: 'SRC' },
    update: {},
    create: {
      name: 'Sourcing',
      code: 'SRC',
      codeInitial: 'S',
      parentId: sales.id,
    },
  });

  await prisma.department.upsert({
    where: { code: 'CLS' },
    update: {},
    create: {
      name: 'Closing',
      code: 'CLS',
      codeInitial: 'S',
      parentId: sales.id,
    },
  });

  await prisma.department.upsert({
    where: { code: 'GRE' },
    update: {},
    create: {
      name: 'GRE',
      code: 'GRE',
      codeInitial: 'G',
    },
  });

  const accounts = await prisma.department.upsert({
    where: { code: 'ACC' },
    update: {},
    create: {
      name: 'Accounts',
      code: 'ACC',
      codeInitial: 'A',
    },
  });
  console.log('Departments seeded.');

  // 3. Seed Admin Employee
  const adminEmail = 'nirvighadvisors@gmail.com';
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        role: 'HR_ADMIN',
        status: 'ACTIVE',
      },
    });
  }

  // Create Employee record if it doesn't exist
  const adminEmp = await prisma.employee.findUnique({ where: { userId: adminUser.id } });
  if (!adminEmp) {
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
    console.log('Admin employee record seeded: Devang Katwa');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
