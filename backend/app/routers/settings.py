"""Firm settings and team management"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, DateTime, Text
from pydantic import BaseModel
from app.database import get_db, Base
from app.models.user import User
from app.utils.auth import get_current_user, get_password_hash

router = APIRouter(prefix="/api/settings", tags=["Settings"])


# Firm settings model
class FirmSetting(Base):
    __tablename__ = "firm_settings"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


class SettingUpdate(BaseModel):
    firm_name: str | None = None
    firm_pan: str | None = None
    firm_gstin: str | None = None
    firm_address: str | None = None
    firm_city: str | None = None
    firm_state: str | None = None
    firm_phone: str | None = None
    firm_email: str | None = None
    invoice_prefix: str | None = None
    invoice_terms: str | None = None
    invoice_notes: str | None = None


class TeamMemberCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: str = "staff"
    phone: str | None = None


class TeamMemberUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    phone: str | None = None


@router.get("/firm")
def get_firm_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    settings = db.query(FirmSetting).all()
    return {s.key: s.value for s in settings}


@router.post("/firm")
def update_firm_settings(data: SettingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["owner", "partner"]:
        raise HTTPException(status_code=403, detail="Only owners/partners can update settings")
    for key, value in data.model_dump(exclude_unset=True).items():
        existing = db.query(FirmSetting).filter(FirmSetting.key == key).first()
        if existing:
            existing.value = value
            existing.updated_at = datetime.utcnow()
        else:
            db.add(FirmSetting(id=str(uuid.uuid4()), key=key, value=value))
    db.commit()
    return {"message": "Settings updated"}


# Team Management
@router.get("/team")
def list_team(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    users = db.query(User).order_by(User.created_at.asc()).all()
    return {"team": [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role, "branch": u.branch, "is_active": u.is_active, "phone": u.phone, "created_at": str(u.created_at)} for u in users]}


@router.post("/team")
def add_team_member(data: TeamMemberCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["owner", "partner", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email, full_name=data.full_name,
        hashed_password=get_password_hash(data.password),
        role=data.role, phone=data.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "email": user.email, "full_name": user.full_name, "role": user.role}


@router.patch("/team/{user_id}")
def update_team_member(user_id: str, data: TeamMemberUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["owner", "partner", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    user.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Team member updated"}


@router.delete("/team/{user_id}")
def remove_team_member(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ["owner", "partner"]:
        raise HTTPException(status_code=403, detail="Only owners/partners can remove members")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "Team member removed"}
