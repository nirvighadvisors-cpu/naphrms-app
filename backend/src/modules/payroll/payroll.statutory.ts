import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface StatutoryCalculationContext {
  basicSalary: number;
  grossSalary: number;
  isEsicCovered?: boolean;
  taxRegime?: string;
}

export interface StatutoryDeduction {
  code: string;
  name: string;
  employeeDeduction: number;
  employerContribution: number;
  metadata?: any;
}

export async function calculateStatutoryDeductions(
  context: StatutoryCalculationContext,
  state: string = 'MH'
): Promise<StatutoryDeduction[]> {
  const rules = await prisma.statutoryRule.findMany({
    where: { isActive: true },
  });

  const results: StatutoryDeduction[] = [];

  for (const rule of rules) {
    if (rule.state && rule.state !== state && rule.state !== 'ALL') {
      continue;
    }

    if ((rule.code === 'ESI' || rule.code === 'ESIC') && !context.isEsicCovered) {
      continue;
    }

    let baseAmount = 0;
    if (rule.baseComponent === 'BASIC') baseAmount = context.basicSalary;
    else if (rule.baseComponent === 'GROSS') baseAmount = context.grossSalary;

    let employeeDeduction = 0;
    let employerContribution = 0;
    let metadata: any = null;

    if (rule.ruleType === 'PERCENTAGE') {
      let calcBase = baseAmount;
      if (rule.wageCap && calcBase > rule.wageCap) {
        calcBase = rule.wageCap;
      }
      employeeDeduction = (calcBase * rule.employeeRate) / 100;
      employerContribution = (calcBase * rule.employerRate) / 100;
    } else if (rule.ruleType === 'SLAB' && rule.slabConfig) {
      const slabs = rule.slabConfig as Array<{ min: number; max: number; value: number }>;
      const slab = slabs.find((s) => baseAmount >= s.min && baseAmount <= s.max);
      if (slab) {
        employeeDeduction = slab.value; // typically slabs define the employee deduction (e.g. PT)
      }
    } else if (rule.ruleType === 'TAX_SLAB' && rule.slabConfig) {
      // Determine if this tax rule applies based on selected regime
      if ((rule.code === 'TDS_OLD' && context.taxRegime !== 'OLD') || 
          (rule.code === 'TDS_NEW' && context.taxRegime === 'OLD')) {
        continue;
      }

      const config = rule.slabConfig as {
        standardDeduction: number;
        rebateLimit: number;
        rebateAmount: number;
        slabs: Array<{ min: number; max: number; rate: number }>;
      };

      const annualGross = baseAmount * 12;
      let taxableIncome = annualGross - (config.standardDeduction || 0);
      if (taxableIncome < 0) taxableIncome = 0;

      let annualTax = 0;

      if (taxableIncome > config.rebateLimit) {
        for (const slab of config.slabs) {
          if (taxableIncome > slab.min) {
            const taxableInThisSlab = Math.min(taxableIncome, slab.max) - slab.min;
            if (taxableInThisSlab > 0) {
              annualTax += (taxableInThisSlab * slab.rate) / 100;
            }
          }
        }
      }

      // Add a 4% Health and Education Cess to the annual tax
      if (annualTax > 0) {
        annualTax += annualTax * 0.04;
      }

      employeeDeduction = annualTax / 12;
      metadata = {
        taxRegime: context.taxRegime,
        annualGross,
        standardDeduction: config.standardDeduction,
        taxableIncome,
        annualTax,
      };
    }

    if (employeeDeduction > 0 || employerContribution > 0) {
      results.push({
        code: rule.code,
        name: rule.name,
        employeeDeduction: Math.round(employeeDeduction),
        employerContribution: Math.round(employerContribution),
        metadata,
      });
    }
  }

  return results;
}
