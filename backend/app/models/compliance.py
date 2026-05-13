import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Date, Integer, Boolean
from app.database import Base


class ComplianceRule(Base):
    __tablename__ = "compliance_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    authority = Column(String, nullable=False)
    frequency = Column(String, nullable=False)
    due_day = Column(Integer, nullable=True)
    month_offset = Column(Integer, default=1)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ComplianceInstance(Base):
    __tablename__ = "compliance_instances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, nullable=False, index=True)
    rule_id = Column(String, nullable=False, index=True)
    rule_code = Column(String, nullable=False)
    rule_name = Column(String, nullable=False)
    authority = Column(String, nullable=False)
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String, default="pending")
    assigned_to = Column(String, nullable=True)
    filed_at = Column(DateTime, nullable=True)
    arn = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
