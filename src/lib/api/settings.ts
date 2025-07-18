// Temporarily disabled while using mock data
// import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { ApiRequest, ApiResponse } from './types';

// Temporarily disabled while using mock data
// const prisma = new PrismaClient();

// Zod schemas for validation
const SettingsUpdateSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  dailyReadingGoal: z.number().positive().optional(),
  defaultView: z.enum(['grid', 'list']).optional(),
  sortBy: z.enum(['dateAdded', 'title', 'author', 'progress', 'dateFinished']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  notificationsEnabled: z.boolean().optional(),
  autoBackup: z.boolean().optional(),
  backupFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
});

export async function handleSettingsRequest(req: ApiRequest, res: ApiResponse, userId: string | null) {
  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetSettings(req, res, userId);
      case 'PUT':
        return await handleUpdateSettings(req, res, userId);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetSettings(req: ApiRequest, res: ApiResponse, userId: string) {
  console.log('handleGetSettings called for userId:', userId);
  
  // Return mock default settings
  res.json({
    theme: 'system',
    dailyReadingGoal: 1,
    defaultView: 'grid',
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    notificationsEnabled: true,
    autoBackup: false,
    backupFrequency: 'weekly',
  });
}

async function handleUpdateSettings(req: ApiRequest, res: ApiResponse, _userId: string) {
  console.log('handleUpdateSettings called');
  
  const validationResult = SettingsUpdateSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: 'Invalid settings data', details: validationResult.error });
  }

  // Return mock updated settings
  res.json({
    theme: req.body.theme || 'system',
    dailyReadingGoal: req.body.dailyReadingGoal || 1,
    defaultView: req.body.defaultView || 'grid',
    sortBy: req.body.sortBy || 'dateAdded',
    sortOrder: req.body.sortOrder || 'desc',
    notificationsEnabled: req.body.notificationsEnabled ?? true,
    autoBackup: req.body.autoBackup ?? false,
    backupFrequency: req.body.backupFrequency || 'weekly',
  });
}