from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
import asyncio
from app.api.deps import get_team
from app.db.client import db
from app.db.repositories.session import SessionRepository

router = APIRouter()


def _format_session(s, messages: list) -> dict:
    total_input = sum(m.inputTokens or 0 for m in messages)
    total_output = sum(m.outputTokens or 0 for m in messages)
    models_used = list({m.modelUsed for m in messages if m.modelUsed})
    member = getattr(s, "member", None)
    return {
        "session_id": s.id,
        "created_at": s.createdAt.isoformat(),
        "constraint_version": s.constraintVersion,
        "developer": {
            "member_id": member.id if member else None,
            "email": member.email if member else "unknown",
            "name": member.name if member else None,
            "role": member.role if member else None,
        },
        "models_used": models_used,
        "total_messages": len(messages),
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
    }


@router.get("", summary="Audit log — per-developer session and usage breakdown")
async def get_audit_log(
    team=Depends(get_team),
    member_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200)
):
    session_repo = SessionRepository(db)

    if member_id:
        sessions = await session_repo.get_by_member(member_id, limit=limit)
    else:
        sessions = await session_repo.get_by_org(team.orgId, limit=limit)

    if not sessions:
        return {
            "org": team.org.name,
            "total_sessions": 0,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "developer_breakdown": [],
            "sessions": []
        }

    session_ids = [s.id for s in sessions]
    all_messages = await db.message.find_many(
        where={"sessionId": {"in": session_ids}},
        order={"createdAt": "asc"}
    )

    messages_by_session: dict[str, list] = {sid: [] for sid in session_ids}
    for m in all_messages:
        messages_by_session[m.sessionId].append(m)

    result = [_format_session(s, messages_by_session[s.id]) for s in sessions]

    total_input_all = sum(r["total_input_tokens"] for r in result)
    total_output_all = sum(r["total_output_tokens"] for r in result)

    developer_stats: dict = {}
    for r in result:
        email = r["developer"]["email"]
        if email not in developer_stats:
            developer_stats[email] = {
                "email": email,
                "name": r["developer"]["name"],
                "member_id": r["developer"]["member_id"],
                "sessions": 0,
                "total_input_tokens": 0,
                "total_output_tokens": 0,
                "models_used": set()
            }
        developer_stats[email]["sessions"] += 1
        developer_stats[email]["total_input_tokens"] += r["total_input_tokens"]
        developer_stats[email]["total_output_tokens"] += r["total_output_tokens"]
        developer_stats[email]["models_used"].update(r["models_used"])

    for stat in developer_stats.values():
        stat["models_used"] = list(stat["models_used"])

    return {
        "org": team.org.name,
        "total_sessions": len(result),
        "total_input_tokens": total_input_all,
        "total_output_tokens": total_output_all,
        "developer_breakdown": list(developer_stats.values()),
        "sessions": result
    }


@router.get("/me", summary="Current member's own sessions")
async def get_my_sessions(
    team=Depends(get_team),
    limit: int = Query(50, le=200)
):
    resolved_member = getattr(team, "resolved_member", None)
    if not resolved_member:
        raise HTTPException(status_code=400, detail={
            "error": "member_not_resolved",
            "message": "Could not identify your member record."
        })

    session_repo = SessionRepository(db)
    sessions = await session_repo.get_by_member(resolved_member.id, limit=limit)

    if not sessions:
        return {"sessions": []}

    session_ids = [s.id for s in sessions]
    all_messages = await db.message.find_many(
        where={"sessionId": {"in": session_ids}},
        order={"createdAt": "asc"}
    )
    messages_by_session: dict[str, list] = {sid: [] for sid in session_ids}
    for m in all_messages:
        messages_by_session[m.sessionId].append(m)

    return {"sessions": [_format_session(s, messages_by_session[s.id]) for s in sessions]}


@router.get("/{session_id}", summary="Full message thread for a session")
async def get_session(
    session_id: str,
    team=Depends(get_team)
):
    session = await db.session.find_unique(
        where={"id": session_id},
        include={"member": True}
    )

    if not session:
        raise HTTPException(status_code=404, detail={"error": "not_found", "message": "Session not found."})

    # Ensure session belongs to this org
    if session.teamId:
        team_record = await db.team.find_unique(where={"id": session.teamId})
        if not team_record or team_record.orgId != team.orgId:
            raise HTTPException(status_code=403, detail={"error": "forbidden", "message": "Access denied."})

    messages = await db.message.find_many(
        where={"sessionId": session_id},
        order={"createdAt": "asc"}
    )

    member = session.member
    return {
        "session_id": session.id,
        "created_at": session.createdAt.isoformat(),
        "constraint_version": session.constraintVersion,
        "developer": {
            "member_id": member.id if member else None,
            "email": member.email if member else "unknown",
            "name": member.name if member else None,
            "role": member.role if member else None,
        },
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "model_used": m.modelUsed,
                "input_tokens": m.inputTokens or 0,
                "output_tokens": m.outputTokens or 0,
                "created_at": m.createdAt.isoformat(),
            }
            for m in messages
        ]
    }
