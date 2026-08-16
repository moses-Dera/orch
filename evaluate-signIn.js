const fs = require('fs');
const code = fs.readFileSync('node_modules/.bun/@clerk+shared@4.25.5+bf16f8eded5e12ee/node_modules/@clerk/shared/dist/signIn.js', 'utf8');
console.log(code.includes('authenticateWithRedirect'));
