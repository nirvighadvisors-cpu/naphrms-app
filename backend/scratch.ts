import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    select: { id: true, firstName: true, lastName: true, basicSalary: true, salaryStructureId: true }
  });
  console.log(employees);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
