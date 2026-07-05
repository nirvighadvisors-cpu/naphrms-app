import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { notifyUsers } from '../../services/notification.service';
import prisma from '../../config/database';
import {
  createStructureSchema,
  addComponentSchema,
  updateComponentSchema,
  assignStructureSchema,
  generatePayrollSchema,
  payrollQuerySchema,
  previewSalarySchema,
} from './payroll.validation';
import { calculateSalaryBreakdown, breakdownToPayslipJson, type ComponentInput } from './payroll.engine';
import { calculateStatutoryDeductions } from './payroll.statutory';
import { logPayrollAudit, createStructureVersion } from './payroll.audit';

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Get all dates in a month/year range.
 */
const getDatesInMonth = (month: number, year: number): Date[] => {
  const dates: Date[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(new Date(year, month - 1, day));
  }
  return dates;
};

/**
 * Count weekdays (Mon–Fri) in a given month/year.
 */
const countWeekdaysInMonth = (month: number, year: number): number => {
  const dates = getDatesInMonth(month, year);
  return dates.filter((d) => {
    const day = d.getDay();
    return day !== 0 && day !== 6;
  }).length;
};

/**
 * Count paid leave days overlapping with the given month for an employee.
 * Only counts APPROVED leave requests where the leave type isPaid=true.
 */
const countPaidLeaveDays = async (
  employeeId: string,
  month: number,
  year: number
): Promise<number> => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); // last day of month

  const approvedPaidLeaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
      leaveType: { isPaid: true },
    },
    include: { leaveType: true },
  });

  let paidDays = 0;

  for (const leave of approvedPaidLeaves) {
    // Clamp the leave range to the month boundaries
    const effectiveStart = leave.startDate > monthStart ? leave.startDate : monthStart;
    const effectiveEnd = leave.endDate < monthEnd ? leave.endDate : monthEnd;

    // Count weekdays in the clamped range
    const current = new Date(effectiveStart);
    while (current <= effectiveEnd) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        paidDays++;
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return paidDays;
};

// ══════════════════════════════════════════════════════════════
// SALARY STRUCTURES
// ══════════════════════════════════════════════════════════════

// ── GET /api/payroll/structures ──────────────────────────────
export const getStructures = async (_req: Request, res: Response): Promise<void> => {
  try {
    const structures = await prisma.salaryStructure.findMany({
      include: {
        components: { orderBy: { order: 'asc' } },
        _count: { select: { employees: true } },
        employees: { select: { basicSalary: true, firstName: true, lastName: true, employeeCode: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ data: structures });
  } catch (error) {
    console.error('Error fetching structures:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch salary structures' } });
  }
};

// ── POST /api/payroll/structures ─────────────────────────────
export const createStructure = async (req: Request, res: Response): Promise<void> => {
  const parsed = createStructureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  try {
    const { name } = parsed.data;

    const existing = await prisma.salaryStructure.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json({ error: { code: 'DUPLICATE', message: 'A salary structure with this name already exists' } });
      return;
    }

    const structure = await prisma.salaryStructure.create({
      data: { name },
      include: { components: true, _count: { select: { employees: true } } },
    });

    await logPayrollAudit({
      entityType: 'SALARY_STRUCTURE',
      entityId: structure.id,
      action: 'CREATE',
      changes: { name },
      performedById: req.user!.userId,
    });
    await createStructureVersion(structure.id, req.user!.userId);

    res.status(201).json({ data: structure });
  } catch (error) {
    console.error('Error creating structure:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create salary structure' } });
  }
};

// ── GET /api/payroll/structures/:id ──────────────────────────
export const getStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const structure = await prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
        components: { orderBy: { order: 'asc' } },
        employees: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true,
            basicSalary: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    if (!structure) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Salary structure not found' } });
      return;
    }

    res.json({ data: structure });
  } catch (error) {
    console.error('Error fetching structure:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch salary structure' } });
  }
};

