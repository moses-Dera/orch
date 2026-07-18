import * as vscode from 'vscode';
import { getApiUrl } from './config';
import { boot, saveKey, signOut } from './commands/auth';
import { runAsk } from './commands/ask';
import { runAudit, runStatus } from './commands/audit';

const ACTIONS = [
    { label: '@ask',     desc: 'Ask a question' },
    { label: '@audit',   desc: 'Audit current file' },
    { label: '@review',  desc: 'Review selected code' },
    { label: '@chat',    desc: 'Start a multi-turn session' },
    { label: '@status',  desc: 'Show org and team info' },
    { label: '@signout', desc: 'Sign out' },
];

export class OrchPanel {
    static current: OrchPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private sessionId: string | null = null;
    private disposables: vscode.Disposable[] = [];

    static show(context: vscode.ExtensionContext) {
        if (OrchPanel.current) { OrchPanel.current.panel.reveal(); return; }
        const panel = vscode.window.createWebviewPanel(
            'orchPanel', 'Orch', vscode.ViewColumn.Beside,
            { enableScripts: true, retainContextWhenHidden: true }
        );
        OrchPanel.current = new OrchPanel(panel);
    }

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;
        this.panel.webview.html = html();
        this.panel.webview.onDidReceiveMessage(msg => this._handle(msg), null, this.disposables);
        this.panel.onDidDispose(() => this._dispose(), null, this.disposables);
    }

    private async _handle(msg: any) {
        const post = (m: any) => this._post(m);
        switch (msg.type) {
            case 'ready':       await boot(post); break;
            case 'saveKey':     await saveKey(msg.key, msg.url, post); break;
            case 'openDashboard': vscode.env.openExternal(vscode.Uri.parse(`${getApiUrl()}/dashboard`)); break;
            case 'newSession':  this.sessionId = null; post({ type: 'sessionCleared' }); break;
            case 'input':       await this._route(msg.text); break;
        }
    }

    private async _route(text: string) {
        const t = text.trim();
        if (!t) { return; }
        const post = (m: any) => this._post(m);

        if (t === '@')        { post({ type: 'actions', actions: ACTIONS }); return; }
        if (t === '@status')  { await runStatus(post); return; }
        if (t === '@audit')   { await runAudit(false, post); return; }
        if (t === '@review')  { await runAudit(true, post); return; }
        if (t === '@signout') { await signOut(post, () => { this.sessionId = null; }); return; }

        const prompt = t.replace(/^@(ask|chat)\s*/i, '');
        if (!prompt) { post({ type: 'error', text: 'Enter a prompt after the action.' }); return; }
        await runAsk(prompt, this.sessionId, post, (id) => { this.sessionId = id; });
    }

    public triggerAction(action: string) { this._route(action); }

    private _post(msg: any) { this.panel.webview.postMessage(msg); }

    private _dispose() {
        OrchPanel.current = undefined;
        this.panel.dispose();
        this.disposables.forEach(d => d.dispose());
    }
}

