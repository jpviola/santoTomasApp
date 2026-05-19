-- CreateTable
CREATE TABLE "DebateTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "error" TEXT,
    "question" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "context" TEXT,
    "recordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
