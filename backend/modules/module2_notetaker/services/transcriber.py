import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def transcribe_audio(file_path: str, original_filename: str) -> dict:
    """
    Transcribes audio using Groq's Whisper API.
    Supports Hindi + English mixed speech (common in Indian legal meetings).
    Returns transcript text and segments with timestamps.
    """
    with open(file_path, "rb") as audio_file:
        transcription = client.audio.transcriptions.create(
            file=(original_filename, audio_file.read()),
            model="whisper-large-v3",
            language="hi",  # Hindi — also handles English mixed in
            response_format="verbose_json"
        )

    # Extract full transcript text
    transcript_text = transcription.text

    # Extract segments with timestamps if available
    segments = []
    if hasattr(transcription, 'segments') and transcription.segments:
        for seg in transcription.segments:
            segments.append({
                "start": seg.get("start", seg.start if hasattr(seg, 'start') else 0),
                "end": seg.get("end", seg.end if hasattr(seg, 'end') else 0),
                "text": seg.get("text", seg.text if hasattr(seg, 'text') else "")
            })

    return {
        "transcript": transcript_text,
        "segments": segments
    }
