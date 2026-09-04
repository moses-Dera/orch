ALTER TABLE "constraints" ADD COLUMN IF NOT EXISTS "current_version_number" integer DEFAULT 1 NOT NULL;

CREATE TABLE IF NOT EXISTS "constraint_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "constraint_id" text NOT NULL REFERENCES "constraints"("id") ON DELETE cascade,
  "content" text NOT NULL,
  "version_number" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
