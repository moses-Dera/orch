/**
 * Data Loss Prevention (DLP) Utility
 * Redacts secrets, API keys, and basic PII from text before it is sent to AI models.
 */

const SECRET_PATTERNS = [
  // AWS Access Key ID
  /(?<![A-Z0-9])[A-Z0-9]{20}(?![A-Z0-9])/g,
  
  // AWS Secret Access Key (rough heuristic for 40 char base64)
  /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g,
  
  // OpenAI / Generic Secret Keys (sk-...)
  /sk-[a-zA-Z0-9]{20,}/g,
  
  // GitHub Personal Access Token
  /gh[pousr]_[a-zA-Z0-9]{36,}/g,

  // Stripe Keys
  /(sk_live|rk_live|sk_test|rk_test)_[a-zA-Z0-9]+/g,

  // RSA Private Keys (PEM format)
  /-----BEGIN (?:RSA|DSA|EC|OPENSSH)? PRIVATE KEY-----[a-zA-Z0-9+/\s=]+-----END (?:RSA|DSA|EC|OPENSSH)? PRIVATE KEY-----/g,

  // Emails (Basic PII redaction)
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
];

export function redactSecrets(text: string): string {
  if (!text) return text;
  
  let redactedText = text;
  
  for (const pattern of SECRET_PATTERNS) {
    redactedText = redactedText.replace(pattern, '[REDACTED_SECRET]');
  }
  
  return redactedText;
}
