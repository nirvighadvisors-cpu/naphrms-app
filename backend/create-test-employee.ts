import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'test.employee@nirvighadvisors.com';
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // get sales department
  const dept = await prisma.department.findFirst({ where: { code: 'SALES' } });

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        passwordHash
      }
    });
  } else {
    user = await prisma.user.update({
      where: { email },
      data: { passwordHash, status: 'ACTIVE' }
    });
  }

  let emp = await prisma.employee.findUnique({ where: { userId: user.id } });
  if (!emp && dept) {
    emp = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeCode: 'NAPS-0010',
        firstName: 'Test',
        lastName: 'Employee',
        departmentId: dept.id,
        dateOfJoining: new Date(),
        designation: 'Sales Executive',
        employmentType: 'FULL_TIME',
        status: 'ACTIVE'
      }
    });
  }

  console.log('Test employee created/updated: test.employee@nirvighadvisors.com / password123');
  
  // Also reset admin password just in case
  await prisma.user.update({
    where: { email: 'admin@nirvighadvisors.com' },
    data: { passwordHash: await bcrypt.hash('password123', 10) }
  });
  console.log('Admin password reset to: password123');
}

main().finally(() => prisma.$disconnect());
