const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  const e = await prisma.employee.findFirst();
  if (e) {
    console.log("Current code:", e.employeeCode);
    await prisma.employee.update({
      where: { id: e.id },
      data: { employeeCode: 'NVA-0001' }
    });
    console.log("Updated to NVA-0001");
  }
}
update();
