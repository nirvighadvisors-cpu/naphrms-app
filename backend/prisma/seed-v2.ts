// ============================================================
// NAP HRMS — Database Seed (v2)
// ============================================================
// Seeds: GlobalSequence, Departments (with hierarchy), and
// links the existing admin user to an Employee record.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── 1. Global Sequence ──────────────────────────────────────
  console.log('🔢 Creating global sequence...');
  await prisma.globalSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nextValue: 1 },
  });
  console.log('   ✅ Global sequence ready\n');

  // ── 2. Departments ──────────────────────────────────────────
  console.log('📁 Creating departments...');

  // Top-level departments
  const sales = await prisma.department.upsert({
    where: { code: 'SALES' },
    update: {},
    create: {
      name: 'Sales',
      code: 'SALES',
      codeInitial: 'S',
    },
  });
  console.log(`   ✅ Sales (${sales.id})`);

  const gre = await prisma.department.upsert({
    where: { code: 'GRE' },
    update: {},
    create: {
      name: 'GRE',
      code: 'GRE',
      codeInitial: 'G',
    },
  });
  console.log(`   ✅ GRE (${gre.id})`);

  const accounts = await prisma.department.upsert({
    where: { code: 'ACC' },
    update: {},
    create: {
      name: 'Accounts',
      code: 'ACC',
      codeInitial: 'A',
    },
  });
  console.log(`   ✅ Accounts (${accounts.id})`);

  // Sub-departments of Sales
  const sourcing = await prisma.department.upsert({
    where: { code: 'SRC' },
    update: {},
    create: {
      name: 'Sourcing',
      code: 'SRC',
      codeInitial: 'S',
      parentId: sales.id,
    },
  });
  console.log(`   ✅ Sourcing (${sourcing.id}) → parent: Sales`);

  const closing = await prisma.department.upsert({
    where: { code: 'CLS' },
    update: {},
    create: {
      name: 'Closing',
      code: 'CLS',
      codeInitial: 'S',
      parentId: sales.id,
    },
  });
  console.log(`   ✅ Closing (${closing.id}) → parent: Sales`);

  console.log('   ✅ All departments created\n');

  // ── 3. Link Admin User to Employee ──────────────────────────
  const adminEmail = 'admin@nirvighadvisors.com';
  console.log(`👤 Linking admin user (${adminEmail}) to Employee record...`);

  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminUser) {
    console.log('   ⚠️  Admin user not found — skipping employee link.');
    console.log('   Run the original seed first to create the admin user.\n');
  } else {
    // Check if employee already exists for this user
    const existingEmployee = await prisma.employee.findUnique({
      where: { userId: adminUser.id },
    });

    if (existingEmployee) {
      console.log(`   ⏭️  Employee already exists: ${existingEmployee.employeeCode}\n`);
    } else {
      // Create the admin employee record
      const adminEmployee = await prisma.employee.create({
        data: {
          employeeCode: 'NAPA-0001',
          userId: adminUser.id,
          firstName: 'HR',
          lastName: 'Admin',
          designation: 'HR Manager',
          departmentId: accounts.id,
          dateOfJoining: new Date('2024-01-01'),
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
        },
      });
      console.log(`   ✅ Admin employee created: ${adminEmployee.employeeCode}`);

      // Update GlobalSequence to nextValue=2
      await prisma.globalSequence.update({
        where: { id: 1 },
        data: { nextValue: 2 },
      });
      console.log('   ✅ Global sequence updated to nextValue=2\n');
    }
  }

  console.log('══════════════════════════════════════════════');
  console.log('🎉 Database seeded successfully!');
  console.log('══════════════════════════════════════════════\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
