import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Date
from app.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_code = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    pan = Column(String, nullable=True)
    gstin = Column(String, nullable=True)
    cin = Column(String, nullable=True)
    tan = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    date_of_incorporation = Column(Date, nullable=True)
    financial_year_end = Column(String, default="03-31")
    risk_category = Column(String, default="low")
    status = Column(String, default="active")
    relationship_manager = Column(String, nullable=True)
    services = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class ClientContact(Base):
    __tablename__ = "client_contacts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, nullable=False, index=True)
    name = Column(String, nullable=False)
    designation = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    is_primary = Column(String, default="no")
    created_at = Column(DateTime, default=datetime.utcnow)
