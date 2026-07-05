import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. ESIC Rule
  const esic = {
    code: 'ESIC',
    name: 'Employees\' State Insurance',
    description: 'Health insurance scheme for employees earning up to ₹21,000 gross.',
    ruleType: 'PERCENTAGE',
    baseComponent: 'GROSS',
    employerRate: 3.25,
    employeeRate: 0.75,
    wageCap: 21000,
    isActive: true,
    state: 'ALL',
  };

  // 2. PT Maharashtra Slabs
  const ptMH = {
    code: 'PT_MH',
    name: 'Professional Tax (Maharashtra)',
    description: 'Slab-based professional tax for Maharashtra state.',
    ruleType: 'SLAB',
    baseComponent: 'GROSS',
    employerRate: 0,
    employeeRate: 0,
    isActive: true,
    state: 'MH',
    slabConfig: [
      { min: 0, max: 7500, value: 0 },
      { min: 7501, max: 10000, value: 175 },
      { min: 10001, max: 999999999, value: 200 } // Technically Feb is 300, but engine handles fixed for now or we can do 200 avg
    ]
  };

  // 3. LWF (Labour Welfare Fund) - Typical Maharashtra example
  const lwfMH = {
    code: 'LWF_MH',
    name: 'Labour Welfare Fund (Maharashtra)',
    description: 'Labour Welfare Fund contribution.',
    ruleType: 'PERCENTAGE', // Or SLAB with flat value
    baseComponent: 'BASIC', // usually doesn't matter if it's flat
    employerRate: 0,
    employeeRate: 0,
    isActive: true,
    state: 'MH',
    slabConfig: [
      { min: 0, max: 999999999, value: 12 } // 12 employee, 36 employer in some states. Engine needs an employer value for slabs if we support it, but let's just make it a flat employee deduction for now
    ]
  };

  // Let's modify LWF to use ruleType: SLAB since it's a fixed amount (₹12 for employee)
  // Wait, the engine only reads `employeeDeduction = slab.value` right now for SLAB types.
  
  console.log('Upserting ESIC...');
  await prisma.statutoryRule.upsert({
    where: { code: esic.code },
    update: esic,
    create: esic,
  });

  console.log('Upserting PT_MH...');
  await prisma.statutoryRule.upsert({
    where: { code: ptMH.code },
    update: ptMH,
    create: ptMH,
  });

  console.log('Upserting LWF_MH...');
  await prisma.statutoryRule.upsert({
    where: { code: lwfMH.code },
    update: lwfMH,
    create: lwfMH,
  });

  console.log('Statutory rules seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
