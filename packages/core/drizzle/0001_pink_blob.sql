CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"display_name" text NOT NULL,
	"api_key" text,
	"endpoint" text,
	"context_window" integer DEFAULT 8192 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"user_id" text,
	"user_email" text,
	"total_messages" integer DEFAULT 0 NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"clean" boolean DEFAULT true NOT NULL,
	"issues" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "constraints" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "constraints" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "constraints" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "constraints" ADD COLUMN "gpt_variant" text;--> statement-breakpoint
ALTER TABLE "constraints" ADD COLUMN "claude_variant" text;--> statement-breakpoint
ALTER TABLE "constraints" ADD COLUMN "gemini_variant" text;--> statement-breakpoint
ALTER TABLE "constraints" ADD COLUMN "version" text DEFAULT '1.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;