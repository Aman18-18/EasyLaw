from fastapi import APIRouter, HTTPException
from datetime import datetime
import json
from .models import IntakeFormInput
from .services.ner import extract_additional_entities
from database import get_connection
from core.notifier import manager

router = APIRouter()


@router.post("/intake")
async def submit_intake(form: IntakeFormInput):

    # Step 1 — Extract additional entities from description
    try:
        additional_entities = extract_additional_entities(form.case_description)
    except Exception as e:
        additional_entities = {}

    # Step 2 — Save to PostgreSQL
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO cases (
                full_name, date_of_birth, aadhar_last4,
                address, city, state, pin_code, phone, email,
                case_type, incident_date, opposing_party,
                claim_amount, court_preference, case_description,
                fir_number, fir_date, police_station, has_documents,
                additional_entities, created_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, created_at
        """, (
            form.full_name, form.date_of_birth, form.aadhar_last4,
            form.address, form.city, form.state, form.pin_code,
            form.phone, form.email,
            form.case_type, form.incident_date, form.opposing_party,
            form.claim_amount, form.court_preference, form.case_description,
            form.fir_number, form.fir_date, form.police_station, form.has_documents,
            json.dumps(additional_entities),
            datetime.utcnow()
        ))

        row = cursor.fetchone()
        case_id = row[0]
        created_at = row[1]

        conn.commit()
        cursor.close()
        conn.close()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # Step 3 — Push to dashboard
    await manager.broadcast({
        "event": "NEW_CASE",
        "data": {
            "id": case_id,
            "full_name": form.full_name,
            "case_type": form.case_type,
            "city": form.city,
            "state": form.state,
            "created_at": str(created_at)
        }
    })

    return {
        "message": "Case created successfully",
        "case_id": case_id,
        "additional_entities": additional_entities
    }


@router.get("/cases")
def get_all_cases():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM cases ORDER BY created_at DESC")
        rows = cursor.fetchall()

        columns = [
            "id", "full_name", "date_of_birth", "aadhar_last4",
            "address", "city", "state", "pin_code", "phone", "email",
            "case_type", "incident_date", "opposing_party",
            "claim_amount", "court_preference", "case_description",
            "additional_entities", "created_at",
            "fir_number", "fir_date", "police_station", "has_documents"
        ]
        cases = [dict(zip(columns, row)) for row in rows]

        cursor.close()
        conn.close()

        return {"cases": cases}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))