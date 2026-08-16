import { Hono } from 'hono';
import { App } from 'octokit';
import { db } from '../db';
import { constraints, teams, projects, githubEvaluations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { evaluateDiff } from '../ai/evaluator';

export const githubRouter = new Hono();

// Initialize GitHub App (in a real app, these come from ENV)
const appId = process.env.GITHUB_APP_ID || "123456";
const privateKey = process.env.GITHUB_PRIVATE_KEY || "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----";
const secret = process.env.GITHUB_WEBHOOK_SECRET || "development_secret";

export const githubApp = new App({
  appId,
  privateKey,
  webhooks: {
    secret,
  },
});

githubApp.webhooks.on('pull_request.opened', async ({ octokit, payload }) => {
  console.log(`Received PR opened event for ${payload.repository.full_name}#${payload.pull_request.number}`);
  
  // 1. Fetch the PR diff
  const { data: diff } = await octokit.rest.pulls.get({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: payload.pull_request.number,
    mediaType: { format: 'diff' },
  });

  // 2. Fetch all constraints based on installation ID and repo name
  const installationId = String(payload.installation?.id);
  const repoFullName = payload.repository.full_name;
  
  const [team] = await db.select().from(teams).where(eq(teams.githubInstallationId, installationId));
  
  if (!team) {
    console.log(`No team found for installation ID ${installationId}`);
    return;
  }

  const [project] = await db.select().from(projects).where(
    and(
      eq(projects.teamId, team.id),
      eq(projects.githubRepoFullName, repoFullName)
    )
  );

  if (!project) {
    console.log(`No project found for repo ${repoFullName} under team ${team.id}`);
    return;
  }
  
  const teamConstraints = await db.select().from(constraints).where(eq(constraints.projectId, project.id));
  
  const constraintIds = teamConstraints.map((c) => c.id);
  const fallbackRules = teamConstraints.map((c) => `[${c.id}] ${c.description}\n${c.content}`).join('\n\n');

  // 3. Evaluate the diff using our AI engine
  const context = {
    title: payload.pull_request.title,
    description: payload.pull_request.body || '',
    repoName: payload.repository.full_name
  };
  
  const result = await evaluateDiff(String(diff), constraintIds, team.id, context, fallbackRules);

  // 4. Log the evaluation
  await db.insert(githubEvaluations).values({
    projectId: project.id,
    pullRequestNumber: payload.pull_request.number,
    status: result.status,
  });

  // 5. Post the review back to GitHub with inline comments
  const reviewComments = result.violations?.map(v => ({
    path: v.file,
    line: v.line,
    body: `**Violates Constraint:** ${v.rule}\n\n${v.explanation}`
  })) || [];

  await octokit.rest.pulls.createReview({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: payload.pull_request.number,
    body: `### Orch Constraint Evaluation 🛡️\n\n**Status:** ${result.status === 'CLEAN' ? '✅ Pass' : '❌ Violations Detected'}\n\n${result.explanation}`,
    event: result.status === 'CLEAN' ? 'APPROVE' : 'REQUEST_CHANGES',
    comments: reviewComments.length > 0 ? reviewComments : undefined
  });
});

githubApp.webhooks.on('pull_request.synchronize', async ({ octokit, payload }) => {
  // Re-evaluate when new commits are pushed
  console.log(`Re-evaluating PR ${payload.pull_request.number}`);
});

// The Hono route that receives the webhook payload from GitHub
githubRouter.post('/webhook', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  const id = c.req.header('x-github-delivery');
  const name = c.req.header('x-github-event') as any;
  const payload = await c.req.text();

  try {
    await githubApp.webhooks.verifyAndReceive({
      id: id || '',
      name,
      payload,
      signature: signature || '',
    });
    return c.text('ok');
  } catch (error: any) {
    console.error('Webhook verification failed', error.message);
    return c.text('Verification failed', 400);
  }
});
