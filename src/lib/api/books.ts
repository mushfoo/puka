import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import type { ApiRequest, ApiResponse } from './types';

// Initialize Prisma Client
const prisma = new PrismaClient();


// Zod schemas for validation
const BookCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  notes: z.union([z.string(), z.null()]).optional().transform(val => val === null ? undefined : val),
  progress: z.number().min(0).max(100).default(0),
  status: z.enum(['want_to_read', 'currently_reading', 'finished']).default('want_to_read'),
  isbn: z.union([z.string(), z.null()]).optional().transform(val => val === null ? undefined : val),
  coverUrl: z.union([z.string().url(), z.null()]).optional().transform(val => val === null ? undefined : val),
  tags: z.array(z.string()).default([]),
  rating: z.union([z.number().min(1).max(5), z.null()]).optional().transform(val => val === null ? undefined : val),
  totalPages: z.union([z.number().positive(), z.null()]).optional().transform(val => val === null ? undefined : val),
  currentPage: z.union([z.number().nonnegative(), z.null()]).optional().transform(val => val === null ? undefined : val),
  genre: z.union([z.string(), z.null()]).optional().transform(val => val === null ? undefined : val),
  publishedDate: z.union([z.string(), z.null()]).optional().transform(val => val === null ? undefined : val),
  dateStarted: z.union([z.string().datetime(), z.null()]).optional().transform(val => val === null ? undefined : val),
  dateFinished: z.union([z.string().datetime(), z.null()]).optional().transform(val => val === null ? undefined : val),
});

const BookUpdateSchema = BookCreateSchema.partial();

const BookFilterSchema = z.object({
  status: z.enum(['want_to_read', 'currently_reading', 'finished', 'all']).optional(),
  search: z.string().optional(),
  genre: z.string().optional(),
  rating: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).optional().refine(val => val === undefined || (typeof val === 'number' && val >= 1 && val <= 5), {
    message: 'Rating must be between 1 and 5'
  }),
  sortBy: z.enum(['dateAdded', 'title', 'author', 'progress', 'dateFinished']).default('dateAdded'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).default(50).refine(val => val > 0 && val <= 100, {
    message: 'Limit must be between 1 and 100'
  }),
  offset: z.union([z.number(), z.string().transform(val => parseInt(val, 10))]).default(0).refine(val => val >= 0, {
    message: 'Offset must be non-negative'
  }),
  // Ignore unknown fields to handle malformed requests gracefully
}).passthrough();

export async function handleBooksRequest(req: ApiRequest, res: ApiResponse, userId: string | null) {
  try {
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetBooks(req, res, userId);
      case 'POST':
        return await handleCreateBook(req, res, userId);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Books API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
}

export async function handleBookByIdRequest(req: ApiRequest, res: ApiResponse, userId: string | null, bookId: string) {
  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    switch (req.method) {
      case 'GET':
        return await handleGetBook(req, res, userId, bookId);
      case 'PUT':
        return await handleUpdateBook(req, res, userId, bookId);
      case 'DELETE':
        return await handleDeleteBook(req, res, userId, bookId);
      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Book by ID API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGetBooks(req: ApiRequest, res: ApiResponse, userId: string) {
  
  const filterResult = BookFilterSchema.safeParse(req.query);
  if (!filterResult.success) {
    return res.status(400).json({ error: 'Invalid filter parameters', details: filterResult.error });
  }

  const { status, search, genre, rating, sortBy, sortOrder, limit, offset } = filterResult.data;

  try {
    const where: any = { userId };
    
    // Apply filters
    if (status && status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (genre) {
      where.genre = { contains: genre, mode: 'insensitive' };
    }
    if (rating) {
      where.rating = rating;
    }

    // Count total books for pagination
    const total = await prisma.book.count({ where });

    // Get books with pagination and sorting
    const books = await prisma.book.findMany({
      where,
      orderBy: {
        [sortBy === 'dateAdded' ? 'createdAt' : sortBy]: sortOrder,
      },
      skip: offset,
      take: limit,
    });

    res.json({
      books,
      pagination: {
        limit,
        offset,
        total,
      }
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
}

async function handleCreateBook(req: ApiRequest, res: ApiResponse, userId: string) {
  
  const validationResult = BookCreateSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: 'Invalid book data', details: validationResult.error });
  }

  const bookData = validationResult.data;
  
  try {
    const book = await prisma.book.create({
      data: {
        ...bookData,
        userId,
        dateStarted: bookData.dateStarted ? new Date(bookData.dateStarted) : null,
        dateFinished: bookData.dateFinished ? new Date(bookData.dateFinished) : null,
      },
    });

    res.status(201).json(book);
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
}

async function handleGetBook(_req: ApiRequest, res: ApiResponse, userId: string, bookId: string) {
  
  try {
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId,
      },
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
}

async function handleUpdateBook(req: ApiRequest, res: ApiResponse, userId: string, bookId: string) {
  
  const validationResult = BookUpdateSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({ error: 'Invalid book data', details: validationResult.error });
  }

  const updateData = validationResult.data;
  
  try {
    // Check if book exists and belongs to user
    const existingBook = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId,
      },
    });

    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Update the book
    const updatedBook = await prisma.book.update({
      where: { id: bookId },
      data: {
        ...updateData,
        dateStarted: updateData.dateStarted ? new Date(updateData.dateStarted) : undefined,
        dateFinished: updateData.dateFinished ? new Date(updateData.dateFinished) : undefined,
      },
    });

    res.json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
}

async function handleDeleteBook(_req: ApiRequest, res: ApiResponse, userId: string, bookId: string) {
  
  try {
    // Check if book exists and belongs to user
    const existingBook = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId,
      },
    });

    if (!existingBook) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Delete the book
    await prisma.book.delete({
      where: { id: bookId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
}

// Data mapping utilities (temporarily disabled)
// TODO: Re-enable when Prisma is working