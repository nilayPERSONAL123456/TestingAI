import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer
from app.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, nullable=True, index=True)
    file_name = Column(String, nullable=False)
    file_type = Column(String, nullable=True)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    category = Column(String, nullable=True)
    financial_year = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    uploaded_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
