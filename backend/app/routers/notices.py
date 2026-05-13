import uuid
from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.notice import Notice, NoticeAction
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/notices", tags=["Notices"])


class NoticeCreate(BaseModel):
    client_id: str
    notice_type: str
    authority: str
    section: str | None = None
    reference_number: str | None = None
    subject: str
    description: str | None = None
    received_date: date
    response_due_date: date | None = None
    hearing_date: date | None = None
    priority: str = "high"
    assigned_to: str | None = None
    amount_demanded: str | None = None
    notes: str | None = None


class NoticeUpdate(BaseModel):
    notice_type: str | None = None
    authority: str | None = None
    section: str | None = None
    reference_number: str | None = None
    subject: str | None = None
    description: str | None = None
    response_due_date: date | None = None
    hearing_date: date | None = None
    status: str | None = None
    priority: str | None = None
    assigned_to: str | None = None
    amount_demanded: str | None = None
    amount_settled: str | None = None
    outcome: str | None = None
    notes: str | None = None


class NoticeActionCreate(BaseModel):
    action_type: str
    description: str | None = None
    action_date: date
    performed_by: str | None = None


@router.get("")
def list_notices(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    authority: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notice)
    if client_id:
        query = query.filter(Notice.client_id == client_id)
    if status:
        query = query.filter(Notice.status == status)
    if authority:
        query = query.filter(Notice.authority == authority)
    total = query.count()
    notices = query.order_by(Notice.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "notices": notices}


@router.post("")
def create_notice(
    data: NoticeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notice = Notice(
        id=str(uuid.uuid4()),
        client_id=data.client_id,
        notice_type=data.notice_type,
        authority=data.authority,
        section=data.section,
        reference_number=data.reference_number,
        subject=data.subject,
        description=data.description,
        received_date=data.received_date,
        response_due_date=data.response_due_date,
        hearing_date=data.hearing_date,
        priority=data.priority,
        assigned_to=data.assigned_to,
        amount_demanded=data.amount_demanded,
        notes=data.notes,
    )
    db.add(notice)
    db.commit()
    db.refresh(notice)
    return notice


@router.patch("/{notice_id}")
def update_notice(
    notice_id: str,
    data: NoticeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(notice, key, value)
    notice.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(notice)
    return notice


@router.delete("/{notice_id}")
def delete_notice(
    notice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    db.delete(notice)
    db.commit()
    return {"message": "Notice deleted"}


@router.post("/{notice_id}/actions")
def add_notice_action(
    notice_id: str,
    data: NoticeActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    action = NoticeAction(
        id=str(uuid.uuid4()),
        notice_id=notice_id,
        action_type=data.action_type,
        description=data.description,
        action_date=data.action_date,
        performed_by=data.performed_by or current_user.full_name,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


@router.get("/{notice_id}/actions")
def get_notice_actions(
    notice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notice = db.query(Notice).filter(Notice.id == notice_id).first()
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    actions = (
        db.query(NoticeAction)
        .filter(NoticeAction.notice_id == notice_id)
        .order_by(NoticeAction.action_date.desc())
        .all()
    )
    return {"total": len(actions), "actions": actions}
