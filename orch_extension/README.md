# orch_extension

VS Code extension for Orch. Brings your org's AI governance directly into your editor.

---

## Current Status

**Partially built.** The scaffold, config resolution, and status bar are functional. Silent background enforcement and right-click audit are in progress.

| Feature | Status |
|---|---|
| Extension scaffold + activation | ✅ Built |
| Status bar — active constraint profile | ✅ Built |
| Config resolution — reads `.orch/config` | ✅ Built |
| API client — connected to orch_core | ✅ Built |
| Auto-configure from GitHub identity | 🔄 In progress |
| Silent background constraint enforcement | 🔄 In progress |
| Right-click audit on any file | 🔄 In progress |

---

## What It Will Do (When Complete)

**Zero configuration for developers.** The extension reads the developer's Orch identity from their GitHub account. No API key to copy. No config file to edit.

- Opens a PR → Orch has already reviewed it via the GitHub Action
- Uses Copilot, Cursor, or any AI in VS Code → constraints applied in the background
- Right-clicks any file → "Audit with Orch" → findings appear as VS Code diagnostics
- Status bar shows active constraint profile at all times

**The developer never thinks about it. The CTO sees everything.**

---

## Setup (Current)

1. Install the extension from source (marketplace listing coming soon)
2. Create `.orch/config` in your workspace root:
```json
{
  "apiKey": "orch_xxx",
  "apiUrl": "https://your-orch-instance.com"
}
```
3. Status bar will show your active constraint profile

---

## Development

```bash
cd orch_extension
npm install
npm run compile
# Press F5 in VS Code to launch the extension in a debug window
```

---

## Planned Setup (Zero Config)

Once GitHub identity integration is complete, setup will be:

1. CTO sends invite link
2. Developer clicks link, signs in with GitHub
3. Installs extension from VS Code marketplace — one click
4. Done. Extension auto-configures from GitHub identity.

No API key. No config file. No `orch init`.
