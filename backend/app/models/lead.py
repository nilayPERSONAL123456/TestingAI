import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer
from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    entity_type = Column(String, nullable=True)
    source = Column(String, default="manual")
    stage = Column(String, default="new")
    score = Column(Integer, default=0)
    services_interested = Column(Text, nullable=True)
    assigned_to = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    expected_value = Column(String, nullable=True)
    next_followup = Column(DateTime, nullable=True)
    converted_client_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeadActivity(Base):
    __tablename__ = "lead_activities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    lead_id = Column(String, nullable=False, index=True)
    activity_type = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    performed_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