// ── DELETE /api/payroll/structures/:id ────────────────────────
export const deleteStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const structure = await prisma.salaryStructure.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!structure) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Salary structure not found' } });
      return;
    }

    if (structure._count.employees > 0) {
      await prisma.employee.updateMany({
        where: { salaryStructureId: id },
        data: { salaryStructureId: null },
      });
    }

    await logPayrollAudit({
      entityType: 'SALARY_STRUCTURE',
      entityId: id,
      action: 'DELETE',
      performedById: req.user!.userId,
    });

    // Cascade delete will remove components due to onDelete: Cascade
    await prisma.salaryStructure.delete({ where: { id } });

    res.json({ data: { message: 'Salary structure deleted successfully' } });
  } catch (error) {
    console.error('Error deleting structure:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete salary structure' } });
  }
};

// ── POST /api/payroll/structures/:id/components ──────────────
export const addComponent = async (req: Request, res: Response): Promise<void> => {
  const parsed = addComponentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  try {
    const id = req.params.id as string;

    const structure = await prisma.salaryStructure.findUnique({ where: { id } });
    if (!structure) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Salary structure not found' } });
      return;
    }

    const component = await prisma.salaryComponent.create({
      data: {
        structureId: id,
        ...parsed.data,
        type: (parsed.data as any).type,
      },
    });

    await logPayrollAudit({
      entityType: 'SALARY_STRUCTURE',
      entityId: id,
      action: 'UPDATE',
      changes: { addedComponent: parsed.data.name },
      performedById: req.user!.userId,
    });
    await createStructureVersion(id, req.user!.userId);

    res.status(201).json({ data: component });
  } catch (error) {
    console.error('Error adding component:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to add salary component' } });
  }
};

// ── PATCH /api/payroll/structures/:structureId/components/:componentId ──
export const updateComponent = async (req: Request, res: Response): Promise<void> => {
  const parsed = updateComponentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  try {
    const structureId = req.params.structureId as string;
    const componentId = req.params.componentId as string;

    const component = await prisma.salaryComponent.findFirst({
      where: { id: componentId, structureId },
    });

    if (!component) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Salary component not found in this structure' } });
      return;
    }

    const updated = await prisma.salaryComponent.update({
      where: { id: componentId },
      data: parsed.data,
    });

    await logPayrollAudit({
      entityType: 'SALARY_STRUCTURE',
      entityId: structureId,
      action: 'UPDATE',
      changes: { updatedComponent: componentId, ...parsed.data },
      performedById: req.user!.userId,
    });
    await createStructureVersion(structureId, req.user!.userId);

    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating component:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update salary component' } });
  }
};

// ── DELETE /api/payroll/structures/:structureId/components/:componentId ──
export const deleteComponent = async (req: Request, res: Response): Promise<void> => {
  try {
    const structureId = req.params.structureId as string;
    const componentId = req.params.componentId as string;

    const component = await prisma.salaryComponent.findFirst({
      where: { id: componentId, structureId },
    });

    if (!component) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Salary component not found in this structure' } });
      return;
    }

    await prisma.salaryComponent.delete({ where: { id: componentId } });

    await logPayrollAudit({
      entityType: 'SALARY_STRUCTURE',
      entityId: structureId,
      action: 'UPDATE',
      changes: { deletedComponent: componentId },
      performedById: req.user!.userId,
    });
    await createStructureVersion(structureId, req.user!.userId);

    res.json({ data: { message: 'Salary component deleted successfully' } });
  } catch (error) {
    console.error('Error deleting component:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete salary component' } });
  }
};

// ── POST /api/payroll/assign ─────────────────────────────────
export const assignStructure = async (req: Request, res: Response): Promise<void> => {
  const parsed = assignStructureSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  try {
    const { employeeId, employeeIds, structureId, basicSalary } = parsed.data;

    const targetIds = employeeIds || (employeeId ? [employeeId] : []);
    if (targetIds.length === 0) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No employees provided' } });
      return;
    }

    const structure = await prisma.salaryStructure.findUnique({ where: { id: structureId } });
    if (!structure) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Salary structure not found' } });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedEmployees = [];
      for (const id of targetIds) {
        const updated = await tx.employee.update({
          where: { id },
          data: { salaryStructureId: structureId, basicSalary },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
          },
        });
        updatedEmployees.push(updated);
        
        // Log the assignment
        await logPayrollAudit({
          entityType: 'SALARY_STRUCTURE',
          entityId: structureId,
          action: 'ASSIGN',
          changes: { employeeId: id, employeeName: `${updated.firstName} ${updated.lastName}` },
          performedById: req.user!.userId,
        });
      }
      return updatedEmployees;
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error assigning structure:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to assign salary structure' } });
  }
};

