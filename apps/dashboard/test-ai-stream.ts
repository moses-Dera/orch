import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

async function main() {
  const orchProxy = createOpenAI({ apiKey: 'test' });
  const result = streamText({
    model: orchProxy.chat('gpt-4'),
    messages: [{ role: 'user', content: 'test' }],
  });
  console.log('toDataStreamResponse', typeof result.toDataStreamResponse);
  console.log('toTextStreamResponse', typeof result.toTextStreamResponse);
}
main().catch(console.error);
