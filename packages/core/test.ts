import { db } from './src/db/index.js';
import { apiKeys } from './src/db/schema.js';
const res = await db.select().from(apiKeys).limit(1);
console.log(res);
process.exit(0);