// ══════════════════════════════════════════════════════════════
// PAYROLL RUNS
// ══════════════════════════════════════════════════════════════

// ── GET /api/payroll/runs ────────────────────────────────────
export const getPayrollRuns = async (req: Request, res: Response): Promise<void> => {
  const queryParsed = payrollQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid query', details: queryParsed.error.flatten() } });
    return;
  }

  try {
    const { status, month, year, page = 1, limit = 20 } = queryParsed.data;
    const skip = (page - 1) * limit;

    const where: Prisma.PayrollRunWhereInput = {
      ...(status ? { status } : {}),
      ...(month ? { month } : {}),
      ...(year ? { year } : {}),
    };

    const [runs, total] = await Promise.all([
      prisma.payrollRun.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { payslips: true } } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.payrollRun.count({ where }),
    ]);

    res.json({
      data: runs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payroll runs' } });
  }
};

// ── POST /api/payroll/runs/generate ──────────────────────────
export const generatePayroll = async (req: Request, res: Response): Promise<void> => {
  const parsed = generatePayrollSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  try {
    const { month, year } = parsed.data;

    // 1. Check for existing payroll run
    const existingRun = await prisma.payrollRun.findUnique({
      where: { month_year: { month, year } },
    });
    if (existingRun) {
      // Temporarily allowing overwrite of locked runs for testing
      /*
      if (existingRun.status === 'LOCKED') {
        res.status(409).json({
          error: {
            code: 'LOCKED',
            message: `Payroll for ${month}/${year} is locked and cannot be regenerated.`,
          },
        });
        return;
      }
      */

      // Overwrite: Delete existing run's line items, payslips, and the run itself
      await prisma.$transaction([
        prisma.payslipLineItem.deleteMany({ where: { payslip: { payrollRunId: existingRun.id } } }),
        prisma.payslip.deleteMany({ where: { payrollRunId: existingRun.id } }),
        prisma.payrollRun.delete({ where: { id: existingRun.id } }),
      ]);
    }

    // 2. Find all ACTIVE employees with salary structures
    const employees = await prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        salaryStructureId: { not: null },
      },
      include: {
        salaryStructure: {
          include: {
            components: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (employees.length === 0) {
      res.status(400).json({
        error: {
          code: 'NO_EMPLOYEES',
          message: 'No active employees with assigned salary structures found',
        },
      });
      return;
    }

    // 3. Calculate total working days = weekdays - holidays
    const totalWeekdays = countWeekdaysInMonth(month, year);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        year,
      },
    });

    // Only count holidays that fall on weekdays
    const weekdayHolidays = holidays.filter((h) => {
      const day = h.date.getDay();
      return day !== 0 && day !== 6;
    });

    const totalWorkingDays = totalWeekdays - weekdayHolidays.length;

    if (totalWorkingDays <= 0) {
      res.status(400).json({
        error: {
          code: 'NO_WORKING_DAYS',
          message: 'No working days found for the specified month',
        },
      });
      return;
    }

    // 4. Pre-fetch attendance and leave records for all employees
    const employeeIds = employees.map(e => e.id);
    const allAttendanceRecords = await prisma.attendanceRecord.findMany({
      where: {
        employeeId: { in: employeeIds },
        date: { gte: monthStart, lte: monthEnd },
        status: { in: ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'WFH'] },
      },
    });

    const allApprovedPaidLeaves = await prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: 'APPROVED',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
        leaveType: { isPaid: true },
      },
      include: { leaveType: true },
    });

    const attendanceByEmployee = allAttendanceRecords.reduce((acc, curr) => {
      acc[curr.employeeId] = acc[curr.employeeId] || [];
      acc[curr.employeeId].push(curr);
      return acc;
    }, {} as Record<string, typeof allAttendanceRecords>);

    const leavesByEmployee = allApprovedPaidLeaves.reduce((acc, curr) => {
      acc[curr.employeeId] = acc[curr.employeeId] || [];
      acc[curr.employeeId].push(curr);
      return acc;
    }, {} as Record<string, typeof allApprovedPaidLeaves>);

    const calculatePaidLeaveDays = (leaves: typeof allApprovedPaidLeaves) => {
      let paidDays = 0;
      for (const leave of leaves) {
        const effectiveStart = leave.startDate > monthStart ? leave.startDate : monthStart;
        const effectiveEnd = leave.endDate < monthEnd ? leave.endDate : monthEnd;
        const current = new Date(effectiveStart);
        while (current <= effectiveEnd) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) paidDays++;
          current.setDate(current.getDate() + 1);
        }
      }
      return paidDays;
    };

    // 5. Build payslip data for each employee
    const payslipDataArray: Prisma.PayslipCreateManyInput[] = [];

    for (const employee of employees) {
      const structure = employee.salaryStructure!;
      const components = structure.components;

      // 4a. Count present days from AttendanceRecord
      const attendanceRecords = attendanceByEmployee[employee.id] || [];

      let presentDays = 0;
      if (attendanceRecords.length === 0) {
        // Fallback: If no attendance records are tracked for this employee this month, assume full presence
        presentDays = totalWorkingDays;
      } else {
        for (const record of attendanceRecords) {
          if (record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'WFH') {
            presentDays += 1.0;
          } else if (record.status === 'HALF_DAY') {
            presentDays += 0.5;
          }
          // ABSENT contributes 0
        }
      }

      // 4b. Count paid leave days
      const paidLeaveDays = calculatePaidLeaveDays(leavesByEmployee[employee.id] || []);

      // 4c. Payable days
      const payableDays = Math.min(presentDays + paidLeaveDays, totalWorkingDays);

      // 4d. Payable ratio
      const payableRatio = payableDays / totalWorkingDays;

      // 4e. Use the calculation engine
      const componentInputs: ComponentInput[] = components.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        category: c.category as any,
        calculationType: c.calculationType as any,
        value: c.value,
        formula: c.formula,
        dependsOn: c.dependsOn,
        isStatutory: c.isStatutory,
        isTaxable: c.isTaxable,
        minValue: c.minValue,
        maxValue: c.maxValue,
        slabConfig: c.slabConfig,
        order: c.order,
      }));

      const breakdown = calculateSalaryBreakdown(componentInputs, payableRatio, employee.basicSalary || 0);

      let empState = 'MH'; // Default
      try {
        const addrStr = (employee as any).currentAddress || (employee as any).permanentAddress;
        if (addrStr) {
          const addr = JSON.parse(addrStr);
          if (addr.state === 'Maharashtra') empState = 'MH';
          else if (addr.state) empState = addr.state.substring(0, 2).toUpperCase(); // Naive fallback for other states
        }
      } catch (e) {
        console.warn(`[Payroll] Failed to parse address for employee ${employee.id}. Falling back to default state 'MH'.`, e);
      }

      // Apply statutory deductions (like ESIC, PF, PT)
      const statutoryDeductions = await calculateStatutoryDeductions({
        basicSalary: breakdown.basicSalary,
        grossSalary: breakdown.grossEarnings,
        isEsicCovered: (employee as any).isEsicCovered,
        taxRegime: (employee as any).taxRegime || 'NEW',
      }, empState);
      let taxRegimeUsed = 'NEW';
      let taxableIncome = 0;
      let taxBreakdown: any = null;

      for (const stat of statutoryDeductions) {
        if (stat.code === 'TDS_OLD' || stat.code === 'TDS_NEW') {
          if (stat.metadata) {
            taxRegimeUsed = stat.metadata.taxRegime;
            taxableIncome = stat.metadata.taxableIncome;
            taxBreakdown = stat.metadata;
          }
        }
        if (stat.employeeDeduction > 0) {
          breakdown.deductions.push({
            name: stat.name,
            code: stat.code,
            category: 'STATUTORY_EMPLOYEE' as any,
            calculationType: 'FORMULA' as any,
            rawValue: stat.employeeDeduction,
            baseAmount: stat.employeeDeduction,
            calculatedAmount: stat.employeeDeduction,
            formula: 'Statutory Engine',
            order: 99,
          });
          breakdown.totalDeductions += stat.employeeDeduction;
        }
        if (stat.employerContribution > 0) {
          breakdown.companyContributions.push({
            name: `${stat.name} (Employer)`,
            code: `${stat.code}_ER`,
            category: 'STATUTORY_EMPLOYER' as any,
            calculationType: 'FORMULA' as any,
            rawValue: stat.employerContribution,
            baseAmount: stat.employerContribution,
            calculatedAmount: stat.employerContribution,
            formula: 'Statutory Engine',
            order: 100,
          });
        }
      }
      breakdown.netPayable = breakdown.grossEarnings - breakdown.totalDeductions;

      const { earnings, deductions, companyContributions } = breakdownToPayslipJson(breakdown);

      payslipDataArray.push({
        employeeId: employee.id,
        payrollRunId: '', // will be set in transaction
        month,
        year,
        basicSalary: breakdown.basicSalary,
        earnings: earnings as unknown as Prisma.InputJsonValue,
        deductions: deductions as unknown as Prisma.InputJsonValue,
        companyContributions: companyContributions as unknown as Prisma.InputJsonValue,
        grossEarnings: breakdown.grossEarnings,
        totalDeductions: breakdown.totalDeductions,
        netPayable: breakdown.netPayable,
        taxRegime: taxRegimeUsed,
        taxableIncome: taxableIncome,
        taxBreakdown: taxBreakdown ? (taxBreakdown as unknown as Prisma.InputJsonValue) : null,
        workingDays: totalWorkingDays,
        presentDays: Math.round(payableDays * 100) / 100,
        _rawBreakdown: breakdown, // Pass the raw breakdown for line items
      } as any);
    }

    // 5. Create PayrollRun + all Payslips in a Prisma transaction
    const payrollRun = await prisma.$transaction(async (tx) => {
      const run = await tx.payrollRun.create({
        data: {
          month,
          year,
          status: 'COMPLETED',
          generatedById: req.user!.userId,
          processedAt: new Date(),
        },
      });

      // Create payslips with the run ID
      for (const payslipData of payslipDataArray) {
        const rawBreakdown = (payslipData as any)._rawBreakdown;
        delete (payslipData as any)._rawBreakdown;

        await tx.payslip.create({
          data: {
            ...payslipData,
            payrollRunId: run.id,
            lineItems: {
              create: [
                ...rawBreakdown.earnings.map((e: any) => ({
                  name: e.name,
                  code: e.code,
                  category: e.category,
                  type: 'EARNING',
                  calculationType: e.calculationType,
                  rawValue: e.rawValue,
                  baseAmount: e.baseAmount,
                  calculatedAmount: e.calculatedAmount,
                  formula: e.formula,
                  order: e.order,
                })),
                ...rawBreakdown.deductions.map((d: any) => ({
                  name: d.name,
                  code: d.code,
                  category: d.category,
                  type: 'DEDUCTION',
                  calculationType: d.calculationType,
                  rawValue: d.rawValue,
                  baseAmount: d.baseAmount,
                  calculatedAmount: d.calculatedAmount,
                  formula: d.formula,
                  order: d.order,
                })),
                ...rawBreakdown.companyContributions.map((c: any) => ({
                  name: c.name,
                  code: c.code,
                  category: c.category,
                  type: 'COMPANY_CONTRIBUTION',
                  calculationType: c.calculationType,
                  rawValue: c.rawValue,
                  baseAmount: c.baseAmount,
                  calculatedAmount: c.calculatedAmount,
                  formula: c.formula,
                  order: c.order,
                })),
              ]
            }
          },
        });
      }

      // Return the full run with payslips
      return tx.payrollRun.findUnique({
        where: { id: run.id },
        include: {
          payslips: {
            include: {
              employee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  employeeCode: true,
                  department: { select: { name: true } },
                  designation: true,
                  dateOfJoining: true,
                  panNumber: true,
                  uanNumber: true,
                  pfAccountNumber: true,
                  bankName: true,
                  bankAccountNumber: true,
                  bankIFSC: true,
                  user: { select: { id: true } },
                },
              },
            },
          },
        },
      });
    });

    await logPayrollAudit({
      entityType: 'PAYROLL_RUN',
      entityId: payrollRun!.id,
      action: 'GENERATE',
      changes: { month, year, employeeCount: payslipDataArray.length },
      performedById: req.user!.userId,
    });

    // 6. Return the created run
    res.status(201).json({ data: payrollRun });

    // Notify Employees
    try {
      const userIds = payrollRun?.payslips
        .map(p => p.employee.user?.id)
        .filter(Boolean) as string[];

      if (userIds && userIds.length > 0) {
        await notifyUsers({
          userIds,
          title: '💰 Payslip Generated',
          message: `Your payslip for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year} is now available.`,
          type: 'PAYROLL',
          linkUrl: '/employee/payslips',
        });
      }
    } catch (err) {
      console.error('Failed to notify employees of payslip generation', err);
    }
  } catch (error) {
    console.error('Error generating payroll:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate payroll' } });
  }
};

