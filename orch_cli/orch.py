import typer
import httpx
import json
import os
from pathlib import Path
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.table import Table
from rich.prompt import Prompt
from rich import box
from typing import Optional

app = typer.Typer(
    help="Orch - Bring your own AI. We make sure it follows your rules.",
    no_args_is_help=True,
    rich_markup_mode="rich"
)
console = Console()

CONFIG_PATH = Path.home() / ".orch" / "config.json"
API_URL = os.environ.get("ORCH_API_URL", "http://127.0.0.1:8000")


# --- Config ---

def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text()) if CONFIG_PATH.exists() else {}

def save_config(data: dict):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(data, indent=2))

def get_api_key() -> str:
    key = load_config().get("api_key") or os.environ.get("ORCH_API_KEY", "")
    if not key:
        console.print("[bold red]Not logged in.[/bold red] Run [bold cyan]orch login[/bold cyan] first.")
        raise typer.Exit(1)
    return key

def headers(model_key: str | None = None) -> dict:
    h = {"X-Orch-API-Key": get_api_key()}
    if model_key:
        h["X-Model-API-Key"] = model_key
    return h


# --- HTTP ---

def _post(
    prompt: str,
    domain: str = "auto",
    model: str = "auto",
    session_id: str | None = None,
    model_key: str | None = None,
    stream: bool = False
) -> dict | None:
    payload = {"user_prompt": prompt, "domain": domain, "model": model, "session_id": session_id}
    endpoint = "stream" if stream else ""
    url = f"{API_URL}/api/v1/orchestrate/{endpoint}" if stream else f"{API_URL}/api/v1/orchestrate"

    if stream:
        return _post_stream(url, payload, headers(model_key))

    try:
        with console.status("[bold green]Orch is thinking...[/bold green]"):
            r = httpx.post(url, json=payload, headers=headers(model_key), timeout=120.0)
        if r.status_code == 403:
            e = r.json()
            console.print(f"\n[bold red]Model not allowed:[/bold red] {e.get('message')}")
            console.print(f"[dim]Allowed: {', '.join(e.get('allowed_models', []))}[/dim]")
            return None
        if r.status_code == 400:
            e = r.json()
            console.print(f"\n[bold red]Security:[/bold red] {e.get('message')}")
            return None
        r.raise_for_status()
        return r.json()
    except httpx.ConnectError:
        console.print(f"[bold red]Cannot connect to Orch.[/bold red] Is the server running at {API_URL}?")
        console.print("[dim]Start it with: [bold]uvicorn main:app --reload[/bold][/dim]")
        return None
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        return None


def _post_stream(url: str, payload: dict, hdrs: dict) -> dict | None:
    """Handles SSE streaming and renders tokens as they arrive."""
    import json as _json
    meta = {}
    full_output = []
    try:
        with httpx.stream("POST", url, json=payload, headers=hdrs, timeout=120.0) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if not line.startswith("data: "):
                    continue
                raw = line[6:]
                if raw == "[DONE]":
                    break
                try:
                    event = _json.loads(raw)
                except Exception:
                    continue
                if event.get("type") == "meta":
                    meta = event
                    console.print(Panel(
                        f"[bold cyan]Domain:[/bold cyan] {event.get('domain')}   "
                        f"[bold cyan]Model:[/bold cyan] {event.get('model')}   "
                        f"[bold cyan]Session:[/bold cyan] [dim]{event.get('session_id')}[/dim]",
                        title="[bold]Orch[/bold]", border_style="cyan", expand=False
                    ))
                elif event.get("type") == "chunk":
                    content = event.get("content", "")
                    full_output.append(content)
                    console.print(content, end="", markup=False)
                elif event.get("type") == "error":
                    console.print(f"\n[bold red]Error:[/bold red] {event.get('message')}")
                    return None
        console.print()  # newline after streaming
        return {
            "domain_identified": meta.get("domain", ""),
            "model_executed": meta.get("model", ""),
            "session_id": meta.get("session_id", ""),
            "structured_output": "".join(full_output),
            "key_source": meta.get("key_source", "")
        }
    except httpx.ConnectError:
        console.print(f"[bold red]Cannot connect to Orch.[/bold red] Is the server running at {API_URL}?")
        return None
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        return None

def _get(path: str) -> dict | None:
    try:
        with console.status("[bold green]Fetching...[/bold green]"):
            r = httpx.get(f"{API_URL}{path}", headers=headers(), timeout=10.0)
        r.raise_for_status()
        return r.json()
    except httpx.ConnectError:
        console.print(f"[bold red]Cannot connect to Orch.[/bold red] Is the server running at {API_URL}?")
        return None
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        return None


# --- Display ---

