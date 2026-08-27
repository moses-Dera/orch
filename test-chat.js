const fetch = require('node-fetch');

async function test() {
  console.log("Sending request to Vercel production API...");
  const res = await fetch('https://orchit.vercel.app/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Say hello world!' }]
    })
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response body:", text);
}
test().catch(console.error);