// ── GET /api/payroll/runs/:id ────────────────────────────────
export const getPayrollRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: {
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeCode: true,
                department: { select: { name: true } },
                designation: true,
                dateOfJoining: true,
                panNumber: true,
                uanNumber: true,
                pfAccountNumber: true,
                bankName: true,
                bankAccountNumber: true,
                bankIFSC: true,
              },
            },
          },
          orderBy: { employee: { firstName: 'asc' } },
        },
      },
    });

    if (!run) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      return;
    }

    res.json({ data: run });
  } catch (error) {
    console.error('Error fetching payroll run:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payroll run' } });
  }
};

// ── PATCH /api/payroll/runs/:id/lock ─────────────────────────
export const lockPayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const run = await prisma.payrollRun.findUnique({ where: { id } });
    if (!run) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      return;
    }

    if (run.status !== 'COMPLETED' && run.status !== 'DRAFT') {
      res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: `Cannot lock a payroll run with status "${run.status}". Only COMPLETED or DRAFT runs can be locked.`,
        },
      });
      return;
    }

    const updated = await prisma.payrollRun.update({
      where: { id },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
      },
      include: { _count: { select: { payslips: true } } },
    });

    await logPayrollAudit({
      entityType: 'PAYROLL_RUN',
      entityId: id,
      action: 'LOCK',
      performedById: req.user!.userId,
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Error locking payroll:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to lock payroll run' } });
  }
};

