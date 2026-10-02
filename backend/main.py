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

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(notes_router)
app.include_router(admin_router)

app.mount(
    "/static",
    StaticFiles(directory=STATIC_DIR),
    name="static"
)
           
@app.get("/")
def home():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))