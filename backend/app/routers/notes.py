"""Client activity notes and timeline"""
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, DateTime, Text
from pydantic import BaseModel
from app.database import get_db, Base
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/notes", tags=["Notes"])


# Inline model for notes
class ClientNote(Base):
    __tablename__ = "client_notes"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    note_type = Column(String, default="note")  # note, call, email, meeting, followup
    created_by = Column(String, nullable=True)
    created_by_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class NoteCreate(BaseModel):
    client_id: str
    content: str
    note_type: str = "note"


@router.get("")
def list_notes(client_id: str, skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(ClientNote).filter(ClientNote.client_id == client_id)
    total = query.count()
    notes = query.order_by(ClientNote.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "notes": notes}


@router.post("")
def create_note(data: NoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = ClientNote(
        id=str(uuid.uuid4()),
        client_id=data.client_id,
        content=data.content,
        note_type=data.note_type,
        created_by=current_user.id,
        created_by_name=current_user.full_name,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(note_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    note = db.query(ClientNote).filter(ClientNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}
