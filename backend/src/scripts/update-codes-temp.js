const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const employees = await prisma.employee.findMany({
    select: { id: true, firstName: true, lastName: true, employeeCode: true }
  });
  console.log(JSON.stringify(employees, null, 2));

  // update all NVA to NAP
  for (const emp of employees) {
    if (emp.employeeCode && emp.employeeCode.startsWith('NVA-')) {
      const newCode = emp.employeeCode.replace('NVA-', 'NAP-');
      await prisma.employee.update({
        where: { id: emp.id },
        data: { employeeCode: newCode }
      });
      console.log(`Updated ${emp.employeeCode} to ${newCode}`);
    } else if (emp.employeeCode && emp.employeeCode.startsWith('NAPA-')) {
      const newCode = emp.employeeCode.replace('NAPA-', 'NAP-');
      await prisma.employee.update({
        where: { id: emp.id },
        data: { employeeCode: newCode }
      });
      console.log(`Updated ${emp.employeeCode} to ${newCode}`);
    }
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
