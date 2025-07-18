// Temporarily disabled while using mock data
// import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { ApiRequest, ApiResponse } from './types';

// Temporarily disabled while using mock data
// const prisma = new PrismaClient();

// Zod schemas for validation
const StreakUpdateSchema = z.object({
  currentStreak: z.number().nonnegative().optional(),
  longestStreak: z.number().nonnegative().optional(),
  lastReadDate: z.string().datetime().optional(),
  readingDaysData: z.record(z.any()).optional(),
  bookPeriodsData: z.array(z.any()).optional(),
});

const ReadingDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  bookIds: z.array(z.string()).default([]),
  notes: z.string().optional(),
  source: z.enum(['manual', 'book', 'progress']).default('manual'),
});

export async function handleStreakRequest(req: ApiRequest, res: ApiResponse, userId: string | null) {
  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetStreak(req, res, userId);
      case 'PUT':
        return await handleUpdateStreak(req, res, userId);
      case 'POST':
        // For marking reading days
        return await handleMarkReadingDay(req, res, userId);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Streak API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetStreak(req: ApiRequest, res: ApiResponse, userId: string) {
  console.log('handleGetStreak called for userId:', userId);
  
  // Return mock streak data
  res.json({
    currentStreak: 0,
    longestStreak: 0,
    lastReadDate: null,
    readingDaysData: {},
    bookPeriodsData: [],
    dataVersion: 1,
    lastCalculated: new Date().toISOString(),
  });
}

async function handleUpdateStreak(req: ApiRequest, res: ApiResponse, _userId: string) {
  console.log('handleUpdateStreak called');
  
  const validationResult = StreakUpdateSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: 'Invalid streak data', details: validationResult.error });
  }

  // Return mock updated streak
  res.json({
    currentStreak: req.body.currentStreak || 0,
    longestStreak: req.body.longestStreak || 0,
    lastReadDate: req.body.lastReadDate || null,
    readingDaysData: req.body.readingDaysData || {},
    bookPeriodsData: req.body.bookPeriodsData || [],
    dataVersion: 1,
    lastCalculated: new Date().toISOString(),
  });
}

async function handleMarkReadingDay(req: ApiRequest, res: ApiResponse, _userId: string) {
  console.log('handleMarkReadingDay called');
  
  const validationResult = ReadingDaySchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: 'Invalid reading day data', details: validationResult.error });
  }

  const { date, bookIds, notes, source } = validationResult.data;

  // Return mock reading day and streak data
  res.json({
    readingDay: {
      date,
      bookIds: bookIds || [],
      notes: notes || null,
      source: source || 'manual',
    },
    streakHistory: {
      currentStreak: 1,
      longestStreak: 1,
      lastReadDate: date,
    },
  });
}