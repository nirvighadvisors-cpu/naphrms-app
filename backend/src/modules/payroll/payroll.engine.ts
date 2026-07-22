import { ComponentCategory, CalcType } from '@prisma/client';

export interface ComponentInput {
  id?: string;
  name: string;
  code?: string | null;
  category: ComponentCategory;
  calculationType: CalcType;
  value: number;
  formula?: string | null;
  dependsOn?: string[];
  isStatutory?: boolean;
  isTaxable?: boolean;
  minValue?: number | null;
  maxValue?: number | null;
  slabConfig?: any;
  order: number;
}

export interface CalculatedLineItem {
  name: string;
  code?: string | null;
  category: ComponentCategory;
  calculationType: CalcType;
  rawValue: number;
  baseAmount: number;
  calculatedAmount: number;
  formula: string;
  order: number;
}

export interface SalaryBreakdown {
  basicSalary: number;
  earnings: CalculatedLineItem[];
  deductions: CalculatedLineItem[];
  companyContributions: CalculatedLineItem[];
  grossEarnings: number;
  totalDeductions: number;
  netPayable: number;
}

export function topologicalSort(components: ComponentInput[]): ComponentInput[] {
  const sorted: ComponentInput[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const compMap = new Map<string, ComponentInput>();
  for (const c of components) {
    if (c.code) compMap.set(c.code, c);
  }

  const visit = (c: ComponentInput) => {
    const code = c.code || c.name;
    if (visited.has(code)) return;
    if (visiting.has(code)) throw new Error(`Circular dependency detected involving component: ${code}`);

    visiting.add(code);
    if (c.dependsOn && Array.isArray(c.dependsOn)) {
      for (const dep of c.dependsOn) {
        if (dep === 'BASIC' || dep === 'GROSS' || dep === 'CTC') continue;
        const depComp = compMap.get(dep);
        if (depComp) visit(depComp);
      }
    }
    visiting.delete(code);
    visited.add(code);
    sorted.push(c);
  };

  // Ensure BASIC is first if it exists, since it's the root of everything usually
  const basic = components.find(c => c.code === 'BASIC' || c.name.toLowerCase().includes('basic'));
  if (basic) visit(basic);

  for (const c of components) {
    visit(c);
  }

  return sorted;
}

// A simple safe formula evaluator
export function evaluateFormula(formula: string, context: Record<string, number>): number {
  try {
    let expr = formula.replace(/\s+/g, '');
    // Replace variables with their values from context
    for (const [key, value] of Object.entries(context)) {
      // Use regex to replace exact word matches
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expr = expr.replace(regex, value.toString());
    }

    // Now safely evaluate the math expression. It should only contain numbers, operators (+, -, *, /, %), and parentheses.
    if (!/^[0-9+\-*/().%]+$/.test(expr)) {
      throw new Error(`Invalid formula: ${formula}`);
    }

    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${expr}`)();
    return Number(result) || 0;
  } catch (error: any) {
    console.error(`Formula evaluation error for "${formula}":`, error);
    return 0;
  }
}

export function calculateSalaryBreakdown(
  components: ComponentInput[],
  payableRatio: number = 1.0,
  basicSalaryInput: number = 0,
  ctcValueInput: number = 0
): SalaryBreakdown {
  const round = (n: number) => Math.round(n * 100) / 100;
  const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  const sortedComponents = topologicalSort(components);
  const context: Record<string, number> = {};
  
  const earningItems: CalculatedLineItem[] = [];
  const deductionItems: CalculatedLineItem[] = [];
  const contributionItems: CalculatedLineItem[] = [];

  let basicSalary = 0;
  let ctcValue = ctcValueInput;
  let grossEarnings = 0;

  if (basicSalaryInput > 0) {
    basicSalary = round(basicSalaryInput * payableRatio);
    context['BASIC'] = basicSalary;
    grossEarnings += basicSalary;
    earningItems.push({
      name: 'Basic Pay',
      code: 'BASIC',
      category: 'EARNING',
      calculationType: 'FIXED',
      rawValue: basicSalaryInput,
      baseAmount: basicSalaryInput,
      calculatedAmount: basicSalary,
      formula: payableRatio < 1 
        ? `Fixed ${formatCurrency(basicSalaryInput)} × ${round(payableRatio * 100)}%`
        : `Fixed ${formatCurrency(basicSalaryInput)}`,
      order: -1 // Always show at the top
    });
  }

  for (const comp of sortedComponents) {
    if (comp.calculationType === 'PERCENTAGE_OF_GROSS') continue;
    
    let calculatedAmount = 0;
    let baseAmount = 0;
    let formulaStr = '';

    if (comp.calculationType === 'FIXED') {
      calculatedAmount = round(comp.value * payableRatio);
      baseAmount = comp.value;
      formulaStr = payableRatio < 1
        ? `Fixed ${formatCurrency(comp.value)} × ${round(payableRatio * 100)}%`
        : `Fixed ${formatCurrency(comp.value)}`;
    } else if (comp.calculationType === 'PERCENTAGE_OF_BASIC') {
      baseAmount = basicSalary;
      calculatedAmount = round((comp.value / 100) * basicSalary);
      formulaStr = `${comp.value}% of Basic ${formatCurrency(basicSalary)}`;
    } else if (comp.calculationType === 'PERCENTAGE_OF_CTC') {
      baseAmount = ctcValue;
      calculatedAmount = round((comp.value / 100) * ctcValue);
      formulaStr = `${comp.value}% of CTC ${formatCurrency(ctcValue)}`;
    } else if (comp.calculationType === 'FORMULA') {
      if (!comp.formula) throw new Error(`Formula missing for component ${comp.name}`);
      const rawCalc = evaluateFormula(comp.formula, context);
      calculatedAmount = round(rawCalc * payableRatio);
      baseAmount = rawCalc;
      formulaStr = `Formula: ${comp.formula}`;
    }

    if (comp.minValue !== null && comp.minValue !== undefined) calculatedAmount = Math.max(calculatedAmount, comp.minValue);
    if (comp.maxValue !== null && comp.maxValue !== undefined) calculatedAmount = Math.min(calculatedAmount, comp.maxValue);

    if (comp.code) context[comp.code] = calculatedAmount;
    if (comp.code === 'BASIC' || comp.name.toLowerCase().includes('basic')) {
      // If basicSalary is already injected from input, skip updating unless the user explicitly overrode it
      // Actually we just let it update context if they have a component with BASIC code
      basicSalary = calculatedAmount;
      context['BASIC'] = basicSalary;
    }

    const isEarning = comp.category === 'EARNING' || comp.category === 'REIMBURSEMENT' || comp.category === 'BONUS';
    
    if (isEarning) {
      grossEarnings += calculatedAmount;
      earningItems.push({
        name: comp.name,
        code: comp.code,
        category: comp.category,
        calculationType: comp.calculationType,
        rawValue: comp.value,
        baseAmount,
        calculatedAmount,
        formula: formulaStr,
        order: comp.order
      });
    } else if (comp.category === 'STATUTORY_EMPLOYER' || (comp.category as any) === 'COMPANY_CONTRIBUTION') {
      contributionItems.push({
        name: comp.name,
        code: comp.code,
        category: comp.category,
        calculationType: comp.calculationType,
        rawValue: comp.value,
        baseAmount,
        calculatedAmount,
        formula: formulaStr,
        order: comp.order
      });
    } else {
      deductionItems.push({
        name: comp.name,
        code: comp.code,
        category: comp.category,
        calculationType: comp.calculationType,
        rawValue: comp.value,
        baseAmount,
        calculatedAmount,
        formula: formulaStr,
        order: comp.order
      });
    }
  }

  context['GROSS'] = grossEarnings;

  for (const comp of sortedComponents) {
    if (comp.calculationType !== 'PERCENTAGE_OF_GROSS' && comp.calculationType !== 'SLAB_BASED') continue;

    let calculatedAmount = 0;
    let baseAmount = 0;
    let formulaStr = '';

    if (comp.calculationType === 'PERCENTAGE_OF_GROSS') {
      baseAmount = grossEarnings;
      calculatedAmount = round((comp.value / 100) * grossEarnings);
      formulaStr = `${comp.value}% of Gross ${formatCurrency(grossEarnings)}`;
    } else if (comp.calculationType === 'SLAB_BASED') {
      calculatedAmount = 0;
      formulaStr = `Slab Based (Coming Soon)`;
    }

    if (comp.minValue !== null && comp.minValue !== undefined) calculatedAmount = Math.max(calculatedAmount, comp.minValue);
    if (comp.maxValue !== null && comp.maxValue !== undefined) calculatedAmount = Math.min(calculatedAmount, comp.maxValue);

    if (comp.code) context[comp.code] = calculatedAmount;

    const isEarning = comp.category === 'EARNING' || comp.category === 'REIMBURSEMENT' || comp.category === 'BONUS';
    if (isEarning) {
      grossEarnings += calculatedAmount;
      context['GROSS'] = grossEarnings;
      earningItems.push({
        name: comp.name,
        code: comp.code,
        category: comp.category,
        calculationType: comp.calculationType,
        rawValue: comp.value,
        baseAmount,
        calculatedAmount,
        formula: formulaStr,
        order: comp.order
      });
    } else {
      deductionItems.push({
        name: comp.name,
        code: comp.code,
        category: comp.category,
        calculationType: comp.calculationType,
        rawValue: comp.value,
        baseAmount,
        calculatedAmount,
        formula: formulaStr,
        order: comp.order
      });
    }
  }

  earningItems.sort((a, b) => a.order - b.order);
  deductionItems.sort((a, b) => a.order - b.order);

  const totalDeductions = round(deductionItems.reduce((sum, d) => {
    if (d.category === 'STATUTORY_EMPLOYER') return sum;
    return sum + d.calculatedAmount;
  }, 0));

  const netPayable = round(grossEarnings - totalDeductions);

  return {
    basicSalary,
    earnings: earningItems,
    deductions: deductionItems,
    companyContributions: contributionItems,
    grossEarnings,
    totalDeductions,
    netPayable,
  };
}

export function breakdownToPayslipJson(breakdown: SalaryBreakdown): {
  earnings: Record<string, number>;
  deductions: Record<string, number>;
  companyContributions: Record<string, number>;
} {
  const earnings: Record<string, number> = {};
  for (const item of breakdown.earnings) {
    earnings[item.name] = item.calculatedAmount;
  }

  const deductions: Record<string, number> = {};
  for (const item of breakdown.deductions) {
    deductions[item.name] = item.calculatedAmount;
  }

  const companyContributions: Record<string, number> = {};
  for (const item of breakdown.companyContributions) {
    companyContributions[item.name] = item.calculatedAmount;
  }

  return { earnings, deductions, companyContributions };
}
