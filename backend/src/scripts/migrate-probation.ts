import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data migration for probation fields...');
  
  // Find all employees where isProfileComplete is true but profileCompletedAt is null
  const employees = await prisma.employee.findMany({
    where: {
      isProfileComplete: true,
      profileCompletedAt: null,
    },
  });

  console.log(`Found ${employees.length} employees to migrate.`);

  for (const emp of employees) {
    // Default to dateOfJoining if we don't know exact profile completion
    const completedAt = emp.dateOfJoining;
    
    // Add 3 months
    const endsAt = new Date(completedAt);
    endsAt.setMonth(endsAt.getMonth() + 3);

    // Update the employee
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        profileCompletedAt: completedAt,
        probationEndsAt: endsAt,
        isProbationLeaveCredited: false, // We'll let the cron job evaluate and credit if they passed 3 months
      },
    });

    console.log(`Migrated ${emp.firstName} ${emp.lastName} -> Probation ends: ${endsAt.toISOString().split('T')[0]}`);
  }

  console.log('Migration complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
