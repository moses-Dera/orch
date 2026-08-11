import { Hono } from 'hono';
import { cliAuthMiddleware } from '../middlewares';
import { db } from '../db';
import { constraints } from '../db/schema';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { evaluateDiff } from '../ai/evaluator';

export const reviewRouter = new Hono();

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

  // 1. Fetch Constraints
  const teamId = c.get('teamId') as string;
  const teamConstraints = await db.select()
    .from(constraints)
    .where(eq(constraints.teamId, teamId))
    .orderBy(desc(constraints.createdAt));

  const activeConstraintContent = teamConstraints.map(c => `- ${c.content}`).join('\n');

  // 2. Evaluate using shared logic
  const context = {
    title: \`CLI Review for \${filename}\`,
    description: 'Local IDE Diff',
    repoName: 'local-repo'
  };

  const result = await evaluateDiff(diff, activeConstraintContent, teamId, context);

  return c.json({
    domain_identified: domain || 'auto',
    model_executed: model || 'auto',
    issues: result.violations.map(v => ({
      severity: 'warning',
      line: v.line,
      title: 'Constraint Violation',
      detail: v.explanation,
      constraint_id: v.rule,
      suggested_fix: 'Review Orch policies.'
    })),
    summary: result.explanation,
    clean: result.status === 'CLEAN'
  });
});
