# orch-cli

> Developer CLI for Orch — governance over all AI, regardless of source.

---

## Install

```bash
pip install orch-cli
```

Or from source:

```bash
cd orch_cli
pip install -e .
```

---

## Setup

```bash
orch login
# Enter your Orch API key (from your org's dashboard under Settings)
```

---

## Commands

```bash
orch ask "how do I implement JWT refresh tokens?"   # streaming prompt
orch ask "review this auth flow" --domain cyber     # explicit domain
orch chat                                            # interactive session
orch audit ./src/auth.py                            # review a file
orch models                                          # list approved models
orch status                                          # org and team info
orch health                                          # constraint health scores
orch whoami                                          # show current identity
```

---

## Using your own API key

```bash
orch ask "..." --model-key sk-your-openai-key
```

Your key is used for that request only and never stored.

---

## Environment variables

```bash
ORCH_API_URL=https://your-orch-instance.com  # default: http://127.0.0.1:8000
ORCH_API_KEY=orch_xxx                         # alternative to orch login
```

---

## License

MIT
