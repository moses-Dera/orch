import { expect, test, mock, describe, beforeEach, afterEach } from "bun:test";
import { evaluateDiff } from "../src/ai/evaluator";

// We mock the DB module to prevent actual database calls during tests
mock.module("../src/db", () => {
  return {
    db: {
      select: mock(() => ({
        from: mock(() => ({
          where: mock(() => [
            { isCritic: true, modelId: "mock-critic", apiKey: "mock-key", endpoint: "https://mock.api/chat" },
            { isJudge: true, modelId: "mock-judge", apiKey: "mock-key", endpoint: "https://mock.api/chat" },
            { allocatedTokens: 1000, consumedTokens: 0 } // Mock budget
          ])
        }))
      }))
    }
  };
});

// We also mock the retriever so it doesn't try to query pgvector
mock.module("../src/ai/retriever", () => {
  return {
    retrieveChunks: mock(async () => [
      { chunkText: "Never use raw SQL. Always use Drizzle." }
    ])
  };
});

describe("AI Evaluator (Critic & Judge)", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("True Positive: Critic flags issue, Judge confirms", async () => {
    // Mock fetch to simulate Critic finding an issue, and Judge agreeing
    global.fetch = mock(async (url: any, options: any) => {
      const body = JSON.parse(options.body);
      
      if (body.model === "mock-critic") {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                potential_violations: [
                  { file: "index.ts", line: 10, snippet: "db.query('SELECT *')", rule: "No raw SQL", reason: "Raw SQL used" }
                ]
              })
            }
          }],
          usage: { prompt_tokens: 10, completion_tokens: 10 }
        }));
      }

      if (body.model === "mock-judge") {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                reasoning: "The critic is correct, raw SQL is used.",
                status: "VIOLATION",
                explanation: "Found raw SQL usage.",
                violations: [
                  { file: "index.ts", line: 10, snippet: "db.query('SELECT *')", rule: "No raw SQL", explanation: "Raw SQL is forbidden." }
                ]
              })
            }
          }],
          usage: { prompt_tokens: 20, completion_tokens: 20 }
        }));
      }
      
      throw new Error("Unexpected model called");
    }) as any;

    const result = await evaluateDiff(
      "diff --git a/index.ts b/index.ts\n+ db.query('SELECT *')",
      ["constraint-123"],
      "team-123",
      { title: "Test PR", description: "Testing", repoName: "test-repo" }
    );

    expect(result.status).toBe("VIOLATION");
    expect(result.violations.length).toBe(1);
    expect(result.violations[0].rule).toBe("No raw SQL");
  });

  test("False Positive: Critic flags issue, Judge dismisses", async () => {
    // Mock fetch: Critic flags, but Judge says it's CLEAN
    global.fetch = mock(async (url: any, options: any) => {
      const body = JSON.parse(options.body);
      
      if (body.model === "mock-critic") {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                potential_violations: [
                  { file: "index.ts", line: 10, snippet: "const sql = 'hello';", rule: "No raw SQL", reason: "Variable named sql" }
                ]
              })
            }
          }]
        }));
      }

      if (body.model === "mock-judge") {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                reasoning: "The critic is wrong, it is just a string variable named sql.",
                status: "CLEAN",
                explanation: "No real violations.",
                violations: []
              })
            }
          }]
        }));
      }
      
      throw new Error("Unexpected model called");
    }) as any;

    const result = await evaluateDiff(
      "diff --git a/index.ts b/index.ts\n+ const sql = 'hello';",
      ["constraint-123"],
      "team-123",
      { title: "Test PR", description: "Testing", repoName: "test-repo" }
    );

    expect(result.status).toBe("CLEAN");
    expect(result.violations.length).toBe(0);
  });

  test("Early Exit: Critic finds no issues", async () => {
    // Mock fetch: Critic finds nothing
    global.fetch = mock(async (url: any, options: any) => {
      const body = JSON.parse(options.body);
      
      if (body.model === "mock-critic") {
        return new Response(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                potential_violations: []
              })
            }
          }]
        }));
      }

      throw new Error("Judge should not be called if Critic finds no issues");
    }) as any;

    const result = await evaluateDiff(
      "diff --git a/index.ts b/index.ts\n+ console.log('hello');",
      ["constraint-123"],
      "team-123",
      { title: "Test PR", description: "Testing", repoName: "test-repo" }
    );

    expect(result.status).toBe("CLEAN");
    expect(result.violations.length).toBe(0);
    expect(result.reasoning).toContain("zero potential violations");
  });
});
