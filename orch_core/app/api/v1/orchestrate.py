from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.models.schemas import PromptRequest, OrchResponse
from app.core.pipeline import run_pipeline, run_pipeline_stream
from app.api.deps import get_team
from app.config import get_settings

router = APIRouter()
settings = get_settings()


@router.post("", response_model=OrchResponse, summary="Run the Orch pipeline")
async def orchestrate(request: PromptRequest, team=Depends(get_team)):
    return await run_pipeline(request, team)


@router.post(
    "/stream",
    summary="Run the Orch pipeline with streaming response",
    response_class=StreamingResponse
)
async def orchestrate_stream(request: PromptRequest, team=Depends(get_team)):
    """
    Streaming version of the orchestrate endpoint.
    Returns Server-Sent Events (SSE).

    Event types:
    - meta: session_id, domain, model info (sent first)
    - chunk: content fragment as it streams
    - error: if something goes wrong
    - [DONE]: signals end of stream

    Client usage:
        const es = new EventSource('/api/v1/orchestrate/stream');
        es.onmessage = (e) => {
            if (e.data === '[DONE]') return es.close();
            const event = JSON.parse(e.data);
            if (event.type === 'chunk') process(event.content);
        };
    """
    return StreamingResponse(
        run_pipeline_stream(request, team),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"  # disables nginx buffering
        }
    )


@router.post("/open", response_model=OrchResponse, include_in_schema=False)
async def orchestrate_open(request: PromptRequest):
    """No-auth endpoint for local development only."""
    if settings.is_production:
        from fastapi import HTTPException
        raise HTTPException(status_code=404)
    return await run_pipeline(request)
