import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

async function main() {
  const orchProxy = createOpenAI({ baseURL: 'https://example.com /v1', apiKey: 'test' });
  try {
    const result = streamText({
      model: orchProxy.chat('gpt-4'),
      messages: [{ role: 'user', content: 'test' }],
    });
    const res = result.toUIMessageStreamResponse();
    
    const reader = res.body?.getReader();
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        console.log("Chunk:", new TextDecoder().decode(value));
      }
    }
  } catch(e) {
    console.error("Synchronous error:", e.message);
  }
}
main().catch(console.error);