// ── DELETE /api/payroll/runs/:id ─────────────────────────────
export const deletePayrollRun = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const run = await prisma.payrollRun.findUnique({ where: { id } });
    if (!run) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payroll run not found' } });
      return;
    }

    /*
    if (run.status === 'LOCKED') {
      res.status(400).json({ error: { code: 'LOCKED', message: 'Cannot delete a locked payroll run' } });
      return;
    }
    */

    await prisma.$transaction([
      prisma.payslipLineItem.deleteMany({ where: { payslip: { payrollRunId: id } } }),
      prisma.payslip.deleteMany({ where: { payrollRunId: id } }),
      prisma.payrollRun.delete({ where: { id } }),
    ]);

    await logPayrollAudit({
      entityType: 'PAYROLL_RUN',
      entityId: id,
      action: 'DELETE',
      performedById: req.user!.userId,
    });

    res.json({ message: 'Payroll run deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll run:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete payroll run' } });
  }
};

// ══════════════════════════════════════════════════════════════
// EMPLOYEE PAYSLIPS
// ══════════════════════════════════════════════════════════════

// ── GET /api/payroll/payslips/my ─────────────────────────────
export const getMyPayslips = async (req: Request, res: Response): Promise<void> => {
  try {
    const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
    if (!employee) {
      res.status(404).json({ error: { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found' } });
      return;
    }

    const payslips = await prisma.payslip.findMany({
      where: { employeeId: employee.id },
      include: {
        payrollRun: {
          select: { id: true, status: true },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    res.json({ data: payslips });
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payslips' } });
  }
};

// ── GET /api/payroll/payslips/:id ────────────────────────────
export const getPayslip = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const payslip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true,
            department: { select: { name: true } },
            bankAccountNumber: true,
            bankIFSC: true,
            bankName: true,
            uanNumber: true,
            pfAccountNumber: true,
            panNumber: true,
          },
        },
        payrollRun: {
          select: { id: true, status: true },
        },
        lineItems: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!payslip) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payslip not found' } });
      return;
    }

    // If the user is not an admin, verify ownership
    if (req.user!.role !== 'HR_ADMIN') {
      const employee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
      if (!employee || employee.id !== payslip.employeeId) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You can only view your own payslips' } });
        return;
      }
    }

    res.json({ data: payslip });
  } catch (error) {
    console.error('Error fetching payslip:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch payslip' } });
  }
};

