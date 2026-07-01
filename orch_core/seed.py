import asyncio
import secrets
from app.db.client import db, connect, disconnect
from app.db.repositories.constraint import ConstraintRepository


DOMAINS = [
    {
        "id": "backend",
        "description": "Staff Backend Engineering Expert",
        "version": "1.0",
        "constraints": (
            "You are a Staff Backend Engineer. Evaluate the request adhering to these constraints: "
            "1. Enforce idempotency on all write operations. "
            "2. Ensure connection pooling is utilized for all DB calls. "
            "3. All endpoints must include OpenAPI documentation. "
            "4. Use async/await patterns throughout. "
            "5. Format your response as: Architecture Summary, Code Block, Edge Cases."
        ),
        "gptVariant": None,
        "claudeVariant": (
            "IMPORTANT: You are a Staff Backend Engineer. You MUST adhere to ALL of these constraints: "
            "1. ALWAYS enforce idempotency on all write operations. "
            "2. ALWAYS ensure connection pooling is utilized for all DB calls. "
            "3. ALL endpoints must include OpenAPI documentation. "
            "4. ALWAYS use async/await patterns. "
            "5. Format your response EXACTLY as: Architecture Summary, Code Block, Edge Cases."
        ),
        "geminiVariant": None
    },
    {
        "id": "cyber",
        "description": "Elite Cybersecurity Sec-Ops Architect",
        "version": "1.0",
        "constraints": (
            "You are an elite Cybersecurity Sec-Ops Architect operating under zero-trust principles. "
            "You must explicitly check for and mitigate OWASP Top 10 vulnerabilities. "
            "If code is provided, identify all threat vectors first before rewriting it securely. "
            "Never suggest storing secrets in environment variables — use a secrets manager. "
            "Format your response as: Threat Analysis, Secure Implementation, Mitigations Applied."
        ),
        "gptVariant": None,
        "claudeVariant": None,
        "geminiVariant": None
    },
    {
        "id": "blockchain",
        "description": "Lead Smart Contract Auditor",
        "version": "1.0",
        "constraints": (
            "You are a Lead Smart Contract Auditor. All code or requests must be verified for: "
            "Reentrancy attacks, Integer Overflows/Underflows, Front-running vulnerabilities, "
            "Access control issues, and Unchecked external calls. "
            "Prioritize gas optimization without sacrificing security. "
            "Format your response as: Vulnerability Report, Secure Implementation, Gas Analysis."
        ),
        "gptVariant": None,
        "claudeVariant": None,
        "geminiVariant": None
    },
    {
        "id": "general",
        "description": "Senior Software Engineer",
        "version": "1.0",
        "constraints": (
            "You are a Senior Software Engineer. Provide robust, clean, and maintainable solutions. "
            "Always consider edge cases, error handling, and performance. "
            "Prefer simple solutions over clever ones. "
            "Include brief explanations of your design decisions."
        ),
        "gptVariant": None,
        "claudeVariant": None,
        "geminiVariant": None
    }
]


async def main():
    await connect()

    repo = ConstraintRepository(db)
    for domain in DOMAINS:
        await repo.upsert(domain)
        print(f"[seed] Constraint '{domain['id']}' upserted.")

    # Default local dev org + team + API key
    org = await db.organization.upsert(
        where={"id": "local-org"},
        data={
            "create": {"id": "local-org", "name": "Local Dev Org", "modelPolicy": "open", "tier": "pro"},
            "update": {"name": "Local Dev Org"}
        }
    )
    team = await db.team.upsert(
        where={"id": "local-team"},
        data={
            "create": {"id": "local-team", "name": "Local Dev Team", "orgId": org.id},
            "update": {"name": "Local Dev Team"}
        }
    )
    existing = await db.apikey.find_first(where={"teamId": team.id, "label": "dev"})
    if not existing:
        key = f"orch_{secrets.token_urlsafe(32)}"
        await db.apikey.create(data={"key": key, "label": "dev", "teamId": team.id})
        print(f"\n[seed] Dev API key: {key}")
        print("[seed] Run: python cli/orch.py login --key <key above>")
    else:
        print("\n[seed] Dev API key already exists.")

    await disconnect()
    print("\n[seed] Done.")


if __name__ == "__main__":
    asyncio.run(main())
