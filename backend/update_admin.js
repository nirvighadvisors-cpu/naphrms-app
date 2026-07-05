const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Create the new department "Administration HR" if it doesn't exist
    let dept = await prisma.department.findFirst({
      where: { name: 'Administration HR' }
    });

    if (!dept) {
      dept = await prisma.department.create({
        data: {
          name: 'Administration HR',
          description: 'Top-level administration and HR management',
        }
      });
      console.log('Created new department:', dept.name);
    } else {
      console.log('Department already exists:', dept.name);
    }

    // 2. Find Devang by his email
    const email = 'nirvighadvisors@gmail.com';
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true }
    });

    if (user && user.employee) {
      // 3. Update his employee record
      const updatedEmployee = await prisma.employee.update({
        where: { id: user.employee.id },
        data: {
          departmentId: dept.id,
          designation: 'Director'
        }
      });
      console.log('Successfully updated Devang. New Department:', dept.name, '| New Designation:', updatedEmployee.designation);
    } else {
      console.log('User or Employee record not found for', email);
    }
  } catch (error) {
    console.error('Error updating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
