-- AlterTable
ALTER TABLE "Worker" ADD COLUMN     "resumeData" BYTEA,
ADD COLUMN     "resumeFileName" TEXT,
ADD COLUMN     "resumeMimeType" TEXT,
ADD COLUMN     "resumeSize" INTEGER;