// ══════════════════════════════════════════════════════════════
// SALARY PREVIEW
// ══════════════════════════════════════════════════════════════

// ── POST /api/payroll/structures/:id/preview ─────────────────
export const previewSalary = async (req: Request, res: Response): Promise<void> => {
  const parsed = previewSalarySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  try {
    const id = req.params.id as string;
    const { basicSalary = 0 } = parsed.data as any;

    const structure = await prisma.salaryStructure.findUnique({
      where: { id },
      include: { components: { orderBy: { order: 'asc' } } },
    });

    if (!structure) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Salary structure not found' } });
      return;
    }

    const componentInputs: ComponentInput[] = structure.components.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      category: c.category as any,
      calculationType: c.calculationType as any,
      value: c.value, // Do NOT override the user's value
      formula: c.formula,
      dependsOn: c.dependsOn,
      isStatutory: c.isStatutory,
      isTaxable: c.isTaxable,
      minValue: c.minValue,
      maxValue: c.maxValue,
      slabConfig: c.slabConfig,
      order: c.order,
    }));

    const breakdown = calculateSalaryBreakdown(componentInputs, 1.0, basicSalary);

    res.json({ data: breakdown });
  } catch (error) {
    console.error('Error previewing salary:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to preview salary' } });
  }
};

