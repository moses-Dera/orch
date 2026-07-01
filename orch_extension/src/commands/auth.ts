import * as vscode from 'vscode';
import { getStatus } from '../api';
import { setApiKey, deleteApiKey, getApiUrl, setApiUrl, isConfigured } from '../config';
import { refresh as refreshStatusBar } from '../statusBar';

export async function boot(post: (msg: any) => void) {
    const configured = await isConfigured();
    if (!configured) {
        post({ type: 'showOnboarding', apiUrl: getApiUrl() });
        return;
    }
    try {
        const status = await getStatus();
        post({ type: 'showChat', org: status.org, team: status.team, policy: status.model_policy });
    } catch {
        post({ type: 'showOnboarding', apiUrl: getApiUrl(), error: 'Could not connect to Orch. Check your API URL.' });
    }
}

export async function saveKey(key: string, url: string, post: (msg: any) => void) {
    if (!key.startsWith('orch_')) {
        post({ type: 'onboardingError', text: 'Invalid key. Orch keys start with orch_' });
        return;
    }
    await setApiKey(key);
    if (url && url !== getApiUrl()) { await setApiUrl(url); }
    await boot(post);
    refreshStatusBar();
}

export async function signOut(post: (msg: any) => void, clearSession: () => void) {
    await deleteApiKey();
    clearSession();
    post({ type: 'showOnboarding', apiUrl: getApiUrl() });
    refreshStatusBar();
}
