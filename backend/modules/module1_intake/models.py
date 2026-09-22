from pydantic import BaseModel
from typing import Optional


class IntakeFormInput(BaseModel):
    # Personal Details
    full_name: str
    date_of_birth: str
    aadhar_last4: str
    address: str
    city: str
    state: str
    pin_code: str
    phone: str
    email: Optional[str] = None

    # Case Details
    case_type: str
    incident_date: str
    opposing_party: Optional[str] = None
    claim_amount: Optional[str] = None
    court_preference: Optional[str] = None
    case_description: str

    # FIR & Documentation
    fir_number: Optional[str] = None
    fir_date: Optional[str] = None
    police_station: Optional[str] = None
    has_documents: Optional[bool] = False