// ══════════════════════════════════════════════════════════════
// STATUTORY RULES
// ══════════════════════════════════════════════════════════════

export const getStatutoryRules = async (req: Request, res: Response): Promise<void> => {
  try {
    const rules = await prisma.statutoryRule.findMany({
      orderBy: { code: 'asc' },
    });
    res.json({ data: rules });
  } catch (error) {
    console.error('Error fetching statutory rules:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch statutory rules' } });
  }
};

export const updateStatutoryRule = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { employerRate, employeeRate, wageCap, isActive, slabConfig } = req.body;

    const rule = await prisma.statutoryRule.update({
      where: { id },
      data: {
        ...(employerRate !== undefined && { employerRate }),
        ...(employeeRate !== undefined && { employeeRate }),
        ...(wageCap !== undefined && { wageCap }),
        ...(isActive !== undefined && { isActive }),
        ...(slabConfig !== undefined && { slabConfig: slabConfig as any }),
      },
    });

    await logPayrollAudit({
      entityType: 'STATUTORY_RULE',
      entityId: id,
      action: 'UPDATE',
      changes: req.body,
      performedById: req.user!.userId,
    });

    res.json({ data: rule });
  } catch (error) {
    console.error('Error updating statutory rule:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update statutory rule' } });
  }
};

// ══════════════════════════════════════════════════════════════
// AUDIT & VERSIONING
// ══════════════════════════════════════════════════════════════

export const getStructureVersions = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const versions = await prisma.structureVersion.findMany({
      where: { structureId: id },
      orderBy: { versionNumber: 'desc' },
    });
    res.json({ data: versions });
  } catch (error) {
    console.error('Error fetching structure versions:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch structure versions' } });
  }
};

export const getStructureVersion = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
  const versionId = req.params.versionId as string;
    const version = await prisma.structureVersion.findUnique({
      where: { id: versionId },
    });
    
    if (!version || version.structureId !== id) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Version not found' } });
      return;
    }
    
    res.json({ data: version });
  } catch (error) {
    console.error('Error fetching structure version:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch structure version' } });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const logs = await prisma.payrollAuditLog.findMany({
      orderBy: { performedAt: 'desc' },
      take: 100,
    });
    res.json({ data: logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit logs' } });
  }
};
