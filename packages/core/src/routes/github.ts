import { Hono } from 'hono';
import { App } from 'octokit';
import parseDiff from 'parse-diff';
import { db } from '../db';
import { constraints, teams, projects, githubEvaluations, teamGithubInstallations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { evaluateDiff, EvaluationViolation } from '../ai/evaluator';

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

export function resolveValidComments(diff: string, violations: EvaluationViolation[]) {
  const parsed = parseDiff(diff);
  const validComments: any[] = [];
  let generalSummary = '';

  for (const v of violations) {
    const fileDiff = parsed.find(f => f.to === v.file || f.from === v.file);
    if (!fileDiff) {
       generalSummary += `- **${v.file}**: ${v.rule}\n  ${v.explanation}\n\n`;
       continue;
    }

    let lineFound = false;
    let actualLine = v.line;

    // Check if exact line is in the diff
    for (const chunk of fileDiff.chunks) {
      const lineMatch = chunk.changes.find((c: any) => (c.type === 'add' && c.ln === actualLine) || (c.type === 'normal' && c.ln2 === actualLine));
      if (lineMatch) {
         lineFound = true;
         break;
      }
    }

    // Fallback: Fuzzy search by snippet
    if (!lineFound && v.snippet) {
      for (const chunk of fileDiff.chunks) {
        const snippetMatch = chunk.changes.find(c => (c.type === 'add' || c.type === 'normal') && c.content.includes(v.snippet.trim()));
        if (snippetMatch) {
           lineFound = true;
           actualLine = snippetMatch.type === 'add' ? (snippetMatch as any).ln : (snippetMatch as any).ln2;
           break;
        }
      }
    }

    if (lineFound) {
      validComments.push({
        path: v.file,
        line: actualLine,
        body: `**Violates Constraint:** ${v.rule}\n\n${v.explanation}`
      });
    } else {
      generalSummary += `- **${v.file} (Line ${v.line})**: ${v.rule}\n  ${v.explanation}\n\n`;
    }
  }

  return { validComments, generalSummary };
}

async function handlePullRequest(octokit: any, payload: any, action: string) {
  const { data: diff } = await octokit.rest.pulls.get({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    pull_number: payload.pull_request.number,
    mediaType: { format: 'diff' },
  });

  const installationId = String(payload.installation?.id);
  const repoFullName = payload.repository.full_name;
  
  const [installation] = await db.select().from(teamGithubInstallations).where(eq(teamGithubInstallations.installationId, installationId));
  if (!installation) return;
  
  const teamId = installation.teamId;

  const [project] = await db.select().from(projects).where(
    and(eq(projects.teamId, teamId), eq(projects.githubRepoFullName, repoFullName))
  );

  if (!project) return;
  
  const teamConstraints = await db.select().from(constraints).where(eq(constraints.projectId, project.id));
  const constraintIds = teamConstraints.map((c) => c.id);
  const fallbackRules = teamConstraints.map((c) => `[${c.id}] ${c.description}\n${c.content}`).join('\n\n');

  const context = {
    title: payload.pull_request.title,
    description: payload.pull_request.body || '',
    repoName: payload.repository.full_name
  };
  
  const result = await evaluateDiff(String(diff), constraintIds, teamId, context, fallbackRules);

  await db.insert(githubEvaluations).values({
    projectId: project.id,
    pullRequestNumber: payload.pull_request.number,
    status: result.status,
  });

  const { validComments, generalSummary } = resolveValidComments(String(diff), result.violations || []);
  
  let bodyText = `### Orch Constraint Evaluation 🛡️\n\n**Status:** ${result.status === 'CLEAN' ? '✅ Pass' : '❌ Violations Detected'}\n\n${result.explanation}`;
  if (generalSummary) {
    bodyText += `\n\n### General Architecture Violations:\n${generalSummary}`;
  }

  try {
    await octokit.rest.pulls.createReview({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: payload.pull_request.number,
      body: bodyText,
      event: result.status === 'CLEAN' ? 'APPROVE' : 'REQUEST_CHANGES',
      comments: validComments.length > 0 ? validComments : undefined
    });
  } catch (error: any) {
    console.error('Failed to post inline comments, falling back to general review.', error.message);
    
    // Graceful fallback if GitHub 422s the inline comments for any reason
    const fullSummary = result.violations?.map(v => `- **${v.file} (Line ${v.line})**: ${v.rule}\n  ${v.explanation}`).join('\n\n') || '';
    const fallbackBody = `### Orch Constraint Evaluation 🛡️\n\n**Status:** ${result.status === 'CLEAN' ? '✅ Pass' : '❌ Violations Detected'}\n\n${result.explanation}\n\n### Violations:\n${fullSummary}`;

    await octokit.rest.pulls.createReview({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: payload.pull_request.number,
      body: fallbackBody,
      event: result.status === 'CLEAN' ? 'APPROVE' : 'REQUEST_CHANGES'
    });
  }
}

githubApp.webhooks.on('pull_request.opened', async ({ octokit, payload }) => {
  console.log(`Received PR opened event for ${payload.repository.full_name}#${payload.pull_request.number}`);
  await handlePullRequest(octokit, payload, 'opened');
});

githubApp.webhooks.on('pull_request.synchronize', async ({ octokit, payload }) => {
  console.log(`Re-evaluating PR ${payload.pull_request.number} after new commits`);
  await handlePullRequest(octokit, payload, 'synchronize');
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
