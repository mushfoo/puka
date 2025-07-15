-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('want_to_read', 'currently_reading', 'finished');

-- CreateEnum
CREATE TYPE "ReadingDaySource" AS ENUM ('manual', 'book', 'progress');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('light', 'dark', 'system');

-- CreateEnum
CREATE TYPE "DefaultView" AS ENUM ('grid', 'list');

-- CreateEnum
CREATE TYPE "SortBy" AS ENUM ('dateAdded', 'title', 'author', 'progress', 'dateFinished');

-- CreateEnum
CREATE TYPE "SortOrder" AS ENUM ('asc', 'desc');

-- CreateEnum
CREATE TYPE "BackupFrequency" AS ENUM ('daily', 'weekly', 'monthly');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "notes" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "BookStatus" NOT NULL DEFAULT 'want_to_read',
    "isbn" TEXT,
    "cover_url" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating" INTEGER,
    "total_pages" INTEGER,
    "current_page" INTEGER,
    "genre" TEXT,
    "published_date" TEXT,
    "date_started" DATE,
    "date_finished" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "legacy_id" INTEGER,
    "last_synced" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "sync_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_days" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "book_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "source" "ReadingDaySource" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'system',
    "default_view" "DefaultView" NOT NULL DEFAULT 'grid',
    "daily_reading_goal" INTEGER NOT NULL DEFAULT 1,
    "sort_by" "SortBy" NOT NULL DEFAULT 'dateAdded',
    "sort_order" "SortOrder" NOT NULL DEFAULT 'desc',
    "notifications_enabled" BOOLEAN NOT NULL DEFAULT true,
    "auto_backup" BOOLEAN NOT NULL DEFAULT false,
    "backup_frequency" "BackupFrequency" NOT NULL DEFAULT 'weekly',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streak_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "last_read_date" DATE,
    "reading_days_data" JSONB NOT NULL DEFAULT '{}',
    "book_periods_data" JSONB NOT NULL DEFAULT '[]',
    "data_version" INTEGER NOT NULL DEFAULT 1,
    "last_calculated" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "last_synced" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streak_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Book_userId_idx" ON "Book"("userId");

-- CreateIndex
CREATE INDEX "Book_userId_status_idx" ON "Book"("userId", "status");

-- CreateIndex
CREATE INDEX "Book_updated_at_idx" ON "Book"("updated_at");

-- CreateIndex
CREATE INDEX "Book_legacy_id_idx" ON "Book"("legacy_id");

-- CreateIndex
CREATE INDEX "reading_days_user_id_idx" ON "reading_days"("user_id");

-- CreateIndex
CREATE INDEX "reading_days_user_id_date_idx" ON "reading_days"("user_id", "date");

-- CreateIndex
CREATE INDEX "reading_days_updated_at_idx" ON "reading_days"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "reading_days_user_id_date_key" ON "reading_days"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "user_settings_user_id_key" ON "user_settings"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "streak_history_user_id_key" ON "streak_history"("user_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_days" ADD CONSTRAINT "reading_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streak_history" ADD CONSTRAINT "streak_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
