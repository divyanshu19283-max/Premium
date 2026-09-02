import os

import requests

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")

# Optional Gemini API. The existing Ollama backend remains the fallback.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


SYSTEM_PROMPT = """
You are the AI assistant for an Intelligent Freight Forecasting &
Chartering Decision Support System.

Your job is to help users understand freight forecasts, chartering,
procurement optimization, what-if scenarios, vessel information,
fuel prices, risks, savings, and recommendations.

Important rules:
- Give clear, concise business explanations.
- Never invent numerical predictions.
- If actual system data is provided, use that data.
- If data is missing, clearly say what information is missing.
- Do not claim that you performed a forecast unless the forecasting
  system actually provided the result.
- Explain recommendations and risks in simple language.
"""


def ask_llama(message: str, context: str = "") -> str:
    """Use Gemini when GEMINI_API_KEY is configured, then the original
    Ollama backend, then the deterministic local fallback.

    The existing freight forecasting/decision backend is not replaced by
    Gemini; Gemini is only an optional natural-language assistant layer.
    """
    prompt = message

    if context:
        prompt = f"""
SYSTEM DATA:

{context}

USER QUESTION:

{message}
"""

    if GEMINI_API_KEY:
        try:
            return _ask_gemini(prompt)
        except Exception:
            # Keep the old backend available if Gemini is unavailable.
            pass

    return _ask_ollama(prompt)


def _ask_gemini(prompt: str) -> str:
    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
        },
    }

    response = requests.post(
        GEMINI_URL,
        params={"key": GEMINI_API_KEY},
        json=payload,
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()

    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned an empty response")

    return text


def _ask_ollama(prompt: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "stream": False,
    }

    try:
        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=120,
        )
        response.raise_for_status()

        data = response.json()
        return data["message"]["content"]

    except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
        return _local_fallback(prompt)
    except Exception:
        return _local_fallback(prompt)


def _local_fallback(message: str, context: str = "") -> str:
    """Deterministic offline assistant so the SIH demo never depends on an
    external LLM service. It does not fabricate forecast numbers."""
    text = message.strip().lower()
    if any(k in text for k in ("forecast", "rate", "price")):
        return (
            "I can explain the freight forecast workflow, but numerical rate "
            "predictions should come from the Forecast Intelligence module. "
            "Open Forecast and select the route, vessel and horizon to view "
            "the model-backed prediction and confidence interval."
        )
    if any(k in text for k in ("optimize", "charter", "contract", "procurement")):
        return (
            "The decision engine compares charter timing, forecast uncertainty, "
            "fuel cost and route economics. Use Optimization or Maritime Operations "
            "for the model-backed recommendation and risk breakdown."
        )
    if any(k in text for k in ("vessel", "port", "congestion", "voyage")):
        return (
            "Maritime Operations combines port feasibility, vessel constraints, "
            "congestion, voyage economics and freight forecasts into one auditable "
            "decision. The reference port and vessel data in this demo are clearly "
            "labelled as assumed/synthetic where applicable."
        )
    return (
        "I'm the freight decision-support assistant. I can explain forecasts, "
        "chartering, procurement optimization, vessel feasibility, congestion, "
        "voyage economics and risk. For numerical decisions, use the corresponding "
        "dashboard module so the answer is backed by the local model and dataset."
    )
