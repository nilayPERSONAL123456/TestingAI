from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.compliance import ComplianceRule, ComplianceInstance
from app.models.client import Client
from app.models.user import User
from app.utils.auth import get_current_user
import uuid
from dateutil.relativedelta import relativedelta

router = APIRouter(prefix="/api/compliance", tags=["Compliance"])

DEFAULT_RULES = [
    {"code": "GSTR1_M", "name": "GSTR-1 (Monthly)", "authority": "GST", "frequency": "monthly", "due_day": 11, "month_offset": 1},
    {"code": "GSTR3B_M", "name": "GSTR-3B (Monthly)", "authority": "GST", "frequency": "monthly", "due_day": 20, "month_offset": 1},
    {"code": "GSTR9", "name": "GSTR-9 Annual Return", "authority": "GST", "frequency": "yearly", "due_day": 31, "month_offset": 9},
    {"code": "TDS_24Q", "name": "TDS Return - 24Q (Salary)", "authority": "IT", "frequency": "quarterly", "due_day": 31, "month_offset": 1},
    {"code": "TDS_26Q", "name": "TDS Return - 26Q (Non-Salary)", "authority": "IT", "frequency": "quarterly", "due_day": 31, "month_offset": 1},
    {"code": "ITR_IND", "name": "ITR - Individual/HUF", "authority": "IT", "frequency": "yearly", "due_day": 31, "month_offset": 4},
    {"code": "ITR_AUDIT", "name": "ITR - Audit Cases", "authority": "IT", "frequency": "yearly", "due_day": 31, "month_offset": 7},
    {"code": "TAR_3CD", "name": "Tax Audit Report (3CD)", "authority": "IT", "frequency": "yearly", "due_day": 30, "month_offset": 6},
    {"code": "ROC_AOC4", "name": "ROC AOC-4 Filing", "authority": "ROC", "frequency": "yearly", "due_day": 30, "month_offset": 6},
    {"code": "ROC_MGT7", "name": "ROC MGT-7 Filing", "authority": "ROC", "frequency": "yearly", "due_day": 30, "month_offset": 7},
    {"code": "ROC_DIR3", "name": "DIR-3 KYC", "authority": "ROC", "frequency": "yearly", "due_day": 30, "month_offset": 6},
    {"code": "PF_ECR", "name": "PF ECR Filing", "authority": "PF", "frequency": "monthly", "due_day": 15, "month_offset": 1},
    {"code": "ESI", "name": "ESI Filing", "authority": "ESI", "frequency": "monthly", "due_day": 15, "month_offset": 1},
    {"code": "PT_M", "name": "Professional Tax", "authority": "PT", "frequency": "monthly", "due_day": 15, "month_offset": 1},
]


class ComplianceStatusUpdate(BaseModel):
    status: str
    assigned_to: str | None = None
    arn: str | None = None
    notes: str | None = None


@router.post("/seed-rules")
def seed_compliance_rules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    created = 0
    for rule_data in DEFAULT_RULES:
        existing = db.query(ComplianceRule).filter(ComplianceRule.code == rule_data["code"]).first()
        if not existing:
            rule = ComplianceRule(id=str(uuid.uuid4()), **rule_data)
            db.add(rule)
            created += 1
    db.commit()
    return {"message": f"Seeded {created} rules", "total_rules": len(DEFAULT_RULES)}


@router.get("/rules")
def list_rules(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rules = db.query(ComplianceRule).filter(ComplianceRule.is_active == True).all()
    return {"rules": rules}


@router.post("/generate/{client_id}")
def generate_compliance_calendar(client_id: str,
    rule_codes: Optional[str] = Query(None),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    today = date.today()
    fy_start = date(today.year, 4, 1) if today.month >= 4 else date(today.year - 1, 4, 1)
    fy_end = date(fy_start.year + 1, 3, 31)
    rules_query = db.query(ComplianceRule).filter(ComplianceRule.is_active == True)
    if rule_codes:
        rules_query = rules_query.filter(ComplianceRule.code.in_([c.strip() for c in rule_codes.split(",")]))
    rules = rules_query.all()
    created = 0
    for rule in rules:
        for period_start, period_end, due in _generate_periods(rule, fy_start, fy_end):
            existing = db.query(ComplianceInstance).filter(
                ComplianceInstance.client_id == client_id, ComplianceInstance.rule_id == rule.id,
                ComplianceInstance.period_start == period_start).first()
            if not existing:
                instance = ComplianceInstance(id=str(uuid.uuid4()), client_id=client_id, rule_id=rule.id,
                    rule_code=rule.code, rule_name=rule.name, authority=rule.authority,
                    period_start=period_start, period_end=period_end, due_date=due, assigned_to=current_user.id)
                db.add(instance)
                created += 1
    db.commit()
    return {"message": f"Generated {created} compliance instances for {client.display_name}"}


def _generate_periods(rule, fy_start, fy_end):
    periods = []
    if rule.frequency == "monthly":
        current = fy_start
        while current <= fy_end:
            period_end = (current + relativedelta(months=1)) - timedelta(days=1)
            due_month = current.month + rule.month_offset
            due_year = current.year + (due_month - 1) // 12
            due_month = (due_month - 1) % 12 + 1
            due = date(due_year, due_month, min(rule.due_day, 28))
            periods.append((current, period_end, due))
            current = current + relativedelta(months=1)
    elif rule.frequency == "quarterly":
        for i in range(4):
            q_start = fy_start + relativedelta(months=3 * i)
            q_end = q_start + relativedelta(months=3) - timedelta(days=1)
            if q_start <= fy_end:
                due_month = q_end.month + rule.month_offset
                due_year = q_end.year + (due_month - 1) // 12
                due_month = (due_month - 1) % 12 + 1
                due = date(due_year, due_month, min(rule.due_day, 28))
                periods.append((q_start, q_end, due))
    elif rule.frequency == "yearly":
        due_month = fy_start.month + rule.month_offset
        due_year = fy_start.year + (due_month - 1) // 12
        due_month = (due_month - 1) % 12 + 1
        due = date(due_year, due_month, min(rule.due_day, 28))
        periods.append((fy_start, fy_end, due))
    return periods


@router.get("/instances")
def list_compliance_instances(client_id: Optional[str] = None, status: Optional[str] = None,
    authority: Optional[str] = None, due_before: Optional[date] = None,
    skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(ComplianceInstance)
    if client_id:
        query = query.filter(ComplianceInstance.client_id == client_id)
    if status:
        query = query.filter(ComplianceInstance.status == status)
    if authority:
        query = query.filter(ComplianceInstance.authority == authority)
    if due_before:
        query = query.filter(ComplianceInstance.due_date <= due_before)
    total = query.count()
    instances = query.order_by(ComplianceInstance.due_date.asc()).offset(skip).limit(limit).all()
    return {"total": total, "instances": instances}


@router.patch("/instances/{instance_id}")
def update_compliance_instance(instance_id: str, data: ComplianceStatusUpdate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    instance = db.query(ComplianceInstance).filter(ComplianceInstance.id == instance_id).first()
    if not instance:
        raise HTTPException(status_code=404, detail="Instance not found")
    if data.status:
        instance.status = data.status
    if data.assigned_to:
        instance.assigned_to = data.assigned_to
    if data.arn:
        instance.arn = data.arn
    if data.notes:
        instance.notes = data.notes
    if data.status == "filed":
        instance.filed_at = datetime.utcnow()
    instance.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(instance)
    return instance
