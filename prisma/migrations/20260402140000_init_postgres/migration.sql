-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DebateTaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Debate" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "context" TEXT,
    "objections" JSONB NOT NULL,
    "sedContra" TEXT NOT NULL,
    "respondeo" TEXT NOT NULL,
    "replies" JSONB NOT NULL,
    "application" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Debate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebateTask" (
    "id" TEXT NOT NULL,
    "status" "DebateTaskStatus" NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "error" TEXT,
    "question" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "context" TEXT,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DebateTask_pkey" PRIMARY KEY ("id")
);
