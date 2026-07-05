import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeCode: true,
      user: {
        select: {
          email: true,
          role: true
        }
      }
    }
  });
  console.log('Employees:', employees);

  const payslips = await prisma.payslip.findMany();
  console.log('Payslips:', payslips);

  const documents = await prisma.employeeDocument.findMany();
  console.log('Documents:', documents);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
