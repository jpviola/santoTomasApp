ALTER TABLE "Debate" ADD COLUMN "userId" TEXT;

UPDATE "Debate" SET "userId" = 'legacy';

ALTER TABLE "Debate" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "Debate_userId_createdAt_idx" ON "Debate"("userId", "createdAt");

ALTER TABLE "DebateTask" ADD COLUMN "userId" TEXT;

UPDATE "DebateTask" SET "userId" = 'legacy';

ALTER TABLE "DebateTask" ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "DebateTask_userId_createdAt_idx" ON "DebateTask"("userId", "createdAt");
