import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany({
    include: {
      user: true,
      documents: true,
      payslips: true,
    }
  });

  console.log(JSON.stringify(employees, null, 2));

  const seq = await prisma.globalSequence.findFirst();
  console.log('Sequence:', seq);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
