/**
 * Shared Hono context variable types for all routers.
 * These are set by auth middlewares and consumed by route handlers.
 */
export type AppVariables = {
  teamId: string;
  userId?: string;
  isTrial: boolean;
  llmApiKey: string | null;
  llmEndpoint: string;
  llmModel: string;
};
