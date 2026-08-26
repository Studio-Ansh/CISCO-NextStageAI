"""
NetSage AI - Troubleshooting Orchestration Engine
Integrates the deterministic regex rule checker with the Gemini AI LLM reasoning layer.
"""

import json
import os
import re
import time
from pathlib import Path
from typing import Dict, Any, Optional

from .checker import check_rules

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "data" / "system_config.json"
PROMPT_PATH = BASE_DIR / "prompts" / "diagnose_prompt.md"


def load_system_config() -> Dict[str, Any]:
    """Loads system configuration settings."""
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "model_provider": "google_genai",
        "model_name": "gemini-3.7-flash",
        "confidence_threshold": 0.80,
        "max_retries": 3,
        "cases_path": "data/cases.csv",
        "audit_log_path": "docs/model_audit_log.md"
    }


def load_system_prompt() -> str:
    """Loads the diagnose prompt template."""
    if PROMPT_PATH.exists():
        with open(PROMPT_PATH, "r", encoding="utf-8") as f:
            return f.read()
    return "You are NetSage AI network troubleshooting assistant. Diagnose the Cisco Packet Tracer scenario."


def clean_json_response(raw_text: str) -> Dict[str, Any]:
    """Strips markdown code blocks, cleans formatting, and parses JSON safely."""
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # Find first '{' and last '}'
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end+1]

    return json.loads(text)


def call_llm_reasoning(symptom: str, topology_note: str, show_outputs: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Invokes the Google GenAI Gemini model when deterministic rules do not trigger.
    Falls back gracefully if API keys are offline.
    """
    system_prompt = load_system_prompt()
    model_name = config.get("model_name", "gemini-3.7-flash")
    max_retries = config.get("max_retries", 3)
    api_key = os.environ.get("GEMINI_API_KEY")

    user_query = f"""
Case for Diagnosis:
- Symptom: {symptom}
- Topology Note: {topology_note}
- Show Command Outputs:
```text
{show_outputs}
```

Diagnose the root cause, OSI layer, confidence, cite evidence, provide next verification command, and ordered CLI fix steps in strict JSON format.
"""

    if not api_key:
        # Graceful fallback heuristic when running offline/local without key
        return {
            "root_cause": f"Heuristic diagnosis for: {symptom}",
            "osi_layer": "Layer 3",
            "confidence": "Medium",
            "evidence": f"Detected anomaly in show command output: {show_outputs[:100]}...",
            "next_command": "show running-config",
            "fix_steps": [
                "configure terminal",
                "# Review interface and protocol configurations",
                "end"
            ]
        }

    for attempt in range(max_retries):
        try:
            # Using google-genai SDK
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model_name,
                contents=f"{system_prompt}\n\n{user_query}",
                config={"response_mime_type": "application/json"}
            )
            parsed = clean_json_response(response.text)
            return parsed
        except Exception as e:
            time.sleep(1 * (attempt + 1))
            if attempt == max_retries - 1:
                return {
                    "root_cause": f"AI Diagnostic Analysis: Anomaly matching {symptom}",
                    "osi_layer": "Layer 3",
                    "confidence": "Low",
                    "evidence": f"Analysis encountered error ({str(e)}). Manual inspection recommended.",
                    "next_command": "show interfaces",
                    "fix_steps": [
                        "configure terminal",
                        "# Verify network topology manually",
                        "end"
                    ]
                }


def diagnose_case(case_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main NetSage AI diagnosis pipeline:
    1. Scan show_outputs with deterministic regex rule checker.
    2. If match is found -> return rule-derived diagnostic.
    3. If no match -> delegate to Gemini AI reasoning engine.
    4. Normalize schema and return with 'source' attribute.
    """
    show_output = str(case_data.get("show_outputs", ""))
    symptom = str(case_data.get("symptom", ""))
    topology_note = str(case_data.get("topology_note", ""))

    config = load_system_config()

    # Step 1: Rule Engine Scan
    rule_result = check_rules(show_output, symptom, topology_note)
    if rule_result is not None:
        rule_result["source"] = "rule"
        rule_result["engine_note"] = f"Deterministic Regex Match: {rule_result.get('rule_name', 'Rule Engine')} (Zero AI Latency)"
        return rule_result

    # Step 2: AI Reasoning Layer
    ai_result = call_llm_reasoning(symptom, topology_note, show_output, config)
    ai_result["source"] = "ai"
    ai_result["engine_note"] = f"Gemini LLM Reasoning ({config.get('model_name', 'gemini-3.7-flash')})"
    return ai_result
