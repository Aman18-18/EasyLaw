import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    return psycopg.connect(DATABASE_URL)


def create_tables():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            id SERIAL PRIMARY KEY,
            
            -- Personal Details
            full_name VARCHAR(255),
            date_of_birth VARCHAR(50),
            aadhar_last4 VARCHAR(4),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            pin_code VARCHAR(10),
            phone VARCHAR(15),
            email VARCHAR(255),
            
            -- Case Details
            case_type VARCHAR(255),
            incident_date VARCHAR(100),
            opposing_party VARCHAR(255),
            claim_amount VARCHAR(100),
            court_preference VARCHAR(255),
            case_description TEXT,

            -- FIR Details
            fir_number VARCHAR(100),
            fir_date VARCHAR(100),
            police_station VARCHAR(255),
            has_documents BOOLEAN DEFAULT FALSE,
            
            -- AI Extracted
            additional_entities JSONB,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Add FIR columns to existing cases table
    cursor.execute("""
        ALTER TABLE cases
        ADD COLUMN IF NOT EXISTS fir_number VARCHAR(100),
        ADD COLUMN IF NOT EXISTS fir_date VARCHAR(100),
        ADD COLUMN IF NOT EXISTS police_station VARCHAR(255),
        ADD COLUMN IF NOT EXISTS has_documents BOOLEAN DEFAULT FALSE
    """)

    conn.commit()
    cursor.close()
    conn.close()

    print("✅ Tables ready")