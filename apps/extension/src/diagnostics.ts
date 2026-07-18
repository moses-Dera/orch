import * as vscode from 'vscode';
import { reviewFile } from './api';
import { isConfigured } from './config';

const DIAG_COLLECTION_NAME = 'orch';
let diagnosticCollection: vscode.DiagnosticCollection;

export function initDiagnostics(context: vscode.ExtensionContext): vscode.DiagnosticCollection {
    diagnosticCollection = vscode.languages.createDiagnosticCollection(DIAG_COLLECTION_NAME);
    context.subscriptions.push(diagnosticCollection);
    return diagnosticCollection;
}

/**
 * Maps Orch severity to VS Code DiagnosticSeverity.
 */
function toVscodeSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
        case 'critical': return vscode.DiagnosticSeverity.Error;
        case 'warning':  return vscode.DiagnosticSeverity.Warning;
        default:         return vscode.DiagnosticSeverity.Information;
    }
}

/**
 * Runs a review on the active file and populates VS Code diagnostics.
 * Findings appear as inline squiggles with hover details and suggested fixes.
 */
export async function auditActiveFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showWarningMessage('Orch: No active file to audit.');
        return;
    }

    if (!(await isConfigured())) {
        vscode.window.showWarningMessage('Orch: Not configured. Run "Orch: Configure" to set up.');
        return;
    }

    const document = editor.document;
    const filename = document.fileName.split('/').pop() ?? 'file';
    const content = document.getText();

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Orch: Auditing ${filename}...`,
        cancellable: false,
    }, async () => {
        try {
            const result = await reviewFile(filename, content, 'auto', 'auto');

            // Clear previous diagnostics for this file
            diagnosticCollection.delete(document.uri);

            if (result.clean || result.issues.length === 0) {
                vscode.window.showInformationMessage(`Orch: ${filename} — no issues found ✓`);
                return;
            }

            const diagnostics: vscode.Diagnostic[] = result.issues.map(issue => {
                // Map line number to VS Code range (0-indexed)
                const lineNumber = issue.line ? Math.max(0, issue.line - 1) : 0;
                const line = document.lineAt(Math.min(lineNumber, document.lineCount - 1));
                const range = new vscode.Range(
                    line.range.start,
                    line.range.end
                );

                const diag = new vscode.Diagnostic(
                    range,
                    `[${issue.constraint_id}] ${issue.title}\n${issue.detail}`,
                    toVscodeSeverity(issue.severity)
                );

                diag.source = 'Orch';
                diag.code = issue.constraint_id;

                // Add suggested fix as a related information item
                if (issue.suggested_fix) {
                    diag.relatedInformation = [
                        new vscode.DiagnosticRelatedInformation(
                            new vscode.Location(document.uri, range),
                            `Suggested fix: ${issue.suggested_fix}`
                        )
                    ];
                }

                return diag;
            });

            diagnosticCollection.set(document.uri, diagnostics);

            const critical = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
            const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;

            vscode.window.showWarningMessage(
                `Orch: ${filename} — ${result.issues.length} issue${result.issues.length !== 1 ? 's' : ''} found` +
                (critical > 0 ? ` (${critical} critical)` : '') +
                (warnings > 0 ? ` (${warnings} warnings)` : '')
            );

        } catch (e: any) {
            vscode.window.showErrorMessage(`Orch audit failed: ${e.message}`);
        }
    });
}

/**
 * Clears all Orch diagnostics from the current file.
 */
export function clearDiagnostics(uri?: vscode.Uri): void {
    if (uri) {
        diagnosticCollection.delete(uri);
    } else {
        diagnosticCollection.clear();
    }
}
