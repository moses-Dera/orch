"""
Model Registry
--------------
A reference list of current well-known models and their properties.
Used by the dashboard to auto-suggest values when an admin adds a model.

This is NOT a restriction — orgs can add any model not listed here.
Admins can override any value when adding a model.

Last updated: 2026 (sourced from OpenRouter live API)
"""

KNOWN_MODELS: list[dict] = [

    # --- OpenAI ---
    {"provider": "openai", "modelId": "openai/gpt-4.1",          "displayName": "GPT-4.1",           "contextWindow": 1_047_576},
    {"provider": "openai", "modelId": "openai/gpt-4.1-mini",     "displayName": "GPT-4.1 Mini",      "contextWindow": 1_047_576},
    {"provider": "openai", "modelId": "openai/gpt-4.1-nano",     "displayName": "GPT-4.1 Nano",      "contextWindow": 1_047_576},
    {"provider": "openai", "modelId": "openai/gpt-4o",           "displayName": "GPT-4o",            "contextWindow": 128_000},
    {"provider": "openai", "modelId": "openai/gpt-4o-mini",      "displayName": "GPT-4o Mini",       "contextWindow": 128_000},
    {"provider": "openai", "modelId": "openai/gpt-4-turbo",      "displayName": "GPT-4 Turbo",       "contextWindow": 128_000},
    {"provider": "openai", "modelId": "openai/gpt-4",            "displayName": "GPT-4",             "contextWindow": 8_191},
    {"provider": "openai", "modelId": "openai/gpt-3.5-turbo",    "displayName": "GPT-3.5 Turbo",     "contextWindow": 16_385},
    {"provider": "openai", "modelId": "openai/o1",               "displayName": "o1",                "contextWindow": 200_000},
    {"provider": "openai", "modelId": "openai/o1-pro",           "displayName": "o1 Pro",            "contextWindow": 200_000},
    {"provider": "openai", "modelId": "openai/o3",               "displayName": "o3",                "contextWindow": 200_000},
    {"provider": "openai", "modelId": "openai/o3-mini",          "displayName": "o3 Mini",           "contextWindow": 200_000},
    {"provider": "openai", "modelId": "openai/o3-pro",           "displayName": "o3 Pro",            "contextWindow": 200_000},
    {"provider": "openai", "modelId": "openai/o4-mini",          "displayName": "o4 Mini",           "contextWindow": 200_000},

    # --- Anthropic Claude 4 series ---
    {"provider": "anthropic", "modelId": "anthropic/claude-opus-4",          "displayName": "Claude Opus 4",          "contextWindow": 200_000},
    {"provider": "anthropic", "modelId": "anthropic/claude-opus-4.5",        "displayName": "Claude Opus 4.5",        "contextWindow": 200_000},
    {"provider": "anthropic", "modelId": "anthropic/claude-opus-4.6",        "displayName": "Claude Opus 4.6",        "contextWindow": 1_000_000},
    {"provider": "anthropic", "modelId": "anthropic/claude-opus-4.7",        "displayName": "Claude Opus 4.7",        "contextWindow": 1_000_000},
    {"provider": "anthropic", "modelId": "anthropic/claude-sonnet-4",        "displayName": "Claude Sonnet 4",        "contextWindow": 1_000_000},
    {"provider": "anthropic", "modelId": "anthropic/claude-sonnet-4.5",      "displayName": "Claude Sonnet 4.5",      "contextWindow": 1_000_000},
    {"provider": "anthropic", "modelId": "anthropic/claude-sonnet-4.6",      "displayName": "Claude Sonnet 4.6",      "contextWindow": 1_000_000},
    {"provider": "anthropic", "modelId": "anthropic/claude-haiku-4.5",       "displayName": "Claude Haiku 4.5",       "contextWindow": 200_000},

    # --- Anthropic Claude 3.x series ---
    {"provider": "anthropic", "modelId": "anthropic/claude-3.7-sonnet",      "displayName": "Claude 3.7 Sonnet",      "contextWindow": 200_000},
    {"provider": "anthropic", "modelId": "anthropic/claude-3.5-haiku",       "displayName": "Claude 3.5 Haiku",       "contextWindow": 200_000},
    {"provider": "anthropic", "modelId": "anthropic/claude-3-haiku",         "displayName": "Claude 3 Haiku",         "contextWindow": 200_000},

    # --- Google Gemini ---
    {"provider": "gemini", "modelId": "google/gemini-2.5-pro",          "displayName": "Gemini 2.5 Pro",          "contextWindow": 1_048_576},
    {"provider": "gemini", "modelId": "google/gemini-2.5-flash",        "displayName": "Gemini 2.5 Flash",        "contextWindow": 1_048_576},
    {"provider": "gemini", "modelId": "google/gemini-2.5-flash-lite",   "displayName": "Gemini 2.5 Flash Lite",   "contextWindow": 1_048_576},
    {"provider": "gemini", "modelId": "google/gemini-3.1-pro-preview",  "displayName": "Gemini 3.1 Pro Preview",  "contextWindow": 1_048_576},
    {"provider": "gemini", "modelId": "google/gemini-3.1-flash-lite-preview", "displayName": "Gemini 3.1 Flash Lite", "contextWindow": 1_048_576},
    {"provider": "gemini", "modelId": "google/gemini-2.0-flash-001",    "displayName": "Gemini 2.0 Flash",        "contextWindow": 1_000_000},

    # --- Meta Llama 4 series ---
    {"provider": "meta",   "modelId": "meta-llama/llama-4-maverick",    "displayName": "Llama 4 Maverick",        "contextWindow": 1_048_576},
    {"provider": "meta",   "modelId": "meta-llama/llama-4-scout",       "displayName": "Llama 4 Scout",           "contextWindow": 327_680},

    # --- Meta Llama 3.x series ---
    {"provider": "meta",   "modelId": "meta-llama/llama-3.3-70b-instruct", "displayName": "Llama 3.3 70B",        "contextWindow": 131_072},
    {"provider": "meta",   "modelId": "meta-llama/llama-3.1-70b-instruct", "displayName": "Llama 3.1 70B",        "contextWindow": 131_072},
    {"provider": "meta",   "modelId": "meta-llama/llama-3.1-8b-instruct",  "displayName": "Llama 3.1 8B",         "contextWindow": 16_384},

    # --- DeepSeek ---
    {"provider": "deepseek", "modelId": "deepseek/deepseek-v4-pro",       "displayName": "DeepSeek V4 Pro",       "contextWindow": 1_048_576},
    {"provider": "deepseek", "modelId": "deepseek/deepseek-v4-flash",     "displayName": "DeepSeek V4 Flash",     "contextWindow": 1_048_576},
    {"provider": "deepseek", "modelId": "deepseek/deepseek-r1-0528",      "displayName": "DeepSeek R1 (0528)",    "contextWindow": 163_840},
    {"provider": "deepseek", "modelId": "deepseek/deepseek-r1",           "displayName": "DeepSeek R1",           "contextWindow": 64_000},
    {"provider": "deepseek", "modelId": "deepseek/deepseek-chat-v3-0324", "displayName": "DeepSeek Chat V3",      "contextWindow": 163_840},

    # --- xAI Grok ---
    {"provider": "xai",    "modelId": "x-ai/grok-4",                    "displayName": "Grok 4",                  "contextWindow": 256_000},
    {"provider": "xai",    "modelId": "x-ai/grok-4-fast",               "displayName": "Grok 4 Fast",             "contextWindow": 2_000_000},
    {"provider": "xai",    "modelId": "x-ai/grok-3",                    "displayName": "Grok 3",                  "contextWindow": 131_072},
    {"provider": "xai",    "modelId": "x-ai/grok-3-mini",               "displayName": "Grok 3 Mini",             "contextWindow": 131_072},

    # --- Mistral ---
    {"provider": "mistral", "modelId": "mistralai/mistral-large-2512",   "displayName": "Mistral Large (2512)",   "contextWindow": 262_144},
    {"provider": "mistral", "modelId": "mistralai/mistral-medium-3",     "displayName": "Mistral Medium 3",       "contextWindow": 131_072},
    {"provider": "mistral", "modelId": "mistralai/devstral-2512",        "displayName": "Devstral (2512)",        "contextWindow": 262_144},
    {"provider": "mistral", "modelId": "mistralai/codestral-2508",       "displayName": "Codestral (2508)",       "contextWindow": 256_000},

    # --- Qwen ---
    {"provider": "qwen",   "modelId": "qwen/qwen3-235b-a22b-2507",      "displayName": "Qwen3 235B",              "contextWindow": 262_144},
    {"provider": "qwen",   "modelId": "qwen/qwen3-coder",               "displayName": "Qwen3 Coder",             "contextWindow": 262_144},
    {"provider": "qwen",   "modelId": "qwen/qwen3-32b",                 "displayName": "Qwen3 32B",               "contextWindow": 40_960},
    {"provider": "qwen",   "modelId": "qwen/qwen-plus",                 "displayName": "Qwen Plus",               "contextWindow": 1_000_000},

    # --- Cohere ---
    {"provider": "cohere", "modelId": "cohere/command-a",               "displayName": "Command A",               "contextWindow": 256_000},
    {"provider": "cohere", "modelId": "cohere/command-r-plus-08-2024",  "displayName": "Command R+",              "contextWindow": 128_000},
    {"provider": "cohere", "modelId": "cohere/command-r-08-2024",       "displayName": "Command R",               "contextWindow": 128_000},

    # --- Azure OpenAI (custom endpoint required) ---
    {"provider": "azure",  "modelId": "azure/gpt-4.1",                  "displayName": "Azure GPT-4.1",           "contextWindow": 1_047_576},
    {"provider": "azure",  "modelId": "azure/gpt-4o",                   "displayName": "Azure GPT-4o",            "contextWindow": 128_000},
    {"provider": "azure",  "modelId": "azure/gpt-4-turbo",              "displayName": "Azure GPT-4 Turbo",       "contextWindow": 128_000},

    # --- AWS Bedrock ---
    {"provider": "bedrock", "modelId": "bedrock/anthropic.claude-opus-4",          "displayName": "Bedrock Claude Opus 4",    "contextWindow": 200_000},
    {"provider": "bedrock", "modelId": "bedrock/anthropic.claude-sonnet-4",        "displayName": "Bedrock Claude Sonnet 4",  "contextWindow": 1_000_000},
    {"provider": "bedrock", "modelId": "bedrock/meta.llama4-maverick-17b-instruct-v1:0", "displayName": "Bedrock Llama 4 Maverick", "contextWindow": 1_048_576},
    {"provider": "bedrock", "modelId": "bedrock/amazon.nova-pro-v1:0",             "displayName": "Bedrock Amazon Nova Pro",  "contextWindow": 300_000},

    # --- Groq (fast inference) ---
    {"provider": "groq",   "modelId": "groq/llama-3.3-70b-versatile",   "displayName": "Groq Llama 3.3 70B",      "contextWindow": 128_000},
    {"provider": "groq",   "modelId": "groq/llama-4-maverick-17b-128e-instruct", "displayName": "Groq Llama 4 Maverick", "contextWindow": 131_072},
    {"provider": "groq",   "modelId": "groq/deepseek-r1-distill-llama-70b", "displayName": "Groq DeepSeek R1 70B", "contextWindow": 128_000},

    # --- Custom / Self-hosted (template entry) ---
    {"provider": "custom", "modelId": "custom/your-model-id",           "displayName": "Custom Self-Hosted Model", "contextWindow": 128_000},
]


def suggest(model_id: str) -> dict | None:
    """
    Returns suggested properties for a known model ID.
    Used by the dashboard to auto-fill fields when an admin adds a model.
    Returns None for unknown models — admin fills manually.
    """
    model_lower = model_id.lower().strip()
    for m in KNOWN_MODELS:
        if m["modelId"].lower() == model_lower:
            return m
    # Partial match fallback
    for m in KNOWN_MODELS:
        if model_lower in m["modelId"].lower():
            return m
    return None


def all_providers() -> list[str]:
    return sorted({m["provider"] for m in KNOWN_MODELS})