def _show(data: dict, meta: bool = True):
    if meta:
        console.print(Panel(
            f"[bold cyan]Domain:[/bold cyan] {data['domain_identified']}   "
            f"[bold cyan]Model:[/bold cyan] {data['model_executed']}   "
            f"[bold cyan]Session:[/bold cyan] [dim]{data['session_id']}[/dim]   "
            f"[dim]{data.get('input_tokens', 0)} in / {data.get('output_tokens', 0)} out[/dim]",
            title="[bold]Orch[/bold]", border_style="cyan", expand=False
        ))
    console.print(Markdown(data["structured_output"]))


# --- Commands ---

@app.command()
def login(key: Optional[str] = typer.Option(None, "--key", "-k", help="Your Orch API key.")):
    """Log in to Orch."""
    if not key:
        key = Prompt.ask("[bold cyan]Enter your Orch API key[/bold cyan]", password=True)
    if not key.startswith("orch_"):
        console.print("[bold red]Invalid key.[/bold red] Orch keys start with [bold]orch_[/bold]")
        raise typer.Exit(1)
    cfg = load_config()
    cfg["api_key"] = key
    save_config(cfg)
    console.print("[bold green]Logged in.[/bold green] Key saved to ~/.orch/config.json")


@app.command()
def logout():
    """Remove your saved API key."""
    cfg = load_config()
    cfg.pop("api_key", None)
    save_config(cfg)
    console.print("[bold yellow]Logged out.[/bold yellow]")


@app.command()
def ask(
    prompt: str = typer.Argument(..., help="Your engineering question or code snippet."),
    domain: str = typer.Option("auto", "--domain", "-d", help="Domain: backend, cyber, blockchain, general, auto."),
    model: str = typer.Option("auto", "--model", "-m", help="Model ID or 'auto'."),
    session: Optional[str] = typer.Option(None, "--session", "-s", help="Session ID to continue."),
    model_key: Optional[str] = typer.Option(None, "--model-key", "-k", help="Your personal AI provider API key."),
    stream: bool = typer.Option(True, "--stream/--no-stream", help="Stream response tokens as they arrive."),
    no_meta: bool = typer.Option(False, "--no-meta", help="Hide meta panel.")
):
    """Ask Orch an engineering question."""
    data = _post(prompt, domain, model, session, model_key, stream=stream)
    if data:
        if not stream:
            _show(data, meta=not no_meta)
        if not session:
            console.print(f"\n[dim]Continue: [bold]orch ask \"...\" --session {data['session_id']}[/bold][/dim]")
        if data.get("key_source") == "developer_personal":
            console.print("[dim]Key source: your personal API key[/dim]")
        elif data.get("key_source") == "team_config":
            console.print("[dim]Key source: team shared key[/dim]")


@app.command()
def audit(
    file_path: str = typer.Argument(..., help="Path to the file to audit."),
    domain: str = typer.Option("auto", "--domain", "-d"),
    model: str = typer.Option("auto", "--model", "-m"),
    model_key: Optional[str] = typer.Option(None, "--model-key", "-k", help="Your personal AI provider API key.")
):
    """Audit a local file against your org's constraints."""
    from pathlib import Path as P
    p = P(file_path)
    if not p.exists():
        console.print(f"[bold red]File not found:[/bold red] {file_path}")
        raise typer.Exit(1)
    prompt = f"Perform a deep architectural and security audit. File: {p.name}\n\n```\n{p.read_text()}\n```"
    data = _post(prompt, domain, model, model_key=model_key)
    if data:
        _show(data)


@app.command()
def chat(
    domain: str = typer.Option("auto", "--domain", "-d"),
    model: str = typer.Option("auto", "--model", "-m"),
    session: Optional[str] = typer.Option(None, "--session", "-s", help="Resume a session."),
    model_key: Optional[str] = typer.Option(None, "--model-key", "-k", help="Your personal AI provider API key."),
    stream: bool = typer.Option(True, "--stream/--no-stream", help="Stream response tokens as they arrive.")
):
    """Start an interactive multi-turn chat session."""
    session_id = session
    console.print(Panel(
        "[bold cyan]Orch Chat[/bold cyan]\n"
        "[dim]Type your question. [bold]exit[/bold] to quit.[/dim]\n"
        "[dim]/domain <name>  /model <id>  to switch mid-session[/dim]",
        border_style="cyan", expand=False
    ))
    if session_id:
        console.print(f"[dim]Resuming session: {session_id}[/dim]\n")

    while True:
        try:
            user_input = Prompt.ask("[bold green]You[/bold green]")
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Session ended.[/dim]")
            break

        if user_input.lower() in ("exit", "quit", "/exit", "/quit"):
            console.print("[dim]Session ended.[/dim]")
            break
        if user_input.startswith("/domain "):
            domain = user_input.split(" ", 1)[1].strip()
            console.print(f"[dim]Domain: [bold]{domain}[/bold][/dim]")
            continue
        if user_input.startswith("/model "):
            model = user_input.split(" ", 1)[1].strip()
            console.print(f"[dim]Model: [bold]{model}[/bold][/dim]")
            continue
        if not user_input.strip():
            continue

        data = _post(user_input, domain, model, session_id, model_key, stream=stream)
        if data:
            session_id = data["session_id"]
            if not stream:
                console.print(f"\n[bold cyan]Orch[/bold cyan] [dim]({data['domain_identified']} / {data['model_executed']})[/dim]")
                console.print(Markdown(data["structured_output"]))
            console.print()


