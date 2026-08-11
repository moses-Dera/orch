import { db } from '../db';
import { models, tokenBudgets } from '../db/schema';
import { eq, sql, inArray } from 'drizzle-orm';
import { redactSecrets } from './dlp';
import { retrieveChunks } from './retriever';

export interface EvaluationViolation {
  file: string;
  line: number;
  rule: string;
  explanation: string;
}

export interface EvaluationResult {
  reasoning: string;
  status: 'CLEAN' | 'VIOLATION';
  violations: EvaluationViolation[];
  explanation: string; // overarching explanation
}

const DEFAULT_CHEAP_MODEL = process.env.DEFAULT_CHEAP_MODEL || 'openai/gpt-4o-mini';
const DEFAULT_STRONG_MODEL = process.env.DEFAULT_STRONG_MODEL || 'openai/gpt-4o';

export async function evaluateDiff(
  diff: string,
  constraintIds: string[], // IDs of the team's constraints — used for RAG retrieval
  teamId: string,
  context: { title: string; description: string; repoName: string },
  fallbackRules?: string,  // Pre-joined rules string used if RAG is unavailable
): Promise<EvaluationResult> {
  // Fetch configured models and budget for the team
  const teamModels = await db.select().from(models).where(eq(models.teamId, teamId));
  const [budget] = await db.select().from(tokenBudgets).where(eq(tokenBudgets.teamId, teamId));

  const criticModel = teamModels.find(m => m.isCritic) || teamModels[0];
  const judgeModel = teamModels.find(m => m.isJudge) || teamModels[0];

  let apiKey = criticModel?.apiKey || judgeModel?.apiKey;
  const isTrial = !apiKey && budget && budget.consumedTokens < budget.allocatedTokens;

  if (!apiKey) {
    if (isTrial) {
      // Fallback to global key for testing
      apiKey = process.env.OPENROUTER_API_KEY || null;
    } else {
      // Trial exhausted and no key provided
      return {
        reasoning: "The testing trial budget is exhausted and no custom API key was found.",
        status: 'VIOLATION',
        violations: [{ 
          file: "N/A", line: 1, rule: "Billing", 
          explanation: "Testing budget exhausted. Please add your own API key in the Orch dashboard to continue reviewing code." 
        }],
        explanation: 'API Key required. Trial exhausted.'
      };
    }
  }

  const safeTitle = redactSecrets(context.title);
  const safeDescription = redactSecrets(context.description);
  const safeDiff = redactSecrets(diff);

  // Reject massive PRs immediately before hitting the AI
  if (safeDiff.length > 50000) {
    return {
      reasoning: "The Pull Request diff is too large (>50k chars).",
      status: 'VIOLATION',
      violations: [{ 
        file: "N/A", line: 1, rule: "PR Size Limit", 
        explanation: "This PR is too massive to safely evaluate using AI. Please break it into smaller PRs." 
      }],
      explanation: 'PR exceeds token limits and was blocked.'
    };
  }

  // RAG: Retrieve only the constraint chunks relevant to this diff
  let rules: string;
  if (constraintIds.length > 0) {
    try {
      const chunks = await retrieveChunks(safeDiff, constraintIds);
      if (chunks.length > 0) {
        rules = chunks.map((chunk) => `- ${chunk}`).join('\n');
      } else {
        rules = fallbackRules ?? '';
      }
      
      // Inject Few-Shot Examples from active constraints
      const { constraints } = await import('../db/schema');
      const activeConstraints = await db.select({
        goodExamples: constraints.goodExamples,
        badExamples: constraints.badExamples
      }).from(constraints).where(inArray(constraints.id, constraintIds));

      let goodExamplesList: string[] = [];
      let badExamplesList: string[] = [];

      for (const c of activeConstraints) {
        if (c.goodExamples && Array.isArray(c.goodExamples)) {
          goodExamplesList.push(...c.goodExamples);
        }
        if (c.badExamples && Array.isArray(c.badExamples)) {
          badExamplesList.push(...c.badExamples);
        }
      }

      if (goodExamplesList.length > 0 || badExamplesList.length > 0) {
        rules += '\n\n# EXAMPLES OF VIOLATIONS AND CLEAN CODE\n';
        if (badExamplesList.length > 0) {
          rules += '## BAD EXAMPLES (Violations)\n' + badExamplesList.map(e => `\`\`\`\n${e}\n\`\`\``).join('\n\n') + '\n';
        }
        if (goodExamplesList.length > 0) {
          rules += '## GOOD EXAMPLES (Clean)\n' + goodExamplesList.map(e => `\`\`\`\n${e}\n\`\`\``).join('\n\n') + '\n';
        }
      }
    } catch {
      rules = fallbackRules ?? '';
    }
  } else {
    rules = fallbackRules ?? '';
  }

  const endpoint = criticModel?.endpoint || judgeModel?.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // ==========================================
  // PHASE 1: THE CRITIC (Fast & Cheap)
  // ==========================================
  const criticPrompt = `
You are Orch, a highly vigilant junior code reviewer.
Your ONLY job is to flag anything in the diff that MIGHT violate the constraints.
Err on the side of flagging too much (false positives are acceptable at this stage).

# CONTEXT
Repository: ${context.repoName}
PR Title: ${safeTitle}
PR Description: ${safeDescription}

# CONSTRAINTS TO ENFORCE
${rules}

# INSTRUCTIONS
Analyze the diff and return a JSON list of potential violations.
Return ONLY valid JSON matching this exact schema:
{
  "potential_violations": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "rule": "Name of the constraint",
      "reason": "Why this might be a violation."
    }
  ]
}
If there are absolutely no potential violations, return an empty array for potential_violations.
  `;

  let criticData: any;
  try {
    const criticResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: criticModel?.modelId || DEFAULT_CHEAP_MODEL,
        messages: [
          { role: 'system', content: criticPrompt },
          { role: 'user', content: `Diff:\n${safeDiff}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    criticData = await criticResponse.json();
    totalInputTokens += criticData.usage?.prompt_tokens || 0;
    totalOutputTokens += criticData.usage?.completion_tokens || 0;
  } catch (error: any) {
    console.error('Critic Phase Error:', error);
    return { reasoning: "Critic phase execution error.", status: 'VIOLATION', explanation: 'AI Review failed during Critic phase.', violations: [] };
  }

  const criticResult = JSON.parse(criticData.choices[0].message.content);

  // EARLY EXIT: If the critic found nothing, we are done!
  if (!criticResult.potential_violations || criticResult.potential_violations.length === 0) {
    if (isTrial && apiKey === process.env.OPENROUTER_API_KEY) {
      await db.update(tokenBudgets)
        .set({ consumedTokens: sql`${tokenBudgets.consumedTokens} + ${totalInputTokens + totalOutputTokens}` })
        .where(eq(tokenBudgets.teamId, teamId));
    }
    return {
      reasoning: "The Critic reviewed the diff and found zero potential violations. Early exit triggered.",
      status: 'CLEAN',
      explanation: "No violations detected.",
      violations: []
    };
  }

  // ==========================================
  // PHASE 2: THE JUDGE (Slow & Smart)
  // ==========================================
  const judgeModelId = judgeModel?.modelId || DEFAULT_STRONG_MODEL;
  const judgePrompt = `
You are Orch, an expert Senior Staff Engineer.
A junior reviewer (The Critic) has flagged potential violations in the following Pull Request.
Your job is to review their claims against the original constraints and weed out FALSE POSITIVES.

# CONTEXT
Repository: ${context.repoName}
PR Title: ${safeTitle}
PR Description: ${safeDescription}

# CONSTRAINTS TO ENFORCE
${rules}

# THE CRITIC'S CLAIMS
${JSON.stringify(criticResult.potential_violations, null, 2)}

# INSTRUCTIONS
Evaluate the Critic's claims. Are they accurate? Or did the Critic misunderstand the context of the code?
Use a Structured Chain-of-Thought approach in your 'reasoning' field to debate each claim.
Only output violations if you are highly confident they are true violations.

Return ONLY valid JSON matching this exact schema:
{
  "reasoning": "Step-by-step evaluation of the Critic's claims.",
  "status": "CLEAN" | "VIOLATION",
  "explanation": "A high-level summary of your final ruling.",
  "violations": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "rule": "Name of the violated rule",
      "explanation": "Why this specific line violates the rule."
    }
  ]
}
If you dismiss all of the Critic's claims, return status CLEAN and an empty violations array [].
  `;

  try {
    const judgeResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: judgeModelId,
        messages: [
          { role: 'system', content: judgePrompt },
          { role: 'user', content: `Diff:\n${safeDiff}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const judgeData: any = await judgeResponse.json();
    totalInputTokens += judgeData.usage?.prompt_tokens || 0;
    totalOutputTokens += judgeData.usage?.completion_tokens || 0;

    const resultJson: EvaluationResult = JSON.parse(judgeData.choices[0].message.content);

    // Track Input and Output tokens accurately for both phases combined
    if (isTrial && apiKey === process.env.OPENROUTER_API_KEY) {
      await db.update(tokenBudgets)
        .set({ consumedTokens: sql`${tokenBudgets.consumedTokens} + ${totalInputTokens + totalOutputTokens}` })
        .where(eq(tokenBudgets.teamId, teamId));
    }

    // Default ensure empty array if CLEAN
    if (resultJson.status === 'CLEAN' && !resultJson.violations) {
      resultJson.violations = [];
    }

    return resultJson;
  } catch (error: any) {
    console.error('Judge Phase Error:', error);
    return { reasoning: "Judge phase execution error.", status: 'VIOLATION', explanation: 'AI Review failed during Judge phase.', violations: [] };
  }
}
