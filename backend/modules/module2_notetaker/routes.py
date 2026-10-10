from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime
import json
import os
import tempfile

from .services.transcriber import transcribe_audio
from .services.classifier import classify_sentences
from database import get_connection
from core.notifier import manager

router = APIRouter()


@router.post("/notetaker/upload")
async def upload_meeting_audio(
    audio: UploadFile = File(...),
    case_id: int = Form(...)
):
    """
    Upload a meeting audio file for a specific case.
    1. Saves audio temporarily
    2. Transcribes using Groq Whisper
    3. Classifies sentences using Groq LLM
    4. Saves structured results to PostgreSQL
    5. Pushes WebSocket notification to dashboard
    """

    # Validate file type
    allowed_types = [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
        "audio/x-wav", "audio/m4a", "audio/mp4", "audio/x-m4a",
        "audio/ogg", "audio/webm", "video/webm", "audio/flac"
    ]

    # Also check by extension since MIME detection can be unreliable
    allowed_extensions = [".mp3", ".wav", ".m4a", ".ogg", ".webm", ".flac", ".mp4"]
    file_ext = os.path.splitext(audio.filename or "")[1].lower()

    if audio.content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {audio.content_type} ({file_ext}). Supported: MP3, WAV, M4A, OGG, WebM, FLAC"
        )

    # Verify case exists
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, full_name, case_type FROM cases WHERE id = %s", (case_id,))
        case_row = cursor.fetchone()
        cursor.close()
        conn.close()

        if not case_row:
            raise HTTPException(status_code=404, detail=f"Case #{case_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error verifying case: {str(e)}")

    # Save audio to temp file
    try:
        suffix = file_ext if file_ext else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await audio.read()
            tmp.write(content)
            tmp_path = tmp.name
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving audio file: {str(e)}")

    # Step 1: Transcribe
    try:
        transcription_result = transcribe_audio(tmp_path, audio.filename or "meeting.mp3")
        transcript = transcription_result["transcript"]
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

    # Step 2: Classify sentences
    try:
        classification_result = classify_sentences(transcript)
        summary = classification_result["summary"]
        classified = classification_result["classified"]
        grouped = classification_result["grouped"]
        stats = classification_result["stats"]
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")

    # Clean up temp file
    try:
        os.unlink(tmp_path)
    except Exception:
        pass

    # Step 3: Save to database
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Build action items list
        action_items = [
            {"text": item["sentence"], "confidence": item.get("confidence", 0.5), "status": "pending"}
            for item in grouped.get("ACTION_ITEM", [])
        ]

        # Build other structured lists
        decisions = [
            {"text": item["sentence"], "confidence": item.get("confidence", 0.5)}
            for item in grouped.get("DECISION", [])
        ]
        risk_flags = [
            {"text": item["sentence"], "confidence": item.get("confidence", 0.5), "severity": "medium"}
            for item in grouped.get("RISK_FLAG", [])
        ]
        dates_mentioned = [
            {"text": item["sentence"], "confidence": item.get("confidence", 0.5)}
            for item in grouped.get("DATE_MENTIONED", [])
        ]

        cursor.execute("""
            INSERT INTO meeting_notes (
                case_id, audio_filename, transcript, summary,
                classified_sentences, action_items, decisions,
                risk_flags, dates_mentioned, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            case_id,
            audio.filename or "meeting_audio",
            transcript,
            summary,
            json.dumps(classified),
            json.dumps(action_items),
            json.dumps(decisions),
            json.dumps(risk_flags),
            json.dumps(dates_mentioned),
            datetime.utcnow()
        ))

        row = cursor.fetchone()
        note_id = row[0]
        created_at = row[1]

        conn.commit()
        cursor.close()
        conn.close()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database save error: {str(e)}")

    # Step 4: Push WebSocket notification
    await manager.broadcast({
        "event": "NEW_MEETING_NOTE",
        "data": {
            "id": note_id,
            "case_id": case_id,
            "case_name": case_row[1] if case_row else "Unknown",
            "case_type": case_row[2] if case_row else "Unknown",
            "audio_filename": audio.filename,
            "summary": summary,
            "stats": stats,
            "created_at": str(created_at)
        }
    })

    return {
        "message": "Meeting notes processed successfully",
        "note_id": note_id,
        "case_id": case_id,
        "transcript": transcript,
        "summary": summary,
        "classified_sentences": classified,
        "action_items": action_items,
        "decisions": decisions,
        "risk_flags": risk_flags,
        "dates_mentioned": dates_mentioned,
        "stats": stats,
        "created_at": str(created_at)
    }


@router.get("/notetaker/notes/{case_id}")
def get_meeting_notes(case_id: int):
    """Get all meeting notes for a specific case."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, case_id, audio_filename, transcript, summary,
                   classified_sentences, action_items, decisions,
                   risk_flags, dates_mentioned, created_at
            FROM meeting_notes
            WHERE case_id = %s
            ORDER BY created_at DESC
        """, (case_id,))

        rows = cursor.fetchall()
        columns = [
            "id", "case_id", "audio_filename", "transcript", "summary",
            "classified_sentences", "action_items", "decisions",
            "risk_flags", "dates_mentioned", "created_at"
        ]

        notes = []
        for row in rows:
            note = dict(zip(columns, row))
            note["created_at"] = str(note["created_at"]) if note["created_at"] else None
            notes.append(note)

        cursor.close()
        conn.close()

        return {"notes": notes, "count": len(notes)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notetaker/all")
def get_all_meeting_notes():
    """Get all meeting notes across all cases with case info."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT mn.id, mn.case_id, mn.audio_filename, mn.summary,
                   mn.action_items, mn.risk_flags, mn.created_at,
                   c.full_name, c.case_type
            FROM meeting_notes mn
            LEFT JOIN cases c ON mn.case_id = c.id
            ORDER BY mn.created_at DESC
        """)

        rows = cursor.fetchall()
        columns = [
            "id", "case_id", "audio_filename", "summary",
            "action_items", "risk_flags", "created_at",
            "client_name", "case_type"
        ]

        notes = []
        for row in rows:
            note = dict(zip(columns, row))
            note["created_at"] = str(note["created_at"]) if note["created_at"] else None
            note["action_items_count"] = len(note["action_items"]) if note["action_items"] else 0
            note["risk_flags_count"] = len(note["risk_flags"]) if note["risk_flags"] else 0
            notes.append(note)

        cursor.close()
        conn.close()

        return {"notes": notes, "count": len(notes)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notetaker/note/{note_id}")
def get_single_note(note_id: int):
    """Get a single meeting note by ID with full details."""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT mn.id, mn.case_id, mn.audio_filename, mn.transcript, mn.summary,
                   mn.classified_sentences, mn.action_items, mn.decisions,
                   mn.risk_flags, mn.dates_mentioned, mn.created_at,
                   c.full_name, c.case_type
            FROM meeting_notes mn
            LEFT JOIN cases c ON mn.case_id = c.id
            WHERE mn.id = %s
        """, (note_id,))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Meeting note #{note_id} not found")

        columns = [
            "id", "case_id", "audio_filename", "transcript", "summary",
            "classified_sentences", "action_items", "decisions",
            "risk_flags", "dates_mentioned", "created_at",
            "client_name", "case_type"
        ]

        note = dict(zip(columns, row))
        note["created_at"] = str(note["created_at"]) if note["created_at"] else None

        cursor.close()
        conn.close()

        return {"note": note}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
