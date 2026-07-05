import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Delete existing departments (they're old placeholder data)
  console.log('Cleaning up old departments...');
  
  // First check if any employees reference these departments
  const empCount = await prisma.employee.count();
  if (empCount > 0) {
    console.log(`Found ${empCount} employees - need to handle department references.`);
    // For safety, just update existing depts with temp codes
    const depts = await prisma.department.findMany();
    for (const dept of depts) {
      const code = dept.name.substring(0, 3).toUpperCase();
      console.log(`Updating dept ${dept.name} with temp code ${code}`);
    }
  } else {
    // No employees, safe to delete all departments
    await prisma.department.deleteMany();
    console.log('Deleted old departments.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
