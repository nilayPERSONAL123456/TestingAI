import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/audit", tags=["Audit"])


def log_action(
    db: Session,
    user: User,
    action: str,
    entity_type: str,
    entity_id: str,
    entity_name: str = None,
    details: str = None,
):
    """Helper function to create an audit log entry."""
    entry = AuditLog(
        id=str(uuid.uuid4()),
        user_id=user.id,
        user_name=user.full_name if hasattr(user, "full_name") else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        details=details,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("")
def list_audit_logs(
    entity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(AuditLog)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if action:
        query = query.filter(AuditLog.action == action)
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "logs": logs}


@router.get("/client/{client_id}")
def client_activity_timeline(
    client_id: str,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(AuditLog).filter(AuditLog.entity_id == client_id)
    # Also find logs where the entity_type relates to client actions
    from sqlalchemy import or_
    query = db.query(AuditLog).filter(
        or_(
            AuditLog.entity_id == client_id,
            AuditLog.details.ilike(f"%{client_id}%"),
        )
    )
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "client_id": client_id, "timeline": logs}
