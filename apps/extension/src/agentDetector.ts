import * as vscode from 'vscode';
import * as http from 'http';
import { getApiUrl } from './config';

function checkAgentRunning(): Promise<boolean> {
    return new Promise((resolve) => {
        const url = new URL(`${getApiUrl()}/health`);
        const req = http.get({ hostname: url.hostname, port: url.port, path: url.pathname, timeout: 2000 }, (res: http.IncomingMessage) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

export async function checkAgent() {
    const running = await checkAgentRunning();
    if (running) { return; }

    const choice = await vscode.window.showInformationMessage(
        'Orch agent is not running. Install or start it to enable file watching and desktop alerts.',
        'Install Orch Agent',
        'Start Manually',
        'Dismiss'
    );

    if (choice === 'Install Orch Agent') {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/orch/orch-agent#install'));
    } else if (choice === 'Start Manually') {
        const terminal = vscode.window.createTerminal('Orch Agent');
        terminal.sendText('cd orch_agent && python agent.py');
        terminal.show();
    }
}
