import { Request, Response } from 'express';
import prisma from '../../config/database';

export const globalSearch = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      res.json({ employees: [], departments: [], designations: [], documents: [], policies: [], leaveRequests: [], attendance: [], payroll: [] });
      return;
    }

    const isAdmin = req.user!.role === 'HR_ADMIN';
    const myEmployeeRecord = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
    const employeeId = myEmployeeRecord?.id;

    const limit = 5;

    // 1. Employees
    const employeeWhere = isAdmin 
      ? { OR: [ { firstName: { contains: q, mode: 'insensitive' as any } }, { lastName: { contains: q, mode: 'insensitive' as any } }, { employeeCode: { contains: q, mode: 'insensitive' as any } }, { personalEmail: { contains: q, mode: 'insensitive' as any } } ] }
      : { status: 'ACTIVE' as any, OR: [ { firstName: { contains: q, mode: 'insensitive' as any } }, { lastName: { contains: q, mode: 'insensitive' as any } }, { employeeCode: { contains: q, mode: 'insensitive' as any } } ] };
    
    const employeesP = prisma.employee.findMany({
      where: employeeWhere,
      take: limit,
      select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, profilePhotoUrl: true }
    });

    // 2. Departments
    const departmentsP = prisma.department.findMany({
      where: { OR: [ { name: { contains: q, mode: 'insensitive' as any } }, { code: { contains: q, mode: 'insensitive' as any } } ] },
      take: limit,
      select: { id: true, name: true, code: true }
    });

    // 3. Designations
    const designationsP = prisma.employee.findMany({
      where: { designation: { contains: q, mode: 'insensitive' as any }, ...(isAdmin ? {} : { status: 'ACTIVE' as any }) },
      distinct: ['designation'],
      take: limit,
      select: { designation: true }
    });

    // 4. Policies
    const policiesP = prisma.policyDocument.findMany({
      where: { isActive: true, OR: [ { title: { contains: q, mode: 'insensitive' as any } }, { description: { contains: q, mode: 'insensitive' as any } } ] },
      take: limit,
      select: { id: true, title: true, version: true }
    });

    // 5. Documents
    const documentsWhere = isAdmin
      ? { OR: [ { fileName: { contains: q, mode: 'insensitive' as any } }, { employee: { firstName: { contains: q, mode: 'insensitive' as any } } } ] }
      : { employeeId, fileName: { contains: q, mode: 'insensitive' as any } };
    
    const documentsP = employeeId ? prisma.employeeDocument.findMany({
      where: documentsWhere,
      take: limit,
      include: { employee: { select: { firstName: true, lastName: true } } }
    }) : Promise.resolve([]);

    // 6. Leave Requests
    const leavesWhere = isAdmin
      ? { OR: [ { reason: { contains: q, mode: 'insensitive' as any } }, { employee: { firstName: { contains: q, mode: 'insensitive' as any } } } ] }
      : { employeeId, reason: { contains: q, mode: 'insensitive' as any } };
    
    const leavesP = employeeId ? prisma.leaveRequest.findMany({
      where: leavesWhere,
      take: limit,
      include: { leaveType: true, employee: { select: { firstName: true, lastName: true } } }
    }) : Promise.resolve([]);

    // 7. Attendance
    // We will search by employee name or status string
    const isStatusMatch = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'WFH', 'ON_LEAVE'].includes(q.toUpperCase());
    
    const attendanceWhere = isAdmin
      ? { OR: [ { employee: { firstName: { contains: q, mode: 'insensitive' as any } } }, ...(isStatusMatch ? [{ status: q.toUpperCase() as any }] : []) ] }
      : { employeeId, ...(isStatusMatch ? { status: q.toUpperCase() as any } : { status: 'UNKNOWN' as any }) }; // if employee, only match status to avoid returning all records
    
    const attendanceP = employeeId && (isAdmin || isStatusMatch) ? prisma.attendanceRecord.findMany({
      where: attendanceWhere,
      take: limit,
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { date: 'desc' }
    }) : Promise.resolve([]);

    // 8. Payroll / Payslips
    const payslipWhere = isAdmin
      ? { employee: { firstName: { contains: q, mode: 'insensitive' as any } } }
      : { employeeId }; // if employee types anything, we just return recent payslips if we wanted, but to be accurate we should only return if matched. Let's just match employee name for admin.
    
    const payslipsP = employeeId && isAdmin ? prisma.payslip.findMany({
      where: payslipWhere,
      take: limit,
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { generatedAt: 'desc' }
    }) : Promise.resolve([]);

    const [employees, departments, designationsRaw, policies, documents, leaveRequests, attendance, payroll] = await Promise.all([
      employeesP, departmentsP, designationsP, policiesP, documentsP, leavesP, attendanceP, payslipsP
    ]);

    const designations = designationsRaw.map(d => ({ name: d.designation }));

    res.json({
      employees,
      departments,
      designations,
      documents,
      policies,
      leaveRequests,
      attendance,
      payroll
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to perform search' });
  }
};
