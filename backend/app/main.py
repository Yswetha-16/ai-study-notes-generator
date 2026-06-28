from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api.auth import router as auth_router
from app.api.notes import router as notes_router  # make sure this exists

app = FastAPI(
    title="AI Study Notes Generator",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(notes_router)

# Static files (make sure folder exists)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Home page
@app.get("/")
def home():
    return FileResponse("static/index.html")