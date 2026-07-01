import * as vscode from 'vscode';
import { initConfig, setApiKey, setApiUrl, getApiUrl } from './config';
import { initStatusBar, refresh as refreshStatusBar } from './statusBar';
import { autoConfig } from './autoConfig';
import { initDiagnostics, auditActiveFile, clearDiagnostics } from './diagnostics';

export function activate(context: vscode.ExtensionContext) {
    initConfig(context);
    initStatusBar(context);
    initDiagnostics(context);

    // Auto-configure silently on activation
    autoConfig(context);

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
        vscode.commands.registerCommand('orch.configure', async () => {
            const key = await vscode.window.showInputBox({
                prompt: 'Enter your Orch API key',
                placeHolder: 'orch_xxx',
                password: true,
                validateInput: (v) => v.startsWith('orch_') ? null : 'Key must start with orch_'
            });
            if (!key) return;

            const currentUrl = getApiUrl();
            const url = await vscode.window.showInputBox({
                prompt: 'Enter your Orch API URL',
                placeHolder: 'https://your-orch-instance.com',
                value: currentUrl,
            });
            if (!url) return;

            await setApiKey(key);
            await setApiUrl(url);
            refreshStatusBar();
            vscode.window.showInformationMessage('Orch: Configured successfully ✓');
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
