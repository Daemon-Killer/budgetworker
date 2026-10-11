-- Existing files remain stored but require staff review before customer access.
ALTER TABLE "Worker" ADD COLUMN "resumeContactReviewed" BOOLEAN NOT NULL DEFAULT false;
