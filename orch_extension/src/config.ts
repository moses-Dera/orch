import * as vscode from 'vscode';

let _context: vscode.ExtensionContext;

export function initConfig(context: vscode.ExtensionContext) {
    _context = context;
}

export async function getApiKey(): Promise<string> {
    return await _context.secrets.get('orch.apiKey') ?? '';
}

export async function setApiKey(key: string): Promise<void> {
    await _context.secrets.store('orch.apiKey', key);
}

export async function deleteApiKey(): Promise<void> {
    await _context.secrets.delete('orch.apiKey');
}

export function getApiUrl(): string {
    return _context.globalState.get<string>('orch.apiUrl', 'http://127.0.0.1:8000');
}

export async function setApiUrl(url: string): Promise<void> {
    await _context.globalState.update('orch.apiUrl', url);
}

export async function isConfigured(): Promise<boolean> {
    const key = await getApiKey();
    return !!key;
}
