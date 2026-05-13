import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=True)
    user_name = Column(String, nullable=True)
    action = Column(String, nullable=False)  # create, update, delete, login, export
    entity_type = Column(String, nullable=False)  # client, invoice, task, compliance, lead, document
    entity_id = Column(String, nullable=True)
    entity_name = Column(String, nullable=True)
    details = Column(Text, nullable=True)  # JSON string of changes
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
