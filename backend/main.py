from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from core.notifier import router as ws_router
from modules.module1_intake.routes import router as intake_router
from modules.module2_notetaker.routes import router as notetaker_router

app = FastAPI(title="EasyLaw Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    create_tables()


# routes
app.include_router(ws_router)
app.include_router(intake_router, prefix="/api/module1", tags=["Module 1 - Intake"])
app.include_router(notetaker_router, prefix="/api/module2", tags=["Module 2 - Notetaker"])


@app.get("/")
def root():
    return {"message": "EasyLaw backend is running ✅"}
