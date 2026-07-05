import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';

const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10).toUpperCase(),
  codeInitial: z.string().length(1).toUpperCase(),
  parentId: z.string().uuid().optional(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(10).toUpperCase().optional(),
  codeInitial: z.string().length(1).toUpperCase().optional(),
  parentId: z.string().uuid().optional().nullable(),
});

// GET /api/departments
export const listDepartments = async (_req: Request, res: Response): Promise<void> => {
  const departments = await prisma.department.findMany({
    include: {
      parent: { select: { id: true, name: true } },
      children: { select: { id: true, name: true, code: true, codeInitial: true } },
      _count: { select: { employees: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({
    data: departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      codeInitial: d.codeInitial,
      parentId: d.parentId,
      parent: d.parent,
      children: d.children,
      employeeCount: d._count.employees,
      createdAt: d.createdAt,
    })),
  });
};

// POST /api/departments
export const createDepartment = async (req: Request, res: Response): Promise<void> => {
  const parsed = createDepartmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const { name, code, codeInitial, parentId } = parsed.data;

  // Check parent exists if provided
  if (parentId) {
    const parent = await prisma.department.findUnique({ where: { id: parentId } });
    if (!parent) {
      res.status(400).json({ error: { code: 'INVALID_PARENT', message: 'Parent department not found' } });
      return;
    }
  }

  const department = await prisma.department.create({
    data: { name, code, codeInitial, parentId },
  });

  res.status(201).json({ data: department });
};

// PATCH /api/departments/:id
export const updateDepartment = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parsed = updateDepartmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Department not found' } });
    return;
  }

  const updated = await prisma.department.update({
    where: { id },
    data: parsed.data,
  });

  res.json({ data: updated });
};

// DELETE /api/departments/:id
export const deleteDepartment = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const department = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, children: true } } },
  });

  if (!department) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Department not found' } });
    return;
  }

  if (department._count.employees > 0) {
    res.status(400).json({ error: { code: 'HAS_EMPLOYEES', message: 'Cannot delete department with active employees' } });
    return;
  }

  if (department._count.children > 0) {
    res.status(400).json({ error: { code: 'HAS_CHILDREN', message: 'Cannot delete department with sub-departments' } });
    return;
  }

  await prisma.department.delete({ where: { id } });
  res.json({ message: 'Department deleted successfully' });
};
