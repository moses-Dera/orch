import { db } from '../db';
import { models, tokenBudgets } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { redactSecrets } from './dlp';

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

let openRouterModelsCache: any[] | null = null;
let lastCacheTime = 0;

async function getCheapestModel(isTrial: boolean, configuredModelId?: string): Promise<string> {
  const defaultStrongModel = process.env.DEFAULT_STRONG_MODEL || 'openai/gpt-4o';
  
  if (!isTrial) {
    return configuredModelId || defaultStrongModel;
  }

  // Only refresh cache every 1 hour
  if (!openRouterModelsCache || Date.now() - lastCacheTime > 3600 * 1000) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/models');
      const data = await res.json();
      openRouterModelsCache = data.data;
      lastCacheTime = Date.now();
    } catch (e) {
      return 'openai/gpt-4o-mini';
    }
  }

  // Filter for trusted families (OpenAI, Anthropic, Google) to ensure stability, then sort by price
  const trustedPrefixes = ['openai/', 'anthropic/', 'google/'];
  const trustedModels = openRouterModelsCache!.filter(m => 
    trustedPrefixes.some(prefix => m.id.startsWith(prefix))
  );

  trustedModels.sort((a, b) => {
    const priceA = parseFloat(a.pricing?.prompt || '0') + parseFloat(a.pricing?.completion || '0');
    const priceB = parseFloat(b.pricing?.prompt || '0') + parseFloat(b.pricing?.completion || '0');
    return priceA - priceB;
  });

  return trustedModels[0]?.id || 'openai/gpt-4o-mini';
}

async function determineOptimalModel(diff: string, configuredModelId: string | undefined, isTrial: boolean): Promise<string> {
  const diffLength = diff.length;
  const defaultStrongModel = process.env.DEFAULT_STRONG_MODEL || 'openai/gpt-4o';

  // 1. Massive PR
  if (diffLength > 20000) {
    return isTrial ? await getCheapestModel(isTrial, configuredModelId) : (configuredModelId || defaultStrongModel);
  }

  // 2. Trivial PR
  if (diffLength < 500) {
    return await getCheapestModel(isTrial, configuredModelId);
  }

  // 3. Standard PR
  return configuredModelId || defaultStrongModel;
}

export async function evaluateDiff(
  diff: string, 
  rules: string, 
  teamId: string, 
  context: { title: string; description: string; repoName: string }
): Promise<EvaluationResult> {
  // Fetch configured model and budget for the team
  const [configuredModel] = await db.select().from(models).where(eq(models.teamId, teamId));
  const [budget] = await db.select().from(tokenBudgets).where(eq(tokenBudgets.teamId, teamId));

  let apiKey = configuredModel?.apiKey;
  const isTrial = !apiKey && budget && budget.consumedTokens < budget.allocatedTokens;

  if (!apiKey) {
    if (isTrial) {
      // Fallback to global key for testing
      apiKey = process.env.OPENROUTER_API_KEY;
    } else {
      // Trial exhausted and no key provided
      return {
        reasoning: "The testing trial budget is exhausted and no custom API key was found.",
        status: 'VIOLATION',
        violations: [{ 
          file: "N/A", line: 1, rule: "Billing", 
          explanation: "Testing budget exhausted. Please add your own OpenAI/Anthropic API key in the Orch dashboard to continue reviewing code." 
        }],
        explanation: 'API Key required. Trial exhausted.'
      };
    }
  }

  // Apply Data Loss Prevention (DLP)
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

  // Run the Cost Router
  const modelId = await determineOptimalModel(safeDiff, configuredModel?.modelId, isTrial);
  const endpoint = configuredModel?.endpoint || 'https://openrouter.ai/api/v1/chat/completions';

  const systemPrompt = `
You are Orch, an expert Senior Staff Engineer reviewing a Pull Request.

# CONTEXT
Repository: ${context.repoName}
PR Title: ${safeTitle}
PR Description: ${safeDescription}


# CONSTRAINTS TO ENFORCE
${rules}

# INSTRUCTIONS
You must analyze the provided code diff against the constraints.
You must use a Structured Chain-of-Thought approach. First, write out your reasoning, explicitly debating if a piece of code violates a rule, or if it is a false positive. 
Only output violations if you are highly confident.

Return ONLY valid JSON matching this exact schema:
{
  "reasoning": "Step-by-step analysis of each constraint against the diff. Think carefully about false positives.",
  "status": "CLEAN" | "VIOLATION",
  "explanation": "A high-level summary of your review.",
  "violations": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "rule": "Name of the violated rule",
      "explanation": "Why this specific line violates the rule."
    }
  ]
}
If status is CLEAN, the violations array must be empty [].
  `;

  try {
    const aiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Diff:\n${safeDiff}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const aiData = await aiResponse.json();
    const resultJson: EvaluationResult = JSON.parse(aiData.choices[0].message.content);

    // Track Input and Output tokens accurately (Works for OpenAI, OpenRouter, DeepSeek, Ollama)
    const inputTokens = aiData.usage?.prompt_tokens || 0;
    const outputTokens = aiData.usage?.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;

    // If using the trial key, deduct tokens from their budget
    if (isTrial && apiKey === process.env.OPENROUTER_API_KEY) {
      await db.update(tokenBudgets)
        .set({ consumedTokens: sql`${tokenBudgets.consumedTokens} + ${totalTokens}` })
        .where(eq(tokenBudgets.teamId, teamId));
    }

    // Default ensure empty array if CLEAN
    if (resultJson.status === 'CLEAN' && !resultJson.violations) {
      resultJson.violations = [];
    }

    return resultJson;
  } catch (error: any) {
    console.error('AI Review Error:', error);
    return { 
      reasoning: "Execution error.", 
      status: 'VIOLATION', 
      explanation: 'AI Review failed to execute.', 
      violations: [] 
    };
  }
}
