import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Text, Date, Float
from app.database import Base


class ClientRetainer(Base):
    __tablename__ = "client_retainers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, nullable=False, index=True)
    fee_amount = Column(Float, nullable=False)
    frequency = Column(String, default="monthly")  # monthly, quarterly, annually
    services_covered = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    auto_invoice = Column(String, default="yes")  # yes, no
    last_invoiced_date = Column(Date, nullable=True)
    status = Column(String, default="active")  # active, paused, ended
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
