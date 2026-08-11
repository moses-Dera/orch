import * as vscode from 'vscode';
import { initConfig, setApiKey, setApiUrl, getApiUrl } from './config';
import { initStatusBar, refresh as refreshStatusBar } from './statusBar';
import { autoConfig } from './autoConfig';
import { initDiagnostics, auditActiveFile, clearDiagnostics } from './diagnostics';
import { syncConstraints } from './sync';

class OrchUriHandler implements vscode.UriHandler {
    async handleUri(uri: vscode.Uri): Promise<void> {
        if (uri.path === '/auth') {
            // Note: VS Code provides URLSearchParams globally
            const query = new URLSearchParams(uri.query);
            const token = query.get('token');
            if (token) {
                await setApiKey(token);
                vscode.window.showInformationMessage('Orch: Logged in successfully ✓');
                refreshStatusBar();
                
                // Sync constraints automatically after login
                await syncConstraints();
            }
        }
    }
}

export function activate(context: vscode.ExtensionContext) {
    initConfig(context);
    initStatusBar(context);
    initDiagnostics(context);

    // Register URI Handler for OAuth
    context.subscriptions.push(
        vscode.window.registerUriHandler(new OrchUriHandler())
    );

    // Auto-configure silently on activation
    autoConfig(context);
    
    // Background sync on startup
    syncConstraints();

    context.subscriptions.push(

        // Right-click → Audit This File — shows findings as inline diagnostics
        vscode.commands.registerCommand('orch.auditFile', () => {
            auditActiveFile();
        }),

        // Clear diagnostics for active file
        vscode.commands.registerCommand('orch.clearDiagnostics', () => {
            const uri = vscode.window.activeTextEditor?.document.uri;
            clearDiagnostics(uri);
        }),

        // Manual configure — enter API key and URL
        vscode.commands.registerCommand('orch.login', async () => {
            const url = getApiUrl();
            // In a real OAuth flow, this opens the dashboard. For now we open it with a callback URI.
            // The extension URI format is: vscode://<publisher>.<extensionName>/auth
            const callbackUri = `${vscode.env.uriScheme}://orch-dev.orch/auth`;
            
            vscode.window.showInformationMessage('Opening browser to authenticate with Orch...');
            
            // For MVP, we'll just redirect to the settings page where they can see their API key,
            // or the dashboard can redirect back. Let's just point to settings for now with the callback.
            // When building the frontend, the dashboard would handle this redirect.
            vscode.env.openExternal(vscode.Uri.parse(`http://localhost:3000/settings?callback=${encodeURIComponent(callbackUri)}`));
        }),

        // Re-run auto-config (useful after connecting GitHub App)
        vscode.commands.registerCommand('orch.autoDetect', () => {
            autoConfig(context);
        }),

        // Clear saved config
        vscode.commands.registerCommand('orch.signOut', async () => {
            const { deleteApiKey } = await import('./config');
            await deleteApiKey();
            clearDiagnostics();
            refreshStatusBar();
            vscode.window.showInformationMessage('Orch: Signed out.');
        }),

        // Re-run auto-config when workspace folders change
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            autoConfig(context);
        }),

        // Clear diagnostics when a file is closed
        vscode.workspace.onDidCloseTextDocument((doc) => {
            clearDiagnostics(doc.uri);
        })
    );
}

export function deactivate() {}