function html(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Orch</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  #onboarding { display: none; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 32px 24px; gap: 16px; text-align: center; }
  #onboarding h2 { font-size: 18px; font-weight: bold; }
  #onboarding p { font-size: 12px; color: var(--vscode-descriptionForeground); line-height: 1.6; max-width: 320px; }
  .ob-step { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: 8px; text-align: left; }
  .ob-step label { font-size: 11px; color: var(--vscode-descriptionForeground); }
  .ob-input { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 8px 10px; font-size: 12px; font-family: inherit; width: 100%; outline: none; }
  .ob-hint { font-size: 11px; color: var(--vscode-descriptionForeground); }
  .ob-hint a { color: var(--vscode-textLink-foreground); cursor: pointer; text-decoration: none; }
  .ob-hint a:hover { text-decoration: underline; }
  .ob-error { font-size: 11px; color: var(--vscode-errorForeground); min-height: 16px; }
  #chat { display: none; flex-direction: column; flex: 1; overflow: hidden; }
  #header { padding: 10px 14px; border-bottom: 1px solid var(--vscode-panel-border); display: flex; justify-content: space-between; align-items: center; font-weight: bold; font-size: 13px; flex-shrink: 0; }
  #header-right { display: flex; gap: 10px; align-items: center; }
  #meta-bar { font-size: 11px; color: var(--vscode-descriptionForeground); padding: 4px 14px; min-height: 20px; flex-shrink: 0; }
  #messages { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 12px; }
  .msg { max-width: 100%; line-height: 1.6; }
  .msg.user { align-self: flex-end; background: var(--vscode-button-background); color: var(--vscode-button-foreground); padding: 6px 12px; border-radius: 6px; max-width: 80%; font-size: 12px; }
  .msg.assistant { align-self: flex-start; white-space: pre-wrap; font-size: 12px; }
  .msg.error { color: var(--vscode-errorForeground); font-size: 12px; }
  .hint-msg { font-size: 11px; color: var(--vscode-descriptionForeground); text-align: center; padding: 8px 0; }
  #actions-list { display: none; flex-direction: column; border: 1px solid var(--vscode-panel-border); border-radius: 6px; overflow: hidden; margin: 0 14px 8px; flex-shrink: 0; }
  .action-item { padding: 8px 12px; cursor: pointer; display: flex; gap: 12px; align-items: center; font-size: 12px; }
  .action-item:hover { background: var(--vscode-list-hoverBackground); }
  .action-label { font-weight: bold; color: var(--vscode-textLink-foreground); min-width: 80px; }
  .action-desc { color: var(--vscode-descriptionForeground); }
  #input-area { border-top: 1px solid var(--vscode-panel-border); padding: 10px 14px; display: flex; gap: 8px; flex-shrink: 0; }
  #input { flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; padding: 6px 10px; font-size: 12px; font-family: inherit; resize: none; outline: none; }
  .btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; font-size: 12px; font-family: inherit; }
  .btn:hover { background: var(--vscode-button-hoverBackground); }
  .btn-ghost { background: none; border: none; color: var(--vscode-descriptionForeground); cursor: pointer; font-size: 11px; padding: 0; font-family: inherit; }
  .btn-ghost:hover { color: var(--vscode-foreground); }
  .cursor { display: inline-block; width: 2px; height: 13px; background: currentColor; animation: blink 1s step-end infinite; vertical-align: text-bottom; }
  @keyframes blink { 50% { opacity: 0; } }
  code { background: var(--vscode-textCodeBlock-background); padding: 1px 4px; border-radius: 3px; font-family: var(--vscode-editor-font-family); }
  pre { background: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; overflow-x: auto; margin: 6px 0; }
  strong { font-weight: bold; }
  hr { border: none; border-top: 1px solid var(--vscode-panel-border); margin: 6px 0; }
</style>
</head>
<body>
<div id="onboarding">
  <h2>Welcome to Orch</h2>
  <p>Bring your org's AI constraints directly into your editor. Sign in to get started.</p>
  <div class="ob-step">
    <label>API URL (leave default if running locally)</label>
    <input id="ob-url" class="ob-input" type="text" placeholder="http://127.0.0.1:8000" />
  </div>
  <div class="ob-step">
    <label>Your Orch API key</label>
    <input id="ob-key" class="ob-input" type="password" placeholder="orch_..." />
    <span class="ob-hint">Get your key from the <a id="ob-dashboard-link">Orch dashboard</a>.</span>
  </div>
  <div class="ob-error" id="ob-error"></div>
  <button class="btn" id="ob-submit">Sign in</button>
</div>
<div id="chat">
  <div id="header">
    <span id="header-title">Orch</span>
    <div id="header-right">
      <button class="btn-ghost" id="new-session">New session</button>
      <button class="btn-ghost" id="signout-btn">Sign out</button>
    </div>
  </div>
  <div id="meta-bar"></div>
  <div id="messages"><div class="hint-msg">Type <strong>@</strong> to see available actions, or just ask anything.</div></div>
  <div id="actions-list"></div>
  <div id="input-area">
    <textarea id="input" rows="1" placeholder="Ask anything, or type @ for actions..."></textarea>
    <button class="btn" id="send-btn">Send</button>
  </div>
