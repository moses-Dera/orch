import { Hono } from 'hono';
import { cliAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints, projects } from '../db/schema';
import { desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { evaluateDiff } from '../ai/evaluator';
import type { AppVariables } from '../types';

export const reviewRouter = new Hono<{ Variables: AppVariables }>();

// The schema the CLI sends
const RequestSchema = z.object({
  filename: z.string(),
  diff: z.string(),
  domain: z.string().optional(),
  model: z.string().optional(),
});

reviewRouter.post('/review', cliAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid payload', details: parsed.error }, 400);
  }

  const { filename, diff, domain, model } = parsed.data;

  // 1. Fetch constraint IDs via projects (constraints link to projects, not teams directly)
  const teamId = c.get('teamId');
  const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
  const projectIds = teamProjects.map((p) => p.id);

  const teamConstraints = projectIds.length > 0
    ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds)).orderBy(desc(constraints.createdAt))
    : [];

  const constraintIds = teamConstraints.map((c) => c.id);
  const fallbackRules = teamConstraints.map((c) => `- ${c.content}`).join('\n');

  // 2. Evaluate using RAG-powered evaluator
  const context = {
    title: `CLI Review for ${filename}`,
    description: 'Local IDE Diff',
    repoName: 'local-repo',
  };

  const result = await evaluateDiff(diff, constraintIds, teamId, context, fallbackRules);

  return c.json({
    domain_identified: domain || 'auto',
    model_executed: model || 'auto',
    issues: result.violations.map((v) => ({
      severity: 'warning',
      line: v.line,
      title: 'Constraint Violation',
      detail: v.explanation,
      constraint_id: v.rule,
      suggested_fix: 'Review Orch policies.',
    })),
    summary: result.explanation,
    clean: result.status === 'CLEAN',
  });
});
