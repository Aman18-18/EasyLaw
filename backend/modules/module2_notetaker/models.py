from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class ClassifiedSentence(BaseModel):
    sentence: str
    label: str  # ACTION_ITEM | DECISION | DATE_MENTIONED | RISK_FLAG | GENERAL
    confidence: Optional[float] = None


class NotetakerResponse(BaseModel):
    id: int
    case_id: int
    audio_filename: str
    transcript: str
    summary: str
    classified_sentences: List[ClassifiedSentence]
    action_items: List[Dict[str, Any]]
    decisions: List[Dict[str, Any]]
    risk_flags: List[Dict[str, Any]]
    dates_mentioned: List[Dict[str, Any]]
    created_at: str


class MeetingNoteListItem(BaseModel):
    id: int
    case_id: int
    audio_filename: str
    summary: str
    action_items_count: int
    risk_flags_count: int
    created_at: str
