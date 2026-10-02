from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.db.base import Base

class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, index=True)
    content = Column(Text)
    level = Column(String, default="intermediate")
    style = Column(String, default="structured")
    created_at = Column(DateTime, default=datetime.utcnow)