</div>
<script>
  const vscode = acquireVsCodeApi();
  const onboardingEl = document.getElementById('onboarding');
  const chatEl = document.getElementById('chat');
  const messagesEl = document.getElementById('messages');
  const inputEl = document.getElementById('input');
  const metaBar = document.getElementById('meta-bar');
  const actionsList = document.getElementById('actions-list');
  const obError = document.getElementById('ob-error');
  let streamEl = null;

  document.getElementById('ob-dashboard-link').addEventListener('click', () => vscode.postMessage({ type: 'openDashboard' }));
  document.getElementById('ob-submit').addEventListener('click', () => {
    const key = document.getElementById('ob-key').value.trim();
    const url = document.getElementById('ob-url').value.trim();
    obError.textContent = '';
    if (!key) { obError.textContent = 'Please enter your API key.'; return; }
    vscode.postMessage({ type: 'saveKey', key, url });
  });
  document.getElementById('ob-key').addEventListener('keydown', (e) => { if (e.key === 'Enter') document.getElementById('ob-submit').click(); });
  document.getElementById('send-btn').addEventListener('click', send);
  document.getElementById('new-session').addEventListener('click', () => vscode.postMessage({ type: 'newSession' }));
  document.getElementById('signout-btn').addEventListener('click', () => vscode.postMessage({ type: 'input', text: '@signout' }));

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    if (inputEl.value === '@') { vscode.postMessage({ type: 'input', text: '@' }); } else { hideActions(); }
  });
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });

  function send() {
    const text = inputEl.value.trim();
    if (!text) { return; }
    hideActions();
    vscode.postMessage({ type: 'input', text });
    inputEl.value = '';
    inputEl.style.height = 'auto';
  }

  function hideActions() { actionsList.style.display = 'none'; actionsList.innerHTML = ''; }

  function renderMarkdown(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\`\`\`[\w]*\n?([\s\S]*?)\`\`\`/g, '<pre>$1</pre>')
      .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n/g, '<br>');
  }

  window.addEventListener('message', ({ data: msg }) => {
    if (msg.type === 'showOnboarding') {
      onboardingEl.style.display = 'flex'; chatEl.style.display = 'none';
      document.getElementById('ob-url').value = msg.apiUrl || 'http://127.0.0.1:8000';
      if (msg.error) { obError.textContent = msg.error; }
    }
    if (msg.type === 'showChat') {
      onboardingEl.style.display = 'none'; chatEl.style.display = 'flex';
      document.getElementById('header-title').textContent = msg.team ? 'Orch - ' + msg.team : 'Orch';
      metaBar.textContent = msg.org + ' / ' + msg.policy;
    }
    if (msg.type === 'onboardingError') { obError.textContent = msg.text; }
    if (msg.type === 'actions') {
      actionsList.innerHTML = ''; actionsList.style.display = 'flex';
      msg.actions.forEach(a => {
        const item = document.createElement('div');
        item.className = 'action-item';
        item.innerHTML = '<span class="action-label">' + a.label + '</span><span class="action-desc">' + a.desc + '</span>';
        item.addEventListener('click', () => {
          hideActions();
          if (['@audit', '@review', '@status', '@signout'].includes(a.label)) { vscode.postMessage({ type: 'input', text: a.label }); }
          else { inputEl.value = a.label + ' '; inputEl.focus(); }
        });
        actionsList.appendChild(item);
      });
    }
    if (msg.type === 'userMessage') {
      const el = document.createElement('div');
      el.className = 'msg user'; el.textContent = msg.text;
      messagesEl.appendChild(el); messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    if (msg.type === 'streamStart') {
      streamEl = document.createElement('div');
      streamEl.className = 'msg assistant';
      const cursor = document.createElement('span'); cursor.className = 'cursor';
      streamEl.appendChild(cursor); messagesEl.appendChild(streamEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    if (msg.type === 'chunk' && streamEl) {
      const cursor = streamEl.querySelector('.cursor');
      if (cursor) { cursor.remove(); }
      streamEl.innerHTML = renderMarkdown((streamEl.textContent || '') + msg.text);
      const cur = document.createElement('span'); cur.className = 'cursor';
      streamEl.appendChild(cur); messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    if (msg.type === 'streamEnd' && streamEl) {
      const cursor = streamEl.querySelector('.cursor'); if (cursor) { cursor.remove(); } streamEl = null;
    }
    if (msg.type === 'meta') { metaBar.textContent = msg.domain + ' / ' + msg.model; }
    if (msg.type === 'error') {
      const el = document.createElement('div'); el.className = 'msg error'; el.textContent = 'Error: ' + msg.text;
      messagesEl.appendChild(el); messagesEl.scrollTop = messagesEl.scrollHeight;
      if (streamEl) { streamEl.remove(); streamEl = null; }
    }
    if (msg.type === 'sessionCleared') {
      messagesEl.innerHTML = '<div class="hint-msg">Type <strong>@</strong> to see available actions, or just ask anything.</div>';
      metaBar.textContent = '';
    }
  });

  vscode.postMessage({ type: 'ready' });
</script>
</body>
</html>`;
}
