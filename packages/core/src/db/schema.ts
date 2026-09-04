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
  currentVersionNumber: integer('current_version_number').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const constraintVersions = pgTable('constraint_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  constraintId: text('constraint_id').notNull().references(() => constraints.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  versionNumber: integer('version_number').notNull(),
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

// Marketplace: Community and Verified AI Skills
export const publicSkills = pgTable('public_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(), // e.g. 'vercel-nextjs-15-strict'
  name: text('name').notNull(),
  description: text('description').notNull(),
  authorId: text('author_id').references(() => users.id),
  authorName: text('author_name').notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]),
  version: text('version').default('1.0.0').notNull(),
  downloadsCount: integer('downloads_count').default(0).notNull(),
  isPaid: boolean('is_paid').default(false).notNull(),
  priceCents: integer('price_cents').default(0),
  lemonSqueezyVariantId: text('lemon_squeezy_variant_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const publicSkillRules = pgTable('public_skill_rules', {
  id: text('id').primaryKey(), // e.g. 'nextjs_use_server_actions'
  skillId: uuid('skill_id').notNull().references(() => publicSkills.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'security', 'style', 'performance', 'tech_stack'
  description: text('description').notNull(),
  content: text('content').notNull(),
  goodExamples: jsonb('good_examples').$type<string[]>(),
  badExamples: jsonb('bad_examples').$type<string[]>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const publicSkillChunks = pgTable('public_skill_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: text('rule_id').notNull().references(() => publicSkillRules.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  chunkText: text('chunk_text').notNull(),
  embedding: text('embedding'), // Cast to vector via raw SQL
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projectSkillSubscriptions = pgTable('project_skill_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  skillId: uuid('skill_id').notNull().references(() => publicSkills.id, { onDelete: 'cascade' }),
  pinnedVersion: text('pinned_version').default('latest').notNull(),
  precedenceMode: text('precedence_mode').default('private_overrules').notNull(), // 'private_overrules' | 'strict_union' | 'public_overrules'
  excludedRuleIds: jsonb('excluded_rule_ids').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Spec-Compliant Job Queue: zero-new-infra async queue for deep research & MCP burst throttling
export const jobQueue = pgTable('job_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type').notNull(), // 'chat_research' | 'mcp_evaluate' | 'policy_sync'
  teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('queued'), // 'queued' | 'processing' | 'completed' | 'failed'
  payload: jsonb('payload').notNull(),
  result: jsonb('result'),
  error: text('error'),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(3).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

