"""
Orch Migration Runner
---------------------
Applies pending SQL migrations in order.
Safe to run multiple times — tracks applied migrations in a _migrations table.

Usage:
    python migrate.py            # apply all pending migrations
    python migrate.py --status   # show migration status
"""
import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import asyncpg

load_dotenv()

MIGRATIONS_DIR = Path(__file__).parent / "prisma" / "migrations"


async def get_conn():
    return await asyncpg.connect(os.environ["DATABASE_URL"])


async def ensure_migrations_table(conn):
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS _orch_migrations (
            id          SERIAL PRIMARY KEY,
            name        TEXT NOT NULL UNIQUE,
            applied_at  TIMESTAMP NOT NULL DEFAULT NOW()
        )
    """)


async def get_applied(conn) -> set[str]:
    rows = await conn.fetch("SELECT name FROM _orch_migrations")
    return {r["name"] for r in rows}


async def apply_migration(conn, name: str, sql: str):
    async with conn.transaction():
        await conn.execute(sql)
        await conn.execute(
            "INSERT INTO _orch_migrations (name) VALUES ($1)", name
        )
    print(f"[migrate] Applied: {name}")


async def run(status_only: bool = False):
    conn = await get_conn()
    await ensure_migrations_table(conn)
    applied = await get_applied(conn)

    migration_dirs = sorted(MIGRATIONS_DIR.iterdir())
    pending = []

    for d in migration_dirs:
        if not d.is_dir():
            continue
        sql_file = d / "migration.sql"
        if not sql_file.exists():
            continue
        name = d.name
        if name not in applied:
            pending.append((name, sql_file.read_text()))

    if status_only:
        print(f"\n[migrate] Applied migrations ({len(applied)}):")
        for name in sorted(applied):
            print(f"  ✓ {name}")
        print(f"\n[migrate] Pending migrations ({len(pending)}):")
        for name, _ in pending:
            print(f"  - {name}")
        await conn.close()
        return

    if not pending:
        print("[migrate] All migrations already applied. Nothing to do.")
        await conn.close()
        return

    print(f"[migrate] Applying {len(pending)} migration(s)...")
    for name, sql in pending:
        await apply_migration(conn, name, sql)

    print(f"\n[migrate] Done. {len(pending)} migration(s) applied.")
    await conn.close()


if __name__ == "__main__":
    status_only = "--status" in sys.argv
    asyncio.run(run(status_only=status_only))
