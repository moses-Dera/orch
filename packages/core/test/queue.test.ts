import { expect, test, mock, describe } from "bun:test";
import { enqueueJob, completeJob, failJob, getJob } from "../src/services/queue";

// Mock DB
const mockJob = {
  id: "job-123",
  teamId: "team-abc",
  type: "chat_research",
  status: "queued",
  payload: { query: "What is the capital of France?" },
  result: null,
  error: null,
  attempts: 0,
  maxAttempts: 3,
  createdAt: new Date(),
  updatedAt: new Date(),
};

mock.module("../src/db", () => {
  return {
    db: {
      insert: mock(() => ({
        values: mock(() => ({
          returning: mock(async () => [mockJob]),
        })),
      })),
      update: mock(() => ({
        set: mock((updates: any) => ({
          where: mock(() => ({
            returning: mock(async () => [{ ...mockJob, ...updates }]),
          })),
        })),
      })),
      select: mock(() => ({
        from: mock(() => ({
          where: mock(async () => [{ ...mockJob, attempts: 1, maxAttempts: 3 }]),
        })),
      })),
    },
  };
});

describe("PostgreSQL Job Queue Service", () => {
  test("enqueueJob inserts a job with queued status", async () => {
    const job = await enqueueJob("team-abc", "chat_research", { query: "test" });
    expect(job).toBeDefined();
    expect(job.id).toBe("job-123");
    expect(job.status).toBe("queued");
  });

  test("completeJob sets status to completed and saves result", async () => {
    const completed = await completeJob("job-123", { answer: "Paris" });
    expect(completed).toBeDefined();
    expect(completed.status).toBe("completed");
    expect(completed.result).toEqual({ answer: "Paris" });
  });

  test("failJob requeues when attempts < maxAttempts", async () => {
    const retried = await failJob("job-123", "Rate limit 429");
    expect(retried).toBeDefined();
    expect(retried.status).toBe("queued");
    expect(retried.error).toBe("Rate limit 429");
  });
});
