import * as vscode from 'vscode';
import { getApiKey, getApiUrl } from './config';
import { refresh as refreshStatusBar } from './statusBar';

export async function syncConstraints(): Promise<void> {
    const apiKey = await getApiKey();
    if (!apiKey) {
        return; // Silently fail if not logged in
    }

    const apiUrl = getApiUrl();
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return;
    }

    try {
        const res = await fetch(`${apiUrl}/api/orch/v1/sync`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!res.ok) {
            console.error('Orch: Failed to sync constraints', res.statusText);
            return;
        }

        const data = await res.json() as { constraints: { content: string, type: string }[] };
        const cursorRulesContent = data.constraints
            // .filter(c => c.type === 'cursorrules' || !c.type) // In case we add types later
            .map(c => c.content)
            .join('\n\n');

        if (!cursorRulesContent) return;

        // Write to all workspace folders
        for (const folder of workspaceFolders) {
            const rulesUri = vscode.Uri.joinPath(folder.uri, '.cursorrules');
            
            // Add a header so they know it's auto-generated
            const fileContent = `# 🔒 Managed by Orch (Do not edit directly)\n\n${cursorRulesContent}`;
            const writeData = Buffer.from(fileContent, 'utf8');
            
            await vscode.workspace.fs.writeFile(rulesUri, writeData);
        }

        refreshStatusBar();
        vscode.window.setStatusBarMessage('Orch: Sync Complete', 3000);
        
    } catch (err) {
        console.error('Orch: Error during sync', err);
    }
}
