import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const orchProxy = createOpenAI({
  baseURL: 'https://orch-core.onrender.com/v1',
  apiKey: 'orch_dummy'
});

async function run() {
  try {
    const result = streamText({
      model: orchProxy.chat('nemotron-3-ultra'),
      messages: [{ role: 'user', content: 'hello' }],
      maxTokens: 1500,
    });
    
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
    console.log('\nDone.');
  } catch (err) {
    console.error("ERROR:", err.message);
  }
}

run();
