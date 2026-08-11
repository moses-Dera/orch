#!/usr/bin/env bun
import { cac } from 'cac';
import { saveConfig } from './config';
import { syncConstraints } from './sync';
import { runMcpServer } from './mcp';

const cli = cac('orch');

cli
  .command('login <api_key>', 'Login to Orch using your API key')
  .action(async (apiKey: string) => {
    await saveConfig({ apiKey });
    console.log('✅ Successfully logged in to Orch.');
  });

cli
  .command('sync', 'Sync constraints and write local .cursorrules')
  .action(async () => {
    await syncConstraints();
  });

cli
  .command('mcp', 'Start the Orch MCP Server (stdio transport)')
  .action(async () => {
    await runMcpServer();
  });

cli.help();
cli.version('1.0.0');

cli.parse();
