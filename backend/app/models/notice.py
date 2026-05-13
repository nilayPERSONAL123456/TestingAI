import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, DateTime, Text, Date
from app.database import Base


class Notice(Base):
    __tablename__ = "notices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, nullable=False, index=True)
    notice_type = Column(String, nullable=False)  # it_notice, gst_notice, roc_notice, other
    authority = Column(String, nullable=False)  # IT, GST, ROC, PF, ESI
    section = Column(String, nullable=True)  # Section 143(1), 148, etc.
    reference_number = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    received_date = Column(Date, nullable=False)
    response_due_date = Column(Date, nullable=True)
    hearing_date = Column(Date, nullable=True)
    status = Column(String, default="received")  # received, in_progress, response_filed, hearing_done, closed, appeal
    priority = Column(String, default="high")  # low, medium, high, urgent
    assigned_to = Column(String, nullable=True)
    amount_demanded = Column(String, nullable=True)
    amount_settled = Column(String, nullable=True)
    outcome = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class NoticeAction(Base):
    __tablename__ = "notice_actions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    notice_id = Column(String, nullable=False, index=True)
    action_type = Column(String, nullable=False)  # response_filed, hearing_attended, adjournment, order_received, appeal_filed, document_submitted
    description = Column(Text, nullable=True)
    action_date = Column(Date, nullable=False)
    performed_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
