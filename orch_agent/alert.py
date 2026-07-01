import tkinter as tk
from tkinter import ttk, scrolledtext
from pathlib import Path
import httpx
from config import get_api_key, get_api_url

SEVERITY_COLORS = {
    "critical": "#ef4444",
    "warning":  "#f59e0b",
    "info":     "#3b82f6"
}



class AlertWindow:
    def __init__(self, filepath: str, review: dict):
        self.filepath = filepath
        self.review = review
        self.issues = review.get("issues", [])
        self.current = 0

        self.root = tk.Tk()
        self.root.title(f"Orch — {Path(filepath).name}")
        self.root.geometry("680x520")
        self.root.configure(bg="#0f172a")
        self.root.resizable(False, False)

        self._build()
        self._show_issue(0)

    def _build(self):
        # Header
        header = tk.Frame(self.root, bg="#1e293b", pady=10)
        header.pack(fill="x")

        tk.Label(
            header, text="Orch Code Review",
            font=("SF Pro Display", 14, "bold"),
            fg="#f8fafc", bg="#1e293b"
        ).pack(side="left", padx=16)

        self.counter_label = tk.Label(
            header, text="",
            font=("SF Pro Display", 11),
            fg="#94a3b8", bg="#1e293b"
        )
        self.counter_label.pack(side="right", padx=16)

        # File label
        tk.Label(
            self.root,
            text=f"File: {self.filepath}",
            font=("SF Mono", 10),
            fg="#64748b", bg="#0f172a", anchor="w"
        ).pack(fill="x", padx=16, pady=(10, 0))

        # Issue card
        self.card = tk.Frame(self.root, bg="#1e293b", padx=16, pady=14)
        self.card.pack(fill="both", expand=True, padx=16, pady=10)

        self.severity_label = tk.Label(
            self.card, text="", font=("SF Pro Display", 12, "bold"),
            bg="#1e293b", anchor="w"
        )
        self.severity_label.pack(fill="x")

        self.title_label = tk.Label(
            self.card, text="", font=("SF Pro Display", 13, "bold"),
            fg="#f8fafc", bg="#1e293b", anchor="w", wraplength=620
        )
        self.title_label.pack(fill="x", pady=(4, 0))

        self.detail_text = scrolledtext.ScrolledText(
            self.card, height=5, font=("SF Mono", 10),
            bg="#0f172a", fg="#cbd5e1", relief="flat",
            wrap="word", state="disabled"
        )
        self.detail_text.pack(fill="x", pady=(8, 0))

        self.fix_frame = tk.Frame(self.card, bg="#1e293b")
        self.fix_frame.pack(fill="x", pady=(8, 0))

        tk.Label(
            self.fix_frame, text="Suggested fix:",
            font=("SF Pro Display", 10, "bold"),
            fg="#94a3b8", bg="#1e293b"
        ).pack(anchor="w")

        self.fix_text = scrolledtext.ScrolledText(
            self.fix_frame, height=4, font=("SF Mono", 10),
            bg="#0f172a", fg="#4ade80", relief="flat",
            wrap="word", state="disabled"
        )
        self.fix_text.pack(fill="x", pady=(4, 0))

        # Constraint badge
        self.constraint_label = tk.Label(
            self.card, text="",
            font=("SF Mono", 9),
            fg="#64748b", bg="#1e293b", anchor="w"
        )
        self.constraint_label.pack(fill="x", pady=(8, 0))

        # Buttons
        btn_frame = tk.Frame(self.root, bg="#0f172a", pady=12)
        btn_frame.pack(fill="x", padx=16)

        tk.Button(
            btn_frame, text="← Prev",
            command=self._prev,
            bg="#1e293b", fg="#94a3b8",
            relief="flat", padx=12, pady=6,
            font=("SF Pro Display", 10)
        ).pack(side="left")

        tk.Button(
            btn_frame, text="Next →",
            command=self._next,
            bg="#1e293b", fg="#94a3b8",
            relief="flat", padx=12, pady=6,
            font=("SF Pro Display", 10)
        ).pack(side="left", padx=8)

        tk.Button(
            btn_frame, text="Dismiss All",
            command=self._dismiss_all,
            bg="#1e293b", fg="#ef4444",
            relief="flat", padx=12, pady=6,
            font=("SF Pro Display", 10)
        ).pack(side="right")

        tk.Button(
            btn_frame, text="Accept Fix",
            command=self._accept_fix,
            bg="#22c55e", fg="#0f172a",
            relief="flat", padx=16, pady=6,
            font=("SF Pro Display", 10, "bold")
        ).pack(side="right", padx=8)

    def _show_issue(self, index: int):
        if not self.issues:
            self.root.destroy()
            return

        issue = self.issues[index]
        severity = issue.get("severity", "info")
        color = SEVERITY_COLORS.get(severity, "#3b82f6")

        self.counter_label.config(text=f"{index + 1} of {len(self.issues)}")
        self.severity_label.config(
            text=f"{severity.upper()}  -  Line {issue.get('line') or '?'}",
            fg=color
        )
        self.title_label.config(text=issue.get("title", ""))

        self._set_text(self.detail_text, issue.get("detail", ""))

        fix = issue.get("suggested_fix")
        if fix:
            self.fix_frame.pack(fill="x", pady=(8, 0))
            self._set_text(self.fix_text, fix)
        else:
            self.fix_frame.pack_forget()

        self.constraint_label.config(
            text=f"Constraint: {issue.get('constraint_id', '')}"
        )

    def _set_text(self, widget, text: str):
        widget.config(state="normal")
        widget.delete("1.0", "end")
        widget.insert("1.0", text)
        widget.config(state="disabled")

    def _prev(self):
        if self.current > 0:
            self.current -= 1
            self._show_issue(self.current)

    def _next(self):
        if self.current < len(self.issues) - 1:
            self.current += 1
            self._show_issue(self.current)

    def _accept_fix(self):
        issue = self.issues[self.current]
        fix = issue.get("suggested_fix")
        if not fix:
            return
        line = issue.get("line")
        _apply_fix(self.filepath, line, fix)
        self.issues.pop(self.current)
        if not self.issues:
            self.root.destroy()
            return
        self.current = min(self.current, len(self.issues) - 1)
        self._show_issue(self.current)

    def _dismiss_all(self):
        _log_override_all(self.issues, self.review.get("domain_identified", "general"))
        self.root.destroy()

    def run(self):
        self.root.mainloop()


def _apply_fix(filepath: str, line: int | None, fix: str):
    """Apply the suggested fix to the file."""
    try:
        lines = Path(filepath).read_text(encoding="utf-8").splitlines(keepends=True)
        if line and 1 <= line <= len(lines):
            lines[line - 1] = fix + "\n"
        else:
            lines.append(f"\n# Orch suggested fix:\n{fix}\n")
        Path(filepath).write_text("".join(lines), encoding="utf-8")
    except Exception as e:
        print(f"[orch-agent] Could not apply fix: {e}")


def _log_override_all(issues: list[dict], domain: str):
    """Log all dismissed issues as overrides."""
    api_key = get_api_key()
    if not api_key:
        return
    try:
        import httpx, asyncio
        async def _post():
            async with httpx.AsyncClient(timeout=10.0) as client:
                for issue in issues:
                    await client.post(
                        f"{get_api_url()}/api/v1/health/override",
                        json={
                            "constraint_id": issue.get("constraint_id", domain),
                            "session_id": "agent",
                            "model_used": "agent",
                            "reason": f"Dismissed via agent: {issue.get('title', '')}"
                        },
                        headers={"Authorization": f"Bearer {api_key}"}
                    )
        asyncio.run(_post())
    except Exception:
        pass


def show_alert(filepath: str, review: dict):
    AlertWindow(filepath, review).run()
