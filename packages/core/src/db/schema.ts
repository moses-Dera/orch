import { integer, pgTable, text, timestamp, uuid, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(), // Clerk org ID
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  userId: text('user_id').references(() => users.id), // Link the team to the user who created it
  name: text('name').notNull(),
  githubInstallationId: text('github_installation_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
export const mcpServers = pgTable('mcp_servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const teamGithubInstallations = pgTable('team_github_installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  installationId: text('installation_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  keyHash: text('key_hash').notNull().unique(), // We store a hash of the key for security
  teamId: uuid('team_id').notNull().references(() => teams.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  name: text('name').notNull(),
  githubRepoFullName: text('github_repo_full_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const constraints = pgTable('constraints', {
  id: text('id').primaryKey(), // e.g. 'backend', 'cyber' (Dashboard expects strings, not auto UUIDs for these)
  projectId: uuid('project_id').notNull().references(() => projects.id),
  type: text('type').notNull(), // kept for backward compat with CLI currently, but UI uses 'id' as type
  description: text('description').notNull().default(''),
  content: text('content').notNull(), // The base constraints
  gptVariant: text('gpt_variant'),
  claudeVariant: text('claude_variant'),
  geminiVariant: text('gemini_variant'),
  goodExamples: jsonb('good_examples'), // Array of strings representing good code
  badExamples: jsonb('bad_examples'),   // Array of strings representing bad code
  status: text('status').notNull().default('active'), // 'active' or 'draft'
  version: text('version').notNull().default('1.0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tokenBudgets = pgTable('token_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  allocatedTokens: integer('allocated_tokens').notNull().default(100000),
  consumedTokens: integer('consumed_tokens').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const models = pgTable('models', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  provider: text('provider').notNull(),
  modelId: text('model_id').notNull(),
  displayName: text('display_name').notNull(),
  apiKey: text('api_key'), // Encrypted ideally, or plaintext for prototype
  endpoint: text('endpoint'),
  contextWindow: integer('context_window').notNull().default(8192),
  isCritic: boolean('is_critic').notNull().default(false),
  isJudge: boolean('is_judge').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  userId: text('user_id').references(() => users.id),
  userEmail: text('user_email'), // Denormalized for dashboard
  totalMessages: integer('total_messages').notNull().default(0),
  totalInputTokens: integer('total_input_tokens').notNull().default(0),
  totalOutputTokens: integer('total_output_tokens').notNull().default(0),
  clean: boolean('clean').notNull().default(true),
  issues: jsonb('issues'), // Store constraint violations
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const githubEvaluations = pgTable('github_evaluations', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  pullRequestNumber: integer('pull_request_number').notNull(),
  status: text('status').notNull(), // 'CLEAN' or 'VIOLATION'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  lemonSqueezyId: text('lemon_squeezy_id'), // The ID from Lemon Squeezy
  status: text('status').notNull().default('inactive'), // 'active', 'past_due', 'canceled', 'inactive'
  planId: text('plan_id'),
  renewsAt: timestamp('renews_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const processedWebhooks = pgTable('processed_webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull().unique(), // The Lemon Squeezy meta.event_id
  eventName: text('event_name').notNull(),
  processedAt: timestamp('processed_at').defaultNow().notNull(),
});

// RAG: Stores embedded chunks of constraint content for semantic retrieval
export const constraintChunks = pgTable('constraint_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  constraintId: text('constraint_id').notNull().references(() => constraints.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  chunkText: text('chunk_text').notNull(),
  embedding: text('embedding'), // Cast to vector(3072) via raw SQL
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user', 'assistant', 'system', 'tool'
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
