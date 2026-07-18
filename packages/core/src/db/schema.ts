import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// This is a minimal schema setup. We will expand this as needed.

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
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const constraints = pgTable('constraints', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  type: text('type').notNull(), // e.g., 'tech_stack', 'security', 'style'
  content: text('content').notNull(),
  // For RAG we will add a vector column using pgvector here later
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
