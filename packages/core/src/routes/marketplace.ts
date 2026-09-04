import { Hono } from 'hono';
import { db } from '../db';
import { publicSkills, publicSkillRules, projectSkillSubscriptions, projects, users } from '../db/schema';
import { eq, desc, sql, and, ilike, or } from 'drizzle-orm';
import { embedPublicSkillRule } from '../ai/embedder';
import { cliAuthMiddleware } from '../middlewares';
import type { AppVariables } from '../types';

export const marketplaceRouter = new Hono<{ Variables: AppVariables }>();

// ─── 1. Public Discovery: List & Search Skills ──────────────────────────────
marketplaceRouter.get('/skills', async (c) => {
  const search = c.req.query('search')?.trim().toLowerCase();
  const tag = c.req.query('tag')?.trim().toLowerCase();
  const verifiedOnly = c.req.query('verified') === 'true';
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 100);

  let conditions: any[] = [];

  if (verifiedOnly) {
    conditions.push(eq(publicSkills.isVerified, true));
  }

  if (search) {
    conditions.push(
      or(
        ilike(publicSkills.name, `%${search}%`),
        ilike(publicSkills.description, `%${search}%`),
        ilike(publicSkills.slug, `%${search}%`),
        ilike(publicSkills.authorName, `%${search}%`)
      )
    );
  }

  const query = db
    .select({
      id: publicSkills.id,
      slug: publicSkills.slug,
      name: publicSkills.name,
      description: publicSkills.description,
      authorId: publicSkills.authorId,
      authorName: publicSkills.authorName,
      isVerified: publicSkills.isVerified,
      tags: publicSkills.tags,
      version: publicSkills.version,
      downloadsCount: publicSkills.downloadsCount,
      isPaid: publicSkills.isPaid,
      priceCents: publicSkills.priceCents,
      createdAt: publicSkills.createdAt,
      updatedAt: publicSkills.updatedAt,
      rulesCount: sql<number>`cast(count(${publicSkillRules.id}) as integer)`,
    })
    .from(publicSkills)
    .leftJoin(publicSkillRules, eq(publicSkills.id, publicSkillRules.skillId))
    .groupBy(publicSkills.id)
    .orderBy(desc(publicSkills.downloadsCount), desc(publicSkills.createdAt))
    .limit(limit);

  if (conditions.length > 0) {
    // @ts-ignore
    query.where(and(...conditions));
  }

  let skills = await query;

  // If a tag is specified, filter in memory on the jsonb array if needed
  if (tag) {
    skills = skills.filter((s) => s.tags && Array.isArray(s.tags) && s.tags.includes(tag));
  }

  return c.json({ skills });
});

// ─── 2. Public Detail: Get Skill by ID or Slug ──────────────────────────────
marketplaceRouter.get('/skills/:idOrSlug', async (c) => {
  const idOrSlug = c.req.param('idOrSlug');

  const [skill] = await db
    .select()
    .from(publicSkills)
    .where(
      or(
        eq(publicSkills.slug, idOrSlug),
        sql`${publicSkills.id}::text = ${idOrSlug}`
      )
    );

  if (!skill) {
    return c.json({ error: 'Skill pack not found' }, 404);
  }

  const rules = await db
    .select()
    .from(publicSkillRules)
    .where(eq(publicSkillRules.skillId, skill.id));

  return c.json({ skill, rules });
});

// ─── 3. Authoring: Publish a New Skill Pack ─────────────────────────────────
marketplaceRouter.post('/skills', cliAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const { name, slug, description, authorName, tags, version, rules } = body;

  if (!name || !description) {
    return c.json({ error: 'Name and description are required' }, 400);
  }

  const skillSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const skillAuthor = authorName || 'Community Author';
  const userId = c.get('userId');

  // Check unique slug
  const existing = await db.select().from(publicSkills).where(eq(publicSkills.slug, skillSlug));
  if (existing.length > 0) {
    return c.json({ error: `A skill with slug "${skillSlug}" already exists.` }, 409);
  }

  const [createdSkill] = await db
    .insert(publicSkills)
    .values({
      name,
      slug: skillSlug,
      description,
      authorId: userId || null,
      authorName: skillAuthor,
      isVerified: false,
      tags: tags || [],
      version: version || '1.0.0',
    })
    .returning();

  // Insert rules if provided
  const insertedRules: any[] = [];
  if (rules && Array.isArray(rules) && rules.length > 0) {
    for (const r of rules) {
      const ruleId = r.id || `${skillSlug}_${r.type || 'rule'}_${Date.now()}`;
      const [newRule] = await db
        .insert(publicSkillRules)
        .values({
          id: ruleId,
          skillId: createdSkill.id,
          type: r.type || 'tech_stack',
          description: r.description || '',
          content: r.content || '',
          goodExamples: r.goodExamples || [],
          badExamples: r.badExamples || [],
        })
        .returning();
      
      insertedRules.push(newRule);

      // Async embed rule content in background for RAG
      embedPublicSkillRule(ruleId, r.content || '').catch((err) =>
        console.error(`[Marketplace] Failed to embed rule ${ruleId}:`, err)
      );
    }
  }

  return c.json({ skill: createdSkill, rules: insertedRules }, 201);
});

