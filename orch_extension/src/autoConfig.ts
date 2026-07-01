import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { setApiKey, setApiUrl, getApiKey, getApiUrl, isConfigured } from './config';
import { refresh as refreshStatusBar } from './statusBar';

/**
 * Gets the git remote URL for the current workspace.
 * Tries 'origin' first, falls back to first available remote.
 */
function getGitRemote(workspaceRoot: string): Promise<string | null> {
    return new Promise((resolve) => {
        cp.exec('git remote get-url origin', { cwd: workspaceRoot }, (err, stdout) => {
            if (!err && stdout.trim()) {
                resolve(stdout.trim());
                return;
            }
            // fallback — list all remotes and take first
            cp.exec('git remote -v', { cwd: workspaceRoot }, (err2, out2) => {
                if (err2 || !out2.trim()) { resolve(null); return; }
                const match = out2.match(/\S+\s+(\S+)\s+\(fetch\)/);
                resolve(match ? match[1] : null);
            });
        });
    });
}

/**
 * Reads .orch/config from the workspace root if it exists.
 * Format: JSON with apiKey and apiUrl fields.
 */
function readLocalConfig(workspaceRoot: string): { apiKey?: string; apiUrl?: string } | null {
    const configPath = path.join(workspaceRoot, '.orch', 'config');
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch {}
    return null;
}

/**
 * Calls orch_core resolve-repo endpoint to find the right API key for this repo.
 */
async function resolveRepo(repoUrl: string, apiUrl: string): Promise<{ matched: boolean; api_key?: string; org_name?: string } | null> {
    try {
        const url = `${apiUrl}/api/v1/onboarding/resolve-repo?repo_url=${encodeURIComponent(repoUrl)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        return await res.json() as any;
    } catch {
        return null;
    }
}

/**
 * Main auto-config flow. Called on extension activation.
 *
 * Priority:
 * 1. Already configured (key in secrets) — done, just refresh status bar
 * 2. .orch/config in workspace root — read key from there, store in secrets
 * 3. Git remote → resolve-repo → auto-configure silently
 * 4. Nothing found — show one-time prompt to configure
 */
export async function autoConfig(context: vscode.ExtensionContext): Promise<void> {
    // Already configured — nothing to do
    if (await isConfigured()) {
        refreshStatusBar();
        return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) return;

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const apiUrl = getApiUrl();

    // Check for local .orch/config first
    const localConfig = readLocalConfig(workspaceRoot);
    if (localConfig?.apiKey) {
        await setApiKey(localConfig.apiKey);
        if (localConfig.apiUrl) await setApiUrl(localConfig.apiUrl);
        refreshStatusBar();
        return;
    }

    // Try git remote resolution
    const remoteUrl = await getGitRemote(workspaceRoot);
    if (remoteUrl) {
        const result = await resolveRepo(remoteUrl, apiUrl);
        if (result?.matched && result.api_key) {
            await setApiKey(result.api_key);
            refreshStatusBar();
            // Silent — developer never sees this happen
            return;
        }
    }

    // Nothing found — show one-time prompt (not on every activation)
    const dismissed = context.globalState.get<boolean>('orch.configPromptDismissed');
    if (!dismissed) {
        const choice = await vscode.window.showInformationMessage(
            'Orch: No configuration found for this project.',
            'Enter API Key',
            'Dismiss'
        );
        if (choice === 'Enter API Key') {
            vscode.commands.executeCommand('orch.configure');
        } else if (choice === 'Dismiss') {
            await context.globalState.update('orch.configPromptDismissed', true);
        }
    }
}
