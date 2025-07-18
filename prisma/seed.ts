import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
    },
  });

  console.log('Created user:', user);

  // Create test books
  const book1 = await prisma.book.create({
    data: {
      userId: user.id,
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      notes: 'Beautiful prose about the American Dream',
      progress: 45,
      status: 'currently_reading',
      totalPages: 180,
      currentPage: 81,
      genre: 'Classic Literature',
      publishedDate: '1925',
      dateStarted: new Date('2025-01-01'),
      tags: ['classic', 'american', 'literature'],
      rating: 4,
    },
  });

  const book2 = await prisma.book.create({
    data: {
      userId: user.id,
      title: 'To Kill a Mockingbird',
      author: 'Harper Lee',
      notes: 'Powerful story about justice and moral growth',
      progress: 100,
      status: 'finished',
      totalPages: 281,
      currentPage: 281,
      genre: 'Classic Literature',
      publishedDate: '1960',
      dateStarted: new Date('2024-12-01'),
      dateFinished: new Date('2024-12-15'),
      tags: ['classic', 'american', 'social justice'],
      rating: 5,
    },
  });

  const book3 = await prisma.book.create({
    data: {
      userId: user.id,
      title: '1984',
      author: 'George Orwell',
      notes: 'Dystopian masterpiece about totalitarianism',
      progress: 0,
      status: 'want_to_read',
      totalPages: 328,
      genre: 'Dystopian Fiction',
      publishedDate: '1949',
      tags: ['dystopian', 'political', 'classic'],
    },
  });

  console.log('Created books:', { book1, book2, book3 });

  // Create user settings
  const settings = await prisma.userSettings.create({
    data: {
      userId: user.id,
      theme: 'system',
      defaultView: 'grid',
      dailyReadingGoal: 30,
      sortBy: 'dateAdded',
      sortOrder: 'desc',
      notificationsEnabled: true,
      autoBackup: false,
      backupFrequency: 'weekly',
    },
  });

  console.log('Created settings:', settings);

  // Create streak history
  const streakHistory = await prisma.streakHistory.create({
    data: {
      userId: user.id,
      currentStreak: 365,
      longestStreak: 551,
      lastReadDate: new Date(),
      readingDaysData: {},
      bookPeriodsData: [],
      dataVersion: 1,
    },
  });

  console.log('Created streak history:', streakHistory);

  // Create some reading days
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  await prisma.readingDay.createMany({
    data: [
      {
        userId: user.id,
        date: today,
        bookIds: [book1.id],
        notes: 'Great reading session today',
        source: 'progress',
      },
      {
        userId: user.id,
        date: yesterday,
        bookIds: [book1.id, book2.id],
        notes: 'Finished To Kill a Mockingbird',
        source: 'book',
      },
    ],
  });

  console.log('Created reading days');

  // Create a better-auth session for the user
  const session = await prisma.session.create({
    data: {
      token: 'GZGbpcJZfY2M5W63z550u77AUCE3n4TH',
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (test)',
    },
  });

  console.log('Created session:', session);

  console.log('Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });