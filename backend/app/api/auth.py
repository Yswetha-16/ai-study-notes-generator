from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.user import User
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token
)

router = APIRouter(prefix="/auth", tags=["auth"])

# Add any email you want to be auto-admin here (all lowercase).
ADMIN_EMAILS = {
    "admin@gmail.com",
    "admin01@gmail.com",
}


# ───── SCHEMAS ─────
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# ───── REGISTER ─────
@router.post("/register")
def register(user: RegisterRequest, db: Session = Depends(get_db)):

    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    is_admin = user.email.lower() in ADMIN_EMAILS

    new_user = User(
        username=user.username,
        email=user.email,
        password=hash_password(user.password),
        is_admin=is_admin,
        is_blocked=False
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


# ───── LOGIN (JWT VERSION) ─────
@router.post("/login")
def login(user: LoginRequest, db: Session = Depends(get_db)):

    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if db_user.is_blocked:
        raise HTTPException(
            status_code=403,
            detail="Your account has been blocked by admin"
        )

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Incorrect password")

    # fixed: promote existing accounts too, in case they registered
    # before their email was added to ADMIN_EMAILS
    if user.email.lower() in ADMIN_EMAILS and not db_user.is_admin:
        db_user.is_admin = True
        db.commit()
        db.refresh(db_user)

    token = create_access_token(
        data={
            "user_id": db_user.id,
            "is_admin": db_user.is_admin
        }
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "is_admin": db_user.is_admin
    }