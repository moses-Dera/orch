import { hc } from 'hono/client';
// Importing the AppType directly from the core workspace package
import type { AppType } from '../../../packages/core/src/index';

// Target the Bun server running on port 3001
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Instantiate the Hono RPC Client for type-safe data fetching
export const rpc = hc<AppType>(API_URL);
