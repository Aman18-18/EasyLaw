import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def classify_sentences(transcript: str) -> dict:
    """
    Classifies each sentence from a legal meeting transcript into categories:
    ACTION_ITEM, DECISION, DATE_MENTIONED, RISK_FLAG, GENERAL.

    Uses Groq LLM for intelligent classification with Indian legal context.
    Returns structured results grouped by label.
    """

    prompt = f"""You are an expert Indian legal meeting analyst. You are given a transcript of a legal meeting between a lawyer and their client (possibly in Hindi-English mixed speech).

Your task is to classify EVERY sentence into exactly ONE of these categories:
- ACTION_ITEM: Something that needs to be done (e.g., "file the petition by Monday", "collect the stamp papers", "prepare affidavit")
- DECISION: A decision or conclusion reached (e.g., "we will proceed with civil suit", "settlement amount agreed at 5 lakhs")
- DATE_MENTIONED: Any sentence mentioning a date, deadline, or timeline (e.g., "next hearing is on 15th March", "limitation period expires in 2 months")
- RISK_FLAG: Legally risky statement, potential liability, or warning (e.g., "if we miss the deadline we lose the case", "opposing counsel may challenge jurisdiction", "evidence may be inadmissible")
- GENERAL: General conversation, greetings, or context that doesn't fit above categories

Return a JSON object with this exact structure:
{{
    "summary": "A 3-4 sentence professional summary of the entire meeting in English",
    "classified": [
        {{"sentence": "...", "label": "ACTION_ITEM", "confidence": 0.95}},
        {{"sentence": "...", "label": "DECISION", "confidence": 0.88}},
        ...
    ]
}}

Rules:
1. Classify EVERY sentence — do not skip any
2. Confidence score should be between 0.0 and 1.0
3. Be accurate — mislabeling an ACTION_ITEM as GENERAL could cause the lawyer to miss a task
4. Consider Indian legal context (IPC/BNS sections, court procedures, Indian terminology)
5. The summary should be in formal English regardless of the transcript language
6. Return ONLY valid JSON — no markdown, no explanation

Transcript:
{transcript}"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=4096
        )
    except Exception:
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=4096
        )

    result = response.choices[0].message.content.strip()

    # Clean up any markdown code blocks if the model wraps JSON
    if result.startswith("```"):
        result = re.sub(r'^```(?:json)?\s*', '', result)
        result = re.sub(r'\s*```$', '', result)

    try:
        parsed = json.loads(result)
    except json.JSONDecodeError:
        # Fallback: try to extract JSON from the response
        json_match = re.search(r'\{[\s\S]*\}', result)
        if json_match:
            try:
                parsed = json.loads(json_match.group())
            except json.JSONDecodeError:
                parsed = {
                    "summary": "Unable to parse meeting summary. Please review the transcript manually.",
                    "classified": []
                }
        else:
            parsed = {
                "summary": "Unable to parse meeting summary. Please review the transcript manually.",
                "classified": []
            }

    # Ensure required keys exist
    if "summary" not in parsed:
        parsed["summary"] = "Meeting summary unavailable."
    if "classified" not in parsed:
        parsed["classified"] = []

    # Group by label for structured output
    grouped = {
        "ACTION_ITEM": [],
        "DECISION": [],
        "DATE_MENTIONED": [],
        "RISK_FLAG": [],
        "GENERAL": []
    }

    for item in parsed["classified"]:
        label = item.get("label", "GENERAL")
        if label not in grouped:
            label = "GENERAL"
        grouped[label].append({
            "sentence": item.get("sentence", ""),
            "confidence": item.get("confidence", 0.5)
        })

    return {
        "summary": parsed["summary"],
        "classified": parsed["classified"],
        "grouped": grouped,
        "stats": {
            "total_sentences": len(parsed["classified"]),
            "action_items": len(grouped["ACTION_ITEM"]),
            "decisions": len(grouped["DECISION"]),
            "dates_mentioned": len(grouped["DATE_MENTIONED"]),
            "risk_flags": len(grouped["RISK_FLAG"]),
            "general": len(grouped["GENERAL"])
        }
    }
