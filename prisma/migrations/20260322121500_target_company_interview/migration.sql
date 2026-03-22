-- CreateTable
CREATE TABLE "TargetCompany" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TargetCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewPrep" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetCompanyId" UUID,
    "company" TEXT NOT NULL,
    "role" TEXT,
    "userSkills" TEXT[],
    "technical" TEXT[],
    "behavioral" TEXT[],
    "coding" TEXT[],
    "focusAreas" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewPrep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TargetCompany_userId_createdAt_idx" ON "TargetCompany"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "TargetCompany_userId_name_idx" ON "TargetCompany"("userId", "name");

-- CreateIndex
CREATE INDEX "InterviewPrep_userId_createdAt_idx" ON "InterviewPrep"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InterviewPrep_targetCompanyId_idx" ON "InterviewPrep"("targetCompanyId");

-- AddForeignKey
ALTER TABLE "TargetCompany" ADD CONSTRAINT "TargetCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPrep" ADD CONSTRAINT "InterviewPrep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewPrep" ADD CONSTRAINT "InterviewPrep_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "TargetCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
