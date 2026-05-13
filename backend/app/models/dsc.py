import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Text, Date, Boolean
from app.database import Base


class DSCRecord(Base):
    __tablename__ = "dsc_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, nullable=False, index=True)
    holder_name = Column(String, nullable=False)
    holder_designation = Column(String, nullable=True)
    din_number = Column(String, nullable=True)
    pan = Column(String, nullable=True)
    issuing_authority = Column(String, nullable=True)  # eMudhra, Sify, nCode, etc.
    certificate_type = Column(String, default="class3")  # class2, class3
    token_type = Column(String, nullable=True)  # USB token, cloud
    serial_number = Column(String, nullable=True)
    valid_from = Column(Date, nullable=True)
    valid_until = Column(Date, nullable=False)
    status = Column(String, default="active")  # active, expired, revoked
    password_hint = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