@app.command()
def models():
    """List approved AI models for your org."""
    data = _get("/api/v1/models")
    if not data:
        return
    t = Table(title=f"Models (Policy: {data['policy']})", box=box.ROUNDED, border_style="cyan")
    t.add_column("Model ID", style="bold")
    t.add_column("Name")
    t.add_column("Provider")
    for m in data.get("models", []):
        t.add_row(m["id"], m["name"], m["provider"])
    console.print(t) if data.get("models") else console.print("[dim]No models configured.[/dim]")


@app.command()
def status():
    """Show org, team, model policy, and constraint profiles."""
    data = _get("/api/v1/status")
    if not data:
        return
    console.print(Panel(
        f"[bold cyan]Org:[/bold cyan]           {data['org']}\n"
        f"[bold cyan]Team:[/bold cyan]          {data['team']}\n"
        f"[bold cyan]Model Policy:[/bold cyan]  {data['model_policy']}\n"
        f"[bold cyan]Enforced Model:[/bold cyan] {data.get('enforced_model') or '[dim]none[/dim]'}",
        title="[bold]Orch Status[/bold]", border_style="cyan", expand=False
    ))
    profiles = data.get("constraint_profiles", [])
    if profiles:
        t = Table(title="Constraint Profiles", box=box.ROUNDED, border_style="dim")
        t.add_column("ID", style="bold")
        t.add_column("Description")
        t.add_column("Version")
        for c in profiles:
            t.add_row(c["id"], c["description"], c["version"])
        console.print(t)


@app.command()
def override(
    constraint_id: str = typer.Argument(..., help="Constraint ID to override (e.g. backend, cyber)."),
    session: str = typer.Option(..., "--session", "-s", help="Session ID this override applies to."),
    model: str = typer.Option(..., "--model", "-m", help="Model used in this session."),
    reason: str = typer.Option(..., "--reason", "-r", help="Why you are overriding this constraint.")
):
    """Log a constraint override with your reason. Helps improve constraint quality."""
    data = None
    try:
        with console.status("[bold green]Logging override...[/bold green]"):
            r = httpx.post(
                f"{API_URL}/api/v1/health/override",
                json={"constraint_id": constraint_id, "session_id": session, "model_used": model, "reason": reason},
                headers=headers(),
                timeout=10.0
            )
            r.raise_for_status()
            data = r.json()
    except Exception as e:
        console.print(f"[bold red]Error:[/bold red] {e}")
        return
    console.print(f"[bold green]{data.get('message')}[/bold green]")


@app.command()
def health():
    """Show constraint health scores for your org."""
    data = _get("/api/v1/health/scores")
    if not data:
        return
    summary = data.get("summary", {})
    console.print(Panel(
        f"[bold cyan]Org:[/bold cyan] {data['org']}\n"
        f"[bold green]Healthy:[/bold green] {summary.get('healthy', 0)}   "
        f"[bold yellow]Warning:[/bold yellow] {summary.get('warning', 0)}   "
        f"[bold red]Critical:[/bold red] {summary.get('critical', 0)}",
        title="[bold]Constraint Health[/bold]", border_style="cyan", expand=False
    ))
    for s in data.get("scores", []):
        color = "green" if s["status"] == "healthy" else "yellow" if s["status"] == "warning" else "red"
        console.print(
            f"  [{color}]{s['constraint_id']}[/{color}] "
            f"score={s['health_score']:.0f} "
            f"override_rate={s['override_rate']:.1f}% "
            f"({s['total_overrides']}/{s['total_requests']} overrides)"
        )
        if s.get("recommendation"):
            console.print(f"    [dim]{s['recommendation']}[/dim]")


@app.command()
def whoami():
    """Show your current identity and server."""
    cfg = load_config()
    key = cfg.get("api_key", "")
    masked = f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "[not set]"
    console.print(Panel(
        f"[bold cyan]API Key:[/bold cyan] {masked}\n"
        f"[bold cyan]Server:[/bold cyan]  {API_URL}\n"
        f"[bold cyan]Config:[/bold cyan]  {CONFIG_PATH}",
        title="[bold]Orch Identity[/bold]", border_style="cyan", expand=False
    ))


if __name__ == "__main__":
    app()
