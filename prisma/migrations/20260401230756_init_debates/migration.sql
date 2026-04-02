-- CreateTable
CREATE TABLE "Debate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "question" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "context" TEXT,
    "objections" JSONB NOT NULL,
    "sedContra" TEXT NOT NULL,
    "respondeo" TEXT NOT NULL,
    "replies" JSONB NOT NULL,
    "application" TEXT NOT NULL,
    "sources" JSONB NOT NULL,
    "generatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
