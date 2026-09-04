# Orch: The Firewall and Governance Layer for Autonomous Engineering

## The Problem: The AI Governance Gap
Every enterprise is racing to adopt AI coding assistants (GitHub Copilot, Cursor) to multiply developer productivity. However, engineering leadership is terrified of the consequences:
1. **Spaghetti Code at Scale:** AI generates generic code that ignores internal architectural standards, accelerating technical debt.
2. **Zero Visibility & Control:** LLM prompts happen on local developer machines. CTOs have no idea what code is being generated or if it complies with security policies.
3. **Runaway API Costs:** Uncapped, decentralized usage across hundreds of developers creates unpredictable SaaS and API billing.

## The Solution: Centralized Policy-as-Code
Orch flips the current AI paradigm. Instead of un-managed local AI, Orch acts as a **Centralized Control Plane** that sits between the developer's IDE and the underlying LLMs.

### 1. Dynamic RAG Governance
Organizations no longer need to write exhaustive `.cursorrules` or rely on developers to prompt correctly. 
* Orch maintains a centralized vector database of the organization's absolute best and worst code examples.
* When a developer asks their IDE to write code, Orch intercepts the request and uses **Cosine Similarity Vector Search (RAG)** to instantly inject the exact, highly-relevant company standards into the prompt before it hits the LLM. 
* **Result:** The AI writes code that looks exactly like your senior engineers wrote it.

### 2. Universal Integration (Zero-Friction for Devs)
Security tools fail when they slow developers down. Orch is completely invisible and works exactly where developers already live:
* **MCP (Model Context Protocol) Native:** Orch runs as a native MCP server (`orch mcp`). This means any modern AI tool (Cursor, Claude Desktop, GitHub Copilot) can natively connect to Orch to dynamically fetch guidelines (`fetch_policy`) and evaluate code diffs (`evaluate_code`) without custom plugins.
* **Fallback Extensions:** For IDEs that don't yet support MCP, a lightweight, standalone VS Code Extension securely authenticates via OAuth and silently syncs the organization's governance rules to the local workspace in the background.
* **Result:** Developers keep using their favorite AI tools exactly as they do today. Orch handles the governance completely in the background.

### 3. The Critic/Judge Evaluator (Continuous Auditing)
Orch doesn't just govern prompts; it evaluates the output.
* Utilizing a multi-pass AI architecture, Orch uses smaller, faster models to critique generated code against company constraints, and a final "Judge" model to pass or fail the diff. 
* This provides deterministic, highly-accurate automated code reviews at a fraction of the cost of manual intervention.

### 4. Enterprise Controls & Token Budgeting
* **Hard Limits:** Orch intercepts the streaming response from LLMs (via OpenRouter) to track exact token usage in real-time.
* If a team exceeds their token budget, the proxy cuts off access, ensuring finance departments have strict cost predictability.

## The Moat
Current solutions are either heavy static analysis tools (which happen *after* the code is written) or generic AI wrappers. 
Orch is **Policy-as-Code for the Prompt Generation Phase**. We stop bad code, security vulnerabilities, and rogue AI usage *before* the code is even generated, creating a highly sticky, indispensable enterprise platform.
Constraint Versioning: While the schema includes a version string for constraints, full historical diffing or rollback of constraints isn't highly visible.
Secret Management: The DB schema mentions apiKey in plaintext or encrypted; robust key rotation and KMS integration should be validated for enterprise readiness.
Test Coverage: There are placeholder test files (test-mcp.ts, test.ts), but expanding unit/integration testing on the Critic/Judge logic would be highly beneficial to measure precision and recall over time.