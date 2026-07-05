import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logPayrollAudit(data: {
  entityType: 'SALARY_STRUCTURE' | 'PAYROLL_RUN' | 'STATUTORY_RULE';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'GENERATE' | 'LOCK';
  changes?: any;
  performedById: string;
}) {
  try {
    await prisma.payrollAuditLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        changes: data.changes ? JSON.parse(JSON.stringify(data.changes)) : null,
        performedById: data.performedById,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

export async function createStructureVersion(structureId: string, performedById: string) {
  try {
    const structure = await prisma.salaryStructure.findUnique({
      where: { id: structureId },
      include: { components: { orderBy: { order: 'asc' } } },
    });

    if (!structure) return;

    const latestVersion = await prisma.structureVersion.findFirst({
      where: { structureId },
      orderBy: { versionNumber: 'desc' },
    });

    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    await prisma.structureVersion.create({
      data: {
        structureId,
        versionNumber: nextVersionNumber,
        componentsSnapshot: JSON.parse(JSON.stringify(structure.components)),
        createdBy: performedById,
      },
    });
  } catch (error) {
    console.error('Failed to create structure version:', error);
  }
}
