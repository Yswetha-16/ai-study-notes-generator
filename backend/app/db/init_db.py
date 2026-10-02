from app.db.base import Base
from app.db.session import engine

from app.db.models.user import User
from app.db.models.note import Note

Base.metadata.create_all(bind=engine)

print("Database tables created successfully")