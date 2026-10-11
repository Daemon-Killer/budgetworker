CREATE TABLE "DirectoryRevision" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "version" BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT "DirectoryRevision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DirectoryRevision_singleton" CHECK ("id" = 1)
);

INSERT INTO "DirectoryRevision" ("id", "version") VALUES (1, 0);

-- The revision commits with the worker change, including changes made through
-- either admin API or another database client. It contains no worker data.
CREATE FUNCTION bump_directory_revision() RETURNS trigger AS $$
BEGIN
    UPDATE "DirectoryRevision" SET "version" = "version" + 1 WHERE "id" = 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER worker_directory_changed
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE ON "Worker"
FOR EACH STATEMENT EXECUTE FUNCTION bump_directory_revision();
