ALTER TABLE "Worker" ADD COLUMN "expectedPayInr" INTEGER,
 ADD COLUMN "payPeriod" TEXT NOT NULL DEFAULT 'MONTH',
 ADD COLUMN "hoursPerDay" DOUBLE PRECISION;
CREATE TABLE "CheckoutTicket" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumed" BOOLEAN NOT NULL DEFAULT false);
CREATE INDEX "CheckoutTicket_expiresAt_idx" ON "CheckoutTicket"("expiresAt");
ALTER TABLE "CheckoutTicket" ADD CONSTRAINT "CheckoutTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "Worker" SET "expectedPayInr" = replace(substring("salaryExpectation" from '[0-9][0-9,]*'), ',', '')::integer
WHERE "salaryExpectation" ~ '^[^0-9]*[0-9][0-9,]*[^0-9]*$'
 AND length(replace(substring("salaryExpectation" from '[0-9][0-9,]*'), ',', '')) < 7;
UPDATE "Worker" SET "payPeriod" = CASE
 WHEN lower("salaryExpectation") ~ '(hour|hr)' THEN 'HOUR'
 WHEN lower("salaryExpectation") ~ '(day|daily)' THEN 'DAY'
 ELSE 'MONTH' END;
CREATE INDEX "Worker_status_onboardingStatus_expectedPayInr_idx" ON "Worker"("status", "onboardingStatus", "expectedPayInr");
ALTER TABLE "SiteSettings" ALTER COLUMN "description" SET DEFAULT 'Browse local worker profiles for free. Choose a resume pack to unlock the people who fit your home.';
UPDATE "SiteSettings" SET "description" = 'Browse local worker profiles for free. Choose a resume pack to unlock the people who fit your home.', "jobPostingEnabled" = false
 WHERE "description" = 'Post what you need, compare applications and hire someone from your neighbourhood.';

ALTER TABLE "SiteSettings" ALTER COLUMN "jobPostingEnabled" SET DEFAULT false;
UPDATE "SiteSettings" SET "jobPostingEnabled"=false;
