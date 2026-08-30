async function run() {
  const res = await fetch('https://orch-core.onrender.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer orch_dummy'
    },
    body: JSON.stringify({
      model: "nemotron-3-ultra",
      messages: [{role: "user", content: "hello"}]
    })
  });
  console.log("STATUS:", res.status);
  const text = await res.text();
  console.log("BODY:", text.substring(0, 500));
}
run();
