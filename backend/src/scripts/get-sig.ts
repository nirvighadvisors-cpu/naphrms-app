import prisma from '../config/database';

async function main() {
  const employees = await prisma.employee.findMany({
    select: { id: true, firstName: true, signatureUrl: true }
  });
  console.log(employees);
}

main().catch(console.error);
