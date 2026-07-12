const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const email = "neha.gaja@gmail.com";
  const password = "#Neha7303";
  const employeeCode = "NAP-0002";
  const firstName = "Neha";
  const lastName = "Katwa";

  console.log(`Checking if user ${email} exists...`);
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log("User already exists.");
    return;
  }

  // Find department
  let dept = await prisma.department.findFirst({
    where: { name: { contains: "HR", mode: "insensitive" } }
  });
  if (!dept) {
    console.log("HR Department not found, creating one...");
    dept = await prisma.department.create({ data: { name: "Administration HR", code: "HR" } });
  }

  console.log(`Found department: ${dept.name} (${dept.id})`);

  console.log("Hashing password...");
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log("Creating user and employee...");
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      role: 'HR_ADMIN',
      status: 'ACTIVE',
      employee: {
        create: {
          employeeCode,
          firstName,
          lastName,
          designation: 'HR Administrator',
          departmentId: dept.id,
          dateOfJoining: new Date(),
          status: 'ACTIVE',
          isProfileComplete: true, // bypass onboarding
          onboardingStep: 100 // fully completed
        }
      }
    },
    include: {
      employee: true
    }
  });

  console.log("Created Admin successfully:");
  console.log(user.email, user.employee.employeeCode);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
