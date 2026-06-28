from app.db.session import engine, Base
from app.db.models.user import User
from app.db.models.note import Note

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Done! Tables created successfully.")