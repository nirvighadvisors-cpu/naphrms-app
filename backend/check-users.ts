import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { employee: true }
  });
  console.log("Users in DB:", users.map(u => ({
    email: u.email,
    role: u.role,
    status: u.status,
    hasPassword: !!u.passwordHash,
    employeeName: u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : 'None'
  })));
}

main().finally(() => prisma.$disconnect());
