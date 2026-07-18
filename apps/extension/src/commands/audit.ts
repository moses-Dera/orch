import * as vscode from 'vscode';
import { reviewFile, getStatus } from '../api';
import { refresh as refreshStatusBar } from '../statusBar';

export async function runAudit(selectionOnly: boolean, post: (msg: any) => void) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { post({ type: 'error', text: 'No active file open.' }); return; }

    const content = selectionOnly && !editor.selection.isEmpty
        ? editor.document.getText(editor.selection)
        : editor.document.getText();

    const filename = editor.document.fileName.split('/').pop() ?? 'file';
    post({ type: 'userMessage', text: `Auditing ${filename}...` });
    post({ type: 'streamStart' });

    try {
        const result = await reviewFile(filename, content, 'auto', 'auto');
        if (result.clean) {
            post({ type: 'chunk', text: 'No issues found. Code looks clean.' });
        } else {
            let output = `**${result.summary}**\n\n`;
            for (const issue of result.issues) {
                output += `**[${issue.severity.toUpperCase()}]** ${issue.title}`;
                if (issue.line) { output += ` - Line ${issue.line}`; }
                output += `\n${issue.detail}\n`;
                if (issue.suggested_fix) { output += `\nSuggested fix:\n\`\`\`\n${issue.suggested_fix}\n\`\`\`\n`; }
                output += '\n---\n\n';
            }
            post({ type: 'chunk', text: output });
        }
    } catch (e: any) {
        post({ type: 'error', text: e.message });
    }
    post({ type: 'streamEnd' });
}

export async function runStatus(post: (msg: any) => void) {
    post({ type: 'userMessage', text: '@status' });
    post({ type: 'streamStart' });
    try {
        const s = await getStatus();
        post({ type: 'chunk', text: `**Org:** ${s.org}\n**Team:** ${s.team}\n**Policy:** ${s.model_policy}${s.enforced_model ? `\n**Enforced model:** ${s.enforced_model}` : ''}` });
    } catch {
        post({ type: 'error', text: 'Could not reach Orch.' });
    }
    post({ type: 'streamEnd' });
    refreshStatusBar();
}
