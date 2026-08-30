-- Migration: Add mcp_servers table for external MCP server configuration
CREATE TABLE IF NOT EXISTS "mcp_servers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "team_id" uuid NOT NULL REFERENCES "teams"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "url" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
