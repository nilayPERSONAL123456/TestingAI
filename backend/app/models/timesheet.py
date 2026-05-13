import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Text, Date, Float
from app.database import Base


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=True, index=True)
    task_id = Column(String, nullable=True)
    work_date = Column(Date, nullable=False)
    hours = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    billable = Column(String, default="yes")  # yes, no
    billed = Column(String, default="no")  # no, yes
    invoice_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
