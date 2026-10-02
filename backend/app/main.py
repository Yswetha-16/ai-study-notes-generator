from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.api.auth import router as auth_router
from app.api.notes import router as notes_router
from app.api.admin import router as admin_router

app = FastAPI(
    title="AI Study Notes Generator",
    version="1.0.0"
)

# -----------------------------
# BASE DIRECTORY (IMPORTANT FIX)
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "../static")
STATIC_DIR = os.path.abspath(STATIC_DIR)

# -----------------------------
# CORS
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# ROUTERS
# -----------------------------
app.include_router(auth_router)
app.include_router(notes_router)
app.include_router(admin_router)

# -----------------------------
# STATIC FILE MOUNT
# -----------------------------
app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)

# -----------------------------
# HOME PAGE
# -----------------------------
@app.get("/")
def home():
    file_path = os.path.join(STATIC_DIR, "index.html")
    return FileResponse(file_path)

# -----------------------------
# EXAM PREPARATION PAGE
# -----------------------------
@app.get("/exam-preparation")
def exam_preparation():
    file_path = os.path.join(STATIC_DIR, "exam_preparation.html")
    return FileResponse(file_path)