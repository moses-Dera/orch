import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/orch';

// Disable prefetch as it is not supported for "Transaction" pool mode
// Set idle_timeout to prevent Supabase from silently dropping idle connections
const client = postgres(connectionString, { prepare: false, idle_timeout: 0, max_lifetime: 60 * 30 });

export const db = drizzle(client, { schema });
