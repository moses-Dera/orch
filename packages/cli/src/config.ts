import { homedir } from 'os';
import { join } from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.orch');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export interface OrchConfig {
  apiKey?: string;
  apiUrl?: string;
}

export async function getConfig(): Promise<OrchConfig> {
  if (!existsSync(CONFIG_FILE)) {
    return { apiUrl: 'http://127.0.0.1:3001' };
  }
  const content = await readFile(CONFIG_FILE, 'utf-8');
  try {
    return JSON.parse(content);
  } catch {
    return { apiUrl: 'http://127.0.0.1:3001' };
  }
}

export async function saveConfig(config: Partial<OrchConfig>) {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
  const current = await getConfig();
  const next = { ...current, ...config };
  await writeFile(CONFIG_FILE, JSON.stringify(next, null, 2), 'utf-8');
}
