import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def extract_additional_entities(case_description: str) -> dict:
    prompt = f"""
You are a legal assistant for the Indian judicial system.

A client has described their legal case below. Extract any additional useful legal details 
that are NOT already captured in standard fields. Look for:
- Specific laws or sections mentioned (e.g. IPC 420, CrPC 138)
- Names of witnesses
- Property details
- Specific dates of events
- Any government document references
- Any other legally relevant details specific to Indian law

Return ONLY a valid JSON object with whatever relevant fields you find.
If nothing additional is found, return an empty JSON object {{}}.
Do not include explanation or markdown.

Case Description:
{case_description}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )

    result = response.choices[0].message.content.strip()

    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {}