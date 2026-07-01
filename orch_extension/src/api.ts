import * as https from 'https';
import * as http from 'http';
import { getApiKey, getApiUrl } from './config';

export interface OrchResponse {
    domain_identified: string;
    model_executed: string;
    session_id: string;
    structured_output: string;
    input_tokens: number;
    output_tokens: number;
    key_source: string;
}

export interface ReviewIssue {
    severity: 'critical' | 'warning' | 'info';
    line: number | null;
    title: string;
    detail: string;
    constraint_id: string;
    suggested_fix: string | null;
}

export interface ReviewResponse {
    filename: string;
    domain_identified: string;
    model_executed: string;
    issues: ReviewIssue[];
    summary: string;
    clean: boolean;
}

async function headers(): Promise<Record<string, string>> {
    const apiKey = await getApiKey();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };
}

function request(path: string, method: string, body: string, hdrs: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
        const url = new URL(`${getApiUrl()}${path}`);
        const lib = url.protocol === 'https:' ? https : http;
        const req = lib.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method,
            headers: { ...hdrs, 'Content-Length': Buffer.byteLength(body) }
        }, (res) => {
            let data = '';
            res.on('data', (chunk: Buffer) => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        if (body) { req.write(body); }
        req.end();
    });
}

export async function ask(prompt: string, domain: string, model: string, sessionId: string | null): Promise<OrchResponse> {
    const hdrs = await headers();
    return request('/api/v1/orchestrate', 'POST', JSON.stringify({ user_prompt: prompt, domain, model, session_id: sessionId }), hdrs);
}

export async function askStream(
    prompt: string, domain: string, model: string, sessionId: string | null,
    onMeta: (meta: { session_id: string; domain: string; model: string }) => void,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (msg: string) => void
): Promise<void> {
    const apiKey = await getApiKey();
    const body = JSON.stringify({ user_prompt: prompt, domain, model, session_id: sessionId });
    const url = new URL(`${getApiUrl()}/api/v1/orchestrate/stream`);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': Buffer.byteLength(body),
            'Accept': 'text/event-stream'
        }
    }, (res) => {
        let buffer = '';
        res.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                if (!line.startsWith('data: ')) { continue; }
                const data = line.slice(6).trim();
                if (data === '[DONE]') { onDone(); return; }
                try {
                    const event = JSON.parse(data);
                    if (event.type === 'meta') { onMeta(event); }
                    else if (event.type === 'chunk') { onChunk(event.content); }
                    else if (event.type === 'error') { onError(event.message); }
                } catch {}
            }
        });
    });

    req.on('error', (e: Error) => onError(e.message));
    req.write(body);
    req.end();
}

export async function reviewFile(filename: string, content: string, domain: string, model: string): Promise<ReviewResponse> {
    const hdrs = await headers();
    return request('/api/v1/review', 'POST', JSON.stringify({ filename, diff: content, domain, model }), hdrs);
}

export async function getStatus(): Promise<any> {
    const apiKey = await getApiKey();
    return new Promise((resolve, reject) => {
        const url = new URL(`${getApiUrl()}/api/v1/status`);
        const lib = url.protocol === 'https:' ? https : http;
        const req = lib.request({
            hostname: url.hostname, port: url.port, path: url.pathname, method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        }, (res) => {
            let data = '';
            res.on('data', (chunk: Buffer) => data += chunk);
            res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
        });
        req.on('error', reject);
        req.end();
    });
}
