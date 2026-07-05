const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const run = await prisma.payrollRun.findFirst({
    where: { month: 6, year: 2026 }
  });

  if (run) {
    await prisma.$transaction([
      prisma.payslipLineItem.deleteMany({ where: { payslip: { payrollRunId: run.id } } }),
      prisma.payslip.deleteMany({ where: { payrollRunId: run.id } }),
      prisma.payrollRun.delete({ where: { id: run.id } }),
    ]);
    console.log('Successfully deleted the locked run for June 2026.');
  } else {
    console.log('Run not found.');
  }

  // Also update Neha's basic salary to 100000 just in case the API failed to do it earlier
  const neha = await prisma.employee.findFirst({ where: { firstName: 'Neha' } });
  if (neha) {
    await prisma.employee.update({
      where: { id: neha.id },
      data: { basicSalary: 100000 }
    });
    console.log('Updated Neha basic salary to 100000.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
