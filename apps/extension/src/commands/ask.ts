import { askStream } from '../api';

export async function runAsk(
    prompt: string,
    sessionId: string | null,
    post: (msg: any) => void,
    setSession: (id: string) => void
) {
    post({ type: 'userMessage', text: prompt });
    post({ type: 'streamStart' });

    await askStream(
        prompt, 'auto', 'auto', sessionId,
        (meta) => { setSession(meta.session_id); post({ type: 'meta', domain: meta.domain, model: meta.model }); },
        (chunk) => post({ type: 'chunk', text: chunk }),
        ()      => post({ type: 'streamEnd' }),
        (err)   => post({ type: 'error', text: err })
    );
}
