import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';

// ── Validation ───────────────────────────────────────────────

const createWorkSiteSchema = z.object({
  name: z.string().min(1, 'Work site name is required').max(200),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().int().positive().optional().default(200),
});

const updateWorkSiteSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  radius: z.number().int().positive().optional(),
});

// ── GET /api/worksites ───────────────────────────────────────
export const listWorkSites = async (_req: Request, res: Response): Promise<void> => {
  const workSites = await prisma.workSite.findMany({
    include: {
      _count: { select: { employees: true, attendance: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({
    data: workSites.map((site) => ({
      id: site.id,
      name: site.name,
      address: site.address,
      latitude: site.latitude,
      longitude: site.longitude,
      radius: site.radius,
      employeeCount: site._count.employees,
      attendanceCount: site._count.attendance,
      createdAt: site.createdAt,
    })),
  });
};

// ── POST /api/worksites (admin) ──────────────────────────────
export const createWorkSite = async (req: Request, res: Response): Promise<void> => {
  const parsed = createWorkSiteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const workSite = await prisma.workSite.create({
    data: parsed.data,
  });

  res.status(201).json({ data: workSite });
};

// ── PATCH /api/worksites/:id (admin) ─────────────────────────
export const updateWorkSite = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const parsed = updateWorkSiteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  const existing = await prisma.workSite.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Work site not found' } });
    return;
  }

  const updated = await prisma.workSite.update({
    where: { id },
    data: parsed.data,
  });

  res.json({ data: updated });
};

// ── DELETE /api/worksites/:id (admin) ────────────────────────
export const deleteWorkSite = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  const workSite = await prisma.workSite.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  });

  if (!workSite) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Work site not found' } });
    return;
  }

  if (workSite._count.employees > 0) {
    res.status(400).json({ error: { code: 'HAS_EMPLOYEES', message: 'Cannot delete work site with assigned employees. Reassign employees first.' } });
    return;
  }

  await prisma.workSite.delete({ where: { id } });
  res.json({ message: 'Work site deleted successfully' });
};
