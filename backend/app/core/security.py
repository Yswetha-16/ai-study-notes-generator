from fastapi import HTTPException, Depends, Header
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from datetime import datetime, timedelta

from app.db.session import get_db
from app.db.models.user import User

SECRET_KEY = "mysecretkey123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ───── PASSWORD ─────
def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


# ───── TOKEN ─────
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# ───── GET CURRENT USER ─────
def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token missing")

    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")


# ───── ADMIN CHECK ─────
def get_current_admin(
    user: User = Depends(get_current_user)
):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only access")

    return user