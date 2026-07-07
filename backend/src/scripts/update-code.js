require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  const employees = await prisma.employee.findMany();
  for (const e of employees) {
    if (e.employeeCode && (e.employeeCode.startsWith('NVA-') || e.employeeCode.startsWith('NAPA-'))) {
      const newCode = e.employeeCode.replace('NVA-', 'NAP-').replace('NAPA-', 'NAP-');
      await prisma.employee.update({
        where: { id: e.id },
        data: { employeeCode: newCode }
      });
      console.log(`Updated ${e.employeeCode} to ${newCode}`);
    }
  }
}
update();
