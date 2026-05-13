import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Date, Float
from app.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_number = Column(String, unique=True, nullable=False)
    client_id = Column(String, nullable=False, index=True)
    invoice_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    place_of_supply = Column(String, nullable=True)
    sub_total = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    taxable_value = Column(Float, default=0.0)
    cgst = Column(Float, default=0.0)
    sgst = Column(Float, default=0.0)
    igst = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    balance_due = Column(Float, default=0.0)
    status = Column(String, default="draft")
    notes = Column(Text, nullable=True)
    terms = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String, nullable=False, index=True)
    description = Column(String, nullable=False)
    hsn_sac = Column(String, default="9982")
    quantity = Column(Float, default=1.0)
    rate = Column(Float, default=0.0)
    amount = Column(Float, default=0.0)
    gst_rate = Column(Float, default=18.0)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id = Column(String, nullable=False, index=True)
    client_id = Column(String, nullable=False, index=True)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_mode = Column(String, default="upi")
    reference_number = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="completed")
    created_at = Column(DateTime, default=datetime.utcnow)
