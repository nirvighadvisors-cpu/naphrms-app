import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tdsOld = {
    code: 'TDS_OLD',
    name: 'Income Tax (Old Regime)',
    description: 'Income tax calculation based on the Old Tax Regime slabs and standard deduction.',
    ruleType: 'TAX_SLAB',
    baseComponent: 'GROSS', // we will calculate annual taxable income from gross
    isActive: true,
    slabConfig: {
      standardDeduction: 50000,
      rebateLimit: 500000,
      rebateAmount: 12500,
      slabs: [
        { min: 0, max: 250000, rate: 0 },
        { min: 250000, max: 500000, rate: 5 },
        { min: 500000, max: 1000000, rate: 20 },
        { min: 1000000, max: 999999999, rate: 30 }
      ]
    }
  };

  const tdsNew = {
    code: 'TDS_NEW',
    name: 'Income Tax (New Regime)',
    description: 'Income tax calculation based on the New Tax Regime slabs and standard deduction.',
    ruleType: 'TAX_SLAB',
    baseComponent: 'GROSS',
    isActive: true,
    slabConfig: {
      standardDeduction: 75000,
      rebateLimit: 700000,
      rebateAmount: 25000,
      slabs: [
        { min: 0, max: 300000, rate: 0 },
        { min: 300000, max: 700000, rate: 5 },
        { min: 700000, max: 1000000, rate: 10 },
        { min: 1000000, max: 1200000, rate: 15 },
        { min: 1200000, max: 1500000, rate: 20 },
        { min: 1500000, max: 999999999, rate: 30 }
      ]
    }
  };

  console.log('Upserting TDS_OLD...');
  await prisma.statutoryRule.upsert({
    where: { code: tdsOld.code },
    update: {
      name: tdsOld.name,
      description: tdsOld.description,
      ruleType: tdsOld.ruleType,
      baseComponent: tdsOld.baseComponent,
      isActive: tdsOld.isActive,
      slabConfig: tdsOld.slabConfig,
    },
    create: tdsOld,
  });

  console.log('Upserting TDS_NEW...');
  await prisma.statutoryRule.upsert({
    where: { code: tdsNew.code },
    update: {
      name: tdsNew.name,
      description: tdsNew.description,
      ruleType: tdsNew.ruleType,
      baseComponent: tdsNew.baseComponent,
      isActive: tdsNew.isActive,
      slabConfig: tdsNew.slabConfig,
    },
    create: tdsNew,
  });

  console.log('Tax slabs seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
