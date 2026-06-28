from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models.note import Note
from app.services.ai_service import generate_notes, generate_flashcards

router = APIRouter(prefix="/notes", tags=["AI Notes"])

# Generate notes with caching
@router.post("/generate")
def generate(topic: str, level: str = "intermediate", style: str = "structured", db: Session = Depends(get_db)):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    try:
        # Check if notes already exist for this topic in DB (caching)
        existing = db.query(Note).filter(
            Note.topic == topic.lower().strip(),
            Note.level == level,
            Note.style == style
        ).first()

        if existing:
            # Return cached notes from DB — no API call needed!
            return {
                "id": existing.id,
                "topic": existing.topic,
                "notes": existing.content,
                "cached": True,
                "created_at": str(existing.created_at)
            }

        # Not in cache — call Gemini API
        content = generate_notes(topic, level, style)

        # Save to PostgreSQL for future use
        note = Note(
            topic=topic.lower().strip(),
            level=level,
            style=style,
            content=content
        )
        db.add(note)
        db.commit()
        db.refresh(note)

        return {
            "id": note.id,
            "topic": topic,
            "notes": content,
            "cached": False,
            "created_at": str(note.created_at)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Get all saved notes (history)
@router.get("/history")
def history(db: Session = Depends(get_db)):
    notes = db.query(Note).order_by(Note.created_at.desc()).all()
    return [
        {
            "id": n.id,
            "topic": n.topic,
            "level": n.level,
            "content": n.content,
            "created_at": str(n.created_at)
        }
        for n in notes
    ]

# Get single note by ID
@router.get("/history/{note_id}")
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return {
        "id": note.id,
        "topic": note.topic,
        "content": note.content,
        "created_at": str(note.created_at)
    }

# Generate flashcards
@router.post("/flashcards")
def flashcards(topic: str):
    if not topic:
        raise HTTPException(status_code=400, detail="Topic is required")
    try:
        cards = generate_flashcards(topic)
        return {"topic": topic, "flashcards": cards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))