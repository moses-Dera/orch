import { db } from '../db';
import { jobQueue } from '../db/schema';
import { eq, sql } from 'drizzle-orm';

export type JobType = 'chat_research' | 'mcp_evaluate' | 'policy_sync';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface EnqueueOptions {
  maxAttempts?: number;
}

/**
 * Enqueue a new background job into the Postgres-backed queue.
 * Strictly adheres to Orch spec (Bun + Hono + Postgres) without extra infrastructure.
 */
export async function enqueueJob(
  teamId: string,
  type: JobType,
  payload: Record<string, any>,
  options?: EnqueueOptions
) {
  const [job] = await db
    .insert(jobQueue)
    .values({
      teamId,
      type,
      payload,
      maxAttempts: options?.maxAttempts ?? 3,
      status: 'queued',
      attempts: 0,
    })
    .returning();

  return job;
}

/**
 * Atomically checkout the next available job using Postgres `FOR UPDATE SKIP LOCKED`.
 * Guarantees zero race conditions across concurrent workers or instances.
 */
export async function dequeueNextJob(types?: JobType[]) {
  const typeFilter = types && types.length > 0
    ? sql`AND type = ANY(${types}::text[])`
    : sql``;

  const result = await db.execute<any>(sql`
    WITH next_job AS (
      SELECT id
      FROM job_queue
      WHERE status = 'queued'
      ${typeFilter}
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE job_queue
    SET
      status = 'processing',
      attempts = attempts + 1,
      updated_at = NOW()
    WHERE id = (SELECT id FROM next_job)
    RETURNING *;
  `);

  const rows = (result as unknown as any[]);
  return rows && rows.length > 0 ? rows[0] : null;
}

/**
 * Mark a job as successfully completed with results.
 */
export async function completeJob(id: string, result: Record<string, any>) {
  const [job] = await db
    .update(jobQueue)
    .set({
      status: 'completed',
      result,
      updatedAt: new Date(),
    })
    .where(eq(jobQueue.id, id))
    .returning();

  return job;
}

/**
 * Mark a job as failed. If max attempts are reached, set to 'failed'.
 * Otherwise, put back into 'queued' status for automatic retry.
 */
export async function failJob(id: string, errorMessage: string) {
  const [current] = await db
    .select({ attempts: jobQueue.attempts, maxAttempts: jobQueue.maxAttempts })
    .from(jobQueue)
    .where(eq(jobQueue.id, id));

  const shouldRetry = current && current.attempts < current.maxAttempts;
  const nextStatus: JobStatus = shouldRetry ? 'queued' : 'failed';

  const [job] = await db
    .update(jobQueue)
    .set({
      status: nextStatus,
      error: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(jobQueue.id, id))
    .returning();

  return job;
}

/**
 * Fetch job status by ID.
 */
export async function getJob(id: string) {
  const [job] = await db.select().from(jobQueue).where(eq(jobQueue.id, id));
  return job || null;
}
