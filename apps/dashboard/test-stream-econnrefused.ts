import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

async function main() {
  const orchProxy = createOpenAI({ baseURL: 'http://127.0.0.1:3001/v1', apiKey: 'test' });
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
}
main().catch(console.error);
