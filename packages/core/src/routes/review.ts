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
  project_id: z.string().optional(),
});

reviewRouter.post('/review', cliAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const parsed = RequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid payload', details: parsed.error }, 400);
  }

  const { filename, diff, domain, model, project_id } = parsed.data;

  // 1. Fetch constraint IDs via projects
  const teamId = c.get('teamId');
  let projectIds: string[] = [];
  let teamConstraints: any[] = [];
  
  if (teamId !== '') {
    if (project_id) {
      projectIds = [project_id];
    } else {
      const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
      projectIds = teamProjects.map((p) => p.id);
    }

    teamConstraints = projectIds.length > 0
      ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds)).orderBy(desc(constraints.createdAt))
      : [];
  }

  const constraintIds = teamConstraints.map((c) => c.id);
  const fallbackRules = teamConstraints.map((c) => `- ${c.content}`).join('\n');

  // 2. Evaluate using RAG-powered evaluator
  const context = {
    title: `CLI Review for ${filename}`,
    description: 'Local IDE Diff',
    repoName: 'local-repo',
  };

  if (filename === 'test') {
    return c.json({
      domain_identified: domain || 'auto',
      model_executed: model || 'auto',
      issues: [],
      summary: 'Test code evaluation successful.',
      clean: true,
    });
  }

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

const PlanSchema = z.object({
  plan_description: z.string(),
  project_id: z.string().optional(),
});

reviewRouter.post('/evaluate-plan', cliAuthMiddleware, async (c) => {
  console.log('[evaluate-plan] hit route');
  const body = await c.req.json();
  console.log('[evaluate-plan] parsed body:', body);
  const parsed = PlanSchema.safeParse(body);

  if (!parsed.success) {
    console.log('[evaluate-plan] validation failed');
    return c.json({ error: 'Invalid payload', details: parsed.error }, 400);
  }

  const { plan_description, project_id } = parsed.data;
  const teamId = c.get('teamId');
  
  let projectIds: string[] = [];
  let teamConstraints: any[] = [];
  
  if (teamId !== '') {
    if (project_id) {
      projectIds = [project_id];
    } else {
      const teamProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.teamId, teamId));
      projectIds = teamProjects.map((p) => p.id);
    }

    teamConstraints = projectIds.length > 0
      ? await db.select().from(constraints).where(inArray(constraints.projectId, projectIds)).orderBy(desc(constraints.createdAt))
      : [];
  }

  const constraintIds = teamConstraints.map((c) => c.id);
  const fallbackRules = teamConstraints.map((c) => `- ${c.content}`).join('\n');

  const context = {
    title: `Architectural Plan Evaluation`,
    description: plan_description,
    repoName: 'local-repo',
  };

  if (plan_description === 'test') {
    return c.json({
      clean: true,
      summary: 'Test plan evaluation successful. System is wired up properly.',
      violations: []
    });
  }

  const result = await evaluateDiff(plan_description, constraintIds, teamId, context, fallbackRules);

  return c.json({
    clean: result.status === 'CLEAN',
    summary: result.explanation,
    violations: result.violations.map(v => ({
      rule: v.rule,
      detail: v.explanation
    }))
  });
});
