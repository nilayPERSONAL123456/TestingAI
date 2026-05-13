from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.client import Client
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/clients", tags=["Clients"])


class ClientCreate(BaseModel):
    display_name: str
    entity_type: str
    pan: str | None = None
    gstin: str | None = None
    cin: str | None = None
    tan: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    risk_category: str = "low"
    services: str | None = None
    notes: str | None = None


class ClientUpdate(BaseModel):
    display_name: str | None = None
    entity_type: str | None = None
    pan: str | None = None
    gstin: str | None = None
    email: str | None = None
    phone: str | None = None
    city: str | None = None
    state: str | None = None
    status: str | None = None
    services: str | None = None


def generate_client_code(db: Session) -> str:
    count = db.query(Client).count()
    return f"CL-{str(count + 1).zfill(4)}"


@router.get("")
def list_clients(
    status: Optional[str] = None, search: Optional[str] = None,
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    query = db.query(Client)
    if status:
        query = query.filter(Client.status == status)
    if search:
        query = query.filter(Client.display_name.ilike(f"%{search}%") | Client.pan.ilike(f"%{search}%") | Client.gstin.ilike(f"%{search}%"))
    total = query.count()
    clients = query.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "clients": clients}


@router.post("")
def create_client(data: ClientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = Client(client_code=generate_client_code(db), display_name=data.display_name, entity_type=data.entity_type,
        pan=data.pan, gstin=data.gstin, cin=data.cin, tan=data.tan, email=data.email, phone=data.phone,
        address=data.address, city=data.city, state=data.state, pincode=data.pincode,
        risk_category=data.risk_category, services=data.services, notes=data.notes, relationship_manager=current_user.id)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}")
def get_client(client_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch("/{client_id}")
def update_client(client_id: str, data: ClientUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    client.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}")
def delete_client(client_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    db.delete(client)
    db.commit()
    return {"message": "Client deleted"}
