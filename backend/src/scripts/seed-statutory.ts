import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding statutory rules...');

  // PF
  await prisma.statutoryRule.upsert({
    where: { code: 'PF' },
    update: {},
    create: {
      code: 'PF',
      name: 'Provident Fund (PF)',
      description: 'Employee Provident Fund',
      ruleType: 'PERCENTAGE',
      baseComponent: 'BASIC',
      employeeRate: 12,
      employerRate: 13,
      wageCap: 15000,
      isActive: true,
      state: 'ALL',
    },
  });

  // ESI
  await prisma.statutoryRule.upsert({
    where: { code: 'ESI' },
    update: {},
    create: {
      code: 'ESI',
      name: 'Employee State Insurance (ESI)',
      description: 'Health Insurance',
      ruleType: 'PERCENTAGE',
      baseComponent: 'GROSS',
      employeeRate: 0.75,
      employerRate: 3.25,
      wageCap: 21000,
      isActive: true,
      state: 'ALL',
    },
  });

  // PT Maharashtra
  await prisma.statutoryRule.upsert({
    where: { code: 'PT_MH' },
    update: {},
    create: {
      code: 'PT_MH',
      name: 'Professional Tax (Maharashtra)',
      description: 'State tax for MH',
      ruleType: 'SLAB',
      baseComponent: 'GROSS',
      slabConfig: [
        { min: 0, max: 7500, value: 0 },
        { min: 7501, max: 10000, value: 175 },
        { min: 10001, max: 9999999, value: 200 } // In Feb it's 300, but 200 standard
      ],
      isActive: true,
      state: 'MH',
    },
  });

  console.log('Seeded statutory rules.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
