const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const employeesToAdd = [
    {
      firstName: 'Gaurav Kumar',
      lastName: 'Bahre',
      employeeCode: 'NAPS-0003',
      departmentCode: 'SRC', // Sourcing
      email: 'gaurav.bahre@inactive.local'
    },
    {
      firstName: 'Avinash Rajkumar',
      lastName: 'Singh',
      employeeCode: 'NAPS-0004',
      departmentCode: 'SRC',
      email: 'avinash.singh@inactive.local'
    },
    {
      firstName: 'Prasad Shivram',
      lastName: 'Kerkar',
      employeeCode: 'NAPS-0005',
      departmentCode: 'SRC',
      email: 'prasad.kerkar@inactive.local'
    },
    {
      firstName: 'Smiti Shashikant',
      lastName: 'Waghela',
      employeeCode: 'NAPC-0006',
      departmentCode: 'CLS', // Closing
      email: 'smiti.waghela@inactive.local'
    }
  ];

  const hashedPassword = await bcrypt.hash('inactive123', 10);

  for (const emp of employeesToAdd) {
    console.log(`Processing ${emp.firstName} ${emp.lastName}...`);
    
    // Find department
    const dept = await prisma.department.findUnique({
      where: { code: emp.departmentCode }
    });

    if (!dept) {
      console.log(`Department ${emp.departmentCode} not found! Skipping.`);
      continue;
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({ where: { email: emp.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: emp.email,
          passwordHash: hashedPassword,
          role: 'EMPLOYEE',
          status: 'INACTIVE',
          employee: {
            create: {
              employeeCode: emp.employeeCode,
              firstName: emp.firstName,
              lastName: emp.lastName,
              designation: 'Sales Executive',
              departmentId: dept.id,
              dateOfJoining: new Date('2025-01-01'), // dummy past date
              dateOfLeaving: new Date('2026-01-01'), // dummy past date
              status: 'INACTIVE',
              isProfileComplete: true,
              onboardingStep: 100
            }
          }
        },
        include: {
          employee: true
        }
      });
      console.log(`Created employee: ${user.employee.employeeCode} - ${user.employee.firstName} ${user.employee.lastName}`);
    } else {
      console.log(`User ${emp.email} already exists.`);
    }
  }

  console.log("Done adding inactive employees.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
