import uuid
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.dsc import DSCRecord
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/dsc", tags=["DSC"])


class DSCCreate(BaseModel):
    client_id: str
    holder_name: str
    holder_designation: str | None = None
    din_number: str | None = None
    pan: str | None = None
    issuing_authority: str | None = None
    certificate_type: str = "class3"
    token_type: str | None = None
    serial_number: str | None = None
    valid_from: date | None = None
    valid_until: date
    password_hint: str | None = None
    notes: str | None = None


class DSCUpdate(BaseModel):
    holder_name: str | None = None
    holder_designation: str | None = None
    din_number: str | None = None
    pan: str | None = None
    issuing_authority: str | None = None
    certificate_type: str | None = None
    token_type: str | None = None
    serial_number: str | None = None
    valid_from: date | None = None
    valid_until: date | None = None
    status: str | None = None
    password_hint: str | None = None
    notes: str | None = None


@router.get("")
def list_dsc(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(DSCRecord)
    if client_id:
        query = query.filter(DSCRecord.client_id == client_id)
    if status:
        query = query.filter(DSCRecord.status == status)
    total = query.count()
    records = query.order_by(DSCRecord.valid_until.asc()).offset(skip).limit(limit).all()
    return {"total": total, "records": records}


@router.get("/expiring")
def expiring_dsc(
    days: int = Query(60, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    cutoff_date = date.today() + timedelta(days=days)
    records = (
        db.query(DSCRecord)
        .filter(DSCRecord.status == "active")
        .filter(DSCRecord.valid_until <= cutoff_date)
        .filter(DSCRecord.valid_until >= date.today())
        .order_by(DSCRecord.valid_until.asc())
        .all()
    )
    return {"total": len(records), "records": records}


@router.post("")
def create_dsc(
    data: DSCCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = DSCRecord(
        id=str(uuid.uuid4()),
        client_id=data.client_id,
        holder_name=data.holder_name,
        holder_designation=data.holder_designation,
        din_number=data.din_number,
        pan=data.pan,
        issuing_authority=data.issuing_authority,
        certificate_type=data.certificate_type,
        token_type=data.token_type,
        serial_number=data.serial_number,
        valid_from=data.valid_from,
        valid_until=data.valid_until,
        password_hint=data.password_hint,
        notes=data.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.patch("/{record_id}")
def update_dsc(
    record_id: str,
    data: DSCUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(DSCRecord).filter(DSCRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="DSC record not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(record, key, value)
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)
    return record


@router.delete("/{record_id}")
def delete_dsc(
    record_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(DSCRecord).filter(DSCRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="DSC record not found")
    db.delete(record)
    db.commit()
    return {"message": "DSC record deleted"}
