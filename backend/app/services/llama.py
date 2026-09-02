import os
import requests

# Primary hosted LLM for production. Set GEMINI_API_KEY on Render.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

SYSTEM_PROMPT = """
You are the AI assistant for an Intelligent Freight Forecasting & Chartering Decision Support System (SIH 2026 PS 26006).
Help users understand freight forecasts, charter timing, procurement optimization, what-if scenarios, vessel information,
fuel prices, risks, savings, maritime operations and model results.

Rules:
- Give concise, professional business explanations.
- Use supplied system data when present and never invent numerical predictions.
- Clearly distinguish model outputs from assumptions/synthetic data.
- If a numerical forecast is not supplied, tell the user to use the Forecast module.
- Explain recommendations and risks in simple language.
"""


def _gemini(message: str, context: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")

    prompt = message
    if context:
        prompt = f"SYSTEM DATA:\n{context}\n\nUSER QUESTION:\n{message}"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 700},
    }
    response = requests.post(url, json=payload, timeout=45)
    response.raise_for_status()
    data = response.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("The LLM returned no answer.")
    parts = candidates[0].get("content", {}).get("parts", [])
    answer = "".join(str(p.get("text", "")) for p in parts).strip()
    if not answer:
        raise RuntimeError("The LLM returned an empty answer.")
    return answer


def _ollama(message: str, context: str) -> str:
    prompt = message if not context else f"SYSTEM DATA:\n{context}\n\nUSER QUESTION:\n{message}"
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "stream": False,
    }
    response = requests.post(OLLAMA_URL, json=payload, timeout=120)
    response.raise_for_status()
    return response.json()["message"]["content"]


def ask_llama(message: str, context: str = "") -> str:
    # Production: Gemini. Local development: Gemini when configured, otherwise Ollama.
    if GEMINI_API_KEY:
        try:
            return _gemini(message, context)
        except Exception:
            # Keep the service resilient; use the deterministic fallback below if both LLMs fail.
            pass

    try:
        return _ollama(message, context)
    except Exception:
        return _local_fallback(message, context)


def _local_fallback(message: str, context: str = "") -> str:
    text = message.strip().lower()
    if any(k in text for k in ("forecast", "rate", "price")):
        return "I can explain the freight forecast workflow, but numerical rate predictions should come from the Forecast Intelligence module."
    if any(k in text for k in ("optimize", "charter", "contract", "procurement")):
        return "The decision engine compares charter timing, forecast uncertainty, fuel cost and route economics. Use Optimization for the model-backed recommendation."
    if any(k in text for k in ("vessel", "port", "congestion", "voyage")):
        return "Maritime Operations combines port feasibility, vessel constraints, congestion, voyage economics and freight forecasts into one auditable decision."
    return "I’m the freight decision-support assistant. Ask me about forecasts, chartering, procurement optimization, vessel feasibility, congestion, voyage economics or risk."
