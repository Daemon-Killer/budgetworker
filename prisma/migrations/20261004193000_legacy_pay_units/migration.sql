-- The directory backfill cannot infer thousands or per-visit prices as monthly amounts.
-- Clear only values matching that backfill; preserve original salary text and explicit edits.
UPDATE "Worker" SET "expectedPayInr" = NULL
WHERE "hoursPerDay" IS NULL AND "payPeriod" = 'MONTH'
 AND "salaryExpectation" ~ '^[^0-9]*[0-9][0-9,]*[^0-9]*$'
 AND length(replace(substring("salaryExpectation" from '[0-9][0-9,]*'), ',', '')) < 7
 AND "expectedPayInr" = replace(substring("salaryExpectation" from '[0-9][0-9,]*'), ',', '')::integer
 AND lower("salaryExpectation") ~ '([0-9][[:space:]]*k([[:space:]/]|$)|visit|session|shift)';
