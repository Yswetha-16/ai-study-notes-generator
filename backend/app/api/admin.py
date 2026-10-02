from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.note import Note
from app.core.security import get_current_admin  # your real dependency — reused as-is

router = APIRouter(prefix="/admin", tags=["admin"])


# ==========================
# GET ALL USERS
# ==========================
@router.get("/users")
def get_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_admin": u.is_admin,
            "is_blocked": u.is_blocked,
        }
        for u in users
    ]


# ==========================
# DASHBOARD STATS
# ==========================
@router.get("/stats")
def stats(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return {
        "total_users": db.query(User).count(),
        "blocked_users": db.query(User).filter(User.is_blocked == True).count(),
        "active_users": db.query(User).filter(User.is_blocked == False).count(),
        "total_notes": db.query(Note).count()
    }


# ==========================
# BLOCK / UNBLOCK / DELETE USER
# ==========================
@router.put("/users/{user_id}/block")
def block_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_blocked = True
    db.commit()
    return {"message": "User blocked successfully"}


@router.put("/users/{user_id}/unblock")
def unblock_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_blocked = False
    db.commit()
    return {"message": "User unblocked successfully"}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


# ==========================
# NOTES
# ==========================
@router.get("/notes")
def get_notes(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    notes = db.query(Note).all()
    return [
        {
            "id": n.id,
            "topic": n.topic,
            "level": getattr(n, "level", ""),
            "created_at": str(getattr(n, "created_at", ""))
        }
        for n in notes
    ]


@router.delete("/notes/{note_id}")
def delete_note(note_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Note deleted successfully"}