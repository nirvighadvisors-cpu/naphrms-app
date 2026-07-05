import { Request, Response } from 'express';
import prisma from '../../config/database';
import { upsertSettingsSchema } from './settings.validation';

// GET /api/settings
// Fetch all settings. Unauthenticated users can only fetch isPublic=true settings (if we expose a public route).
// For now, this is protected. Admin sees all, employees see isPublic=true.
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  const isAdmin = req.user?.role === 'HR_ADMIN';

  try {
    const settings = await prisma.systemSetting.findMany({
      where: isAdmin ? undefined : { isPublic: true },
    });
    res.json({ data: settings });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch settings', details: error.message } });
  }
};

// POST /api/settings
// Upsert multiple settings
export const upsertSettings = async (req: Request, res: Response): Promise<void> => {
  const parsed = upsertSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.flatten() } });
    return;
  }

  try {
    const results = await prisma.$transaction(
      parsed.data.settings.map((setting) =>
        prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: {
            value: setting.value,
            type: setting.type,
            description: setting.description,
            isPublic: setting.isPublic,
          },
          create: {
            key: setting.key,
            value: setting.value,
            type: setting.type,
            description: setting.description,
            isPublic: setting.isPublic,
          },
        })
      )
    );

    res.json({ data: results, message: 'Settings saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to save settings', details: error.message } });
  }
};
