from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.lead import Lead, LeadActivity
from app.models.client import Client
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/leads", tags=["Leads"])


class LeadCreate(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    entity_type: str | None = None
    source: str = "manual"
    services_interested: str | None = None
    notes: str | None = None
    expected_value: str | None = None


class LeadUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    stage: str | None = None
    score: int | None = None
    assigned_to: str | None = None
    notes: str | None = None
    next_followup: datetime | None = None


@router.get("")
def list_leads(stage: Optional[str] = None, source: Optional[str] = None, search: Optional[str] = None,
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Lead)
    if stage:
        query = query.filter(Lead.stage == stage)
    if source:
        query = query.filter(Lead.source == source)
    if search:
        query = query.filter(Lead.name.ilike(f"%{search}%") | Lead.email.ilike(f"%{search}%"))
    total = query.count()
    leads = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "leads": leads}


@router.post("")
def create_lead(data: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = Lead(name=data.name, email=data.email, phone=data.phone, company=data.company,
        entity_type=data.entity_type, source=data.source, services_interested=data.services_interested,
        notes=data.notes, expected_value=data.expected_value, assigned_to=current_user.id)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/{lead_id}")
def update_lead(lead_id: str, data: LeadUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(lead, key, value)
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/convert")
def convert_lead(lead_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead.converted_client_id:
        raise HTTPException(status_code=400, detail="Lead already converted")
    count = db.query(Client).count()
    client = Client(client_code=f"CL-{str(count + 1).zfill(4)}", display_name=lead.company or lead.name,
        entity_type=lead.entity_type or "individual", email=lead.email, phone=lead.phone,
        services=lead.services_interested, relationship_manager=current_user.id)
    db.add(client)
    db.flush()
    lead.stage = "won"
    lead.converted_client_id = client.id
    lead.updated_at = datetime.utcnow()
    activity = LeadActivity(lead_id=lead.id, activity_type="stage_change",
        description=f"Converted to client {client.client_code}", performed_by=current_user.id)
    db.add(activity)
    db.commit()
    return {"message": "Lead converted to client", "client_id": client.id, "client_code": client.client_code}


@router.delete("/{lead_id}")
def delete_lead(lead_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"message": "Lead deleted"}