// ─── 4. Authoring: Add a Rule to a Skill Pack ────────────────────────────────
marketplaceRouter.post('/skills/:id/rules', cliAuthMiddleware, async (c) => {
  const skillId = c.req.param('id');
  const body = await c.req.json();
  const { id, type, description, content, goodExamples, badExamples } = body;

  if (!id || !content) {
    return c.json({ error: 'id and content are required' }, 400);
  }

  const [rule] = await db
    .insert(publicSkillRules)
    .values({
      id,
      skillId: skillId as any,
      type: type || 'tech_stack',
      description: description || '',
      content,
      goodExamples: goodExamples || [],
      badExamples: badExamples || [],
    })
    .returning();

  // Re-embed in background
  embedPublicSkillRule(id, content).catch((err) =>
    console.error(`[Marketplace] Failed to embed rule ${id}:`, err)
  );

  return c.json({ rule }, 201);
});

// ─── 5. Subscription: Subscribe Project to a Skill Pack ─────────────────────
marketplaceRouter.post('/skills/:id/subscribe', cliAuthMiddleware, async (c) => {
  const skillId = c.req.param('id');
  const body = await c.req.json();
  const { projectId, pinnedVersion, precedenceMode, excludedRuleIds } = body;

  if (!projectId) {
    return c.json({ error: 'projectId is required' }, 400);
  }

  // Verify project exists
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) {
    return c.json({ error: 'Project not found' }, 404);
  }

  // Upsert subscription
  const existingSub = await db
    .select()
    .from(projectSkillSubscriptions)
    .where(
      and(
        eq(projectSkillSubscriptions.projectId, projectId),
        eq(projectSkillSubscriptions.skillId, skillId as any)
      )
    );

  let subscription;
  if (existingSub.length > 0) {
    [subscription] = await db
      .update(projectSkillSubscriptions)
      .set({
        pinnedVersion: pinnedVersion || existingSub[0].pinnedVersion,
        precedenceMode: precedenceMode || existingSub[0].precedenceMode,
        excludedRuleIds: excludedRuleIds ?? existingSub[0].excludedRuleIds,
      })
      .where(eq(projectSkillSubscriptions.id, existingSub[0].id))
      .returning();
  } else {
    [subscription] = await db
      .insert(projectSkillSubscriptions)
      .values({
        projectId,
        skillId: skillId as any,
        pinnedVersion: pinnedVersion || 'latest',
        precedenceMode: precedenceMode || 'private_overrules',
        excludedRuleIds: excludedRuleIds || [],
      })
      .returning();

    // Increment downloads count
    await db
      .update(publicSkills)
      .set({ downloadsCount: sql`${publicSkills.downloadsCount} + 1` })
      .where(eq(publicSkills.id, skillId as any));
  }

  return c.json({ subscription });
});

// ─── 6. Subscription: Unsubscribe Project from a Skill Pack ──────────────────
marketplaceRouter.delete('/projects/:projectId/subscriptions/:skillId', cliAuthMiddleware, async (c) => {
  const projectId = c.req.param('projectId');
  const skillId = c.req.param('skillId');

  await db
    .delete(projectSkillSubscriptions)
    .where(
      and(
        eq(projectSkillSubscriptions.projectId, projectId as any),
        eq(projectSkillSubscriptions.skillId, skillId as any)
      )
    );

  return c.json({ success: true });
});

// ─── 7. Subscription: List Project's Active Subscriptions ───────────────────
marketplaceRouter.get('/projects/:projectId/subscriptions', cliAuthMiddleware, async (c) => {
  const projectId = c.req.param('projectId');

  const subs = await db
    .select({
      subscriptionId: projectSkillSubscriptions.id,
      pinnedVersion: projectSkillSubscriptions.pinnedVersion,
      precedenceMode: projectSkillSubscriptions.precedenceMode,
      excludedRuleIds: projectSkillSubscriptions.excludedRuleIds,
      createdAt: projectSkillSubscriptions.createdAt,
      skill: {
        id: publicSkills.id,
        slug: publicSkills.slug,
        name: publicSkills.name,
        description: publicSkills.description,
        authorName: publicSkills.authorName,
        isVerified: publicSkills.isVerified,
        tags: publicSkills.tags,
        version: publicSkills.version,
      }
    })
    .from(projectSkillSubscriptions)
    .innerJoin(publicSkills, eq(projectSkillSubscriptions.skillId, publicSkills.id))
    .where(eq(projectSkillSubscriptions.projectId, projectId as any));

  return c.json({ subscriptions: subs });
});
