import * as vscode from 'vscode';
import { getStatus } from './api';
import { isConfigured } from './config';

let statusBarItem: vscode.StatusBarItem;

export function initStatusBar(context: vscode.ExtensionContext) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'orch.openPanel';
    statusBarItem.text = 'Orch';
    statusBarItem.tooltip = 'Open Orch Panel';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    refresh();
}

export async function refresh() {
    const configured = await isConfigured();
    if (!configured) {
        statusBarItem.text = 'Orch';
        statusBarItem.tooltip = 'Click to sign in';
        return;
    }
    try {
        const status = await getStatus();
        statusBarItem.text = `Orch: ${status.team}`;
        statusBarItem.tooltip = `Org: ${status.org} | Team: ${status.team} | Policy: ${status.model_policy}`;
    } catch {
        statusBarItem.text = 'Orch: offline';
        statusBarItem.tooltip = 'Cannot reach Orch server';
    }
}
