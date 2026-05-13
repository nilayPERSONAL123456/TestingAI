from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.client import Client
from app.models.lead import Lead
from app.models.task import Task
from app.models.compliance import ComplianceInstance
from app.models.invoice import Invoice, Payment
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = date.today()
    seven_days = today + timedelta(days=7)
    total_clients = db.query(Client).filter(Client.status == "active").count()
    new_clients_month = db.query(Client).filter(func.strftime('%Y-%m', Client.created_at) == today.strftime('%Y-%m')).count()
    total_leads = db.query(Lead).filter(Lead.stage.notin_(["won", "lost"])).count()
    leads_this_month = db.query(Lead).filter(func.strftime('%Y-%m', Lead.created_at) == today.strftime('%Y-%m')).count()
    open_tasks = db.query(Task).filter(Task.status.in_(["open", "in_progress"])).count()
    overdue_tasks = db.query(Task).filter(Task.status.in_(["open", "in_progress"]), Task.due_date < datetime.utcnow()).count()
    pending_compliance = db.query(ComplianceInstance).filter(ComplianceInstance.status.in_(["pending", "in_progress", "awaiting_docs"])).count()
    overdue_compliance = db.query(ComplianceInstance).filter(ComplianceInstance.status.in_(["pending", "in_progress"]), ComplianceInstance.due_date < today).count()
    upcoming_deadlines = db.query(ComplianceInstance).filter(ComplianceInstance.status.in_(["pending", "in_progress"]), ComplianceInstance.due_date >= today, ComplianceInstance.due_date <= seven_days).count()
    filed_this_month = db.query(ComplianceInstance).filter(ComplianceInstance.status == "filed", func.strftime('%Y-%m', ComplianceInstance.filed_at) == today.strftime('%Y-%m')).count()
    total_billed = db.query(func.coalesce(func.sum(Invoice.total), 0)).filter(Invoice.status.notin_(["cancelled", "draft"])).scalar()
    outstanding = db.query(func.coalesce(func.sum(Invoice.balance_due), 0)).filter(Invoice.status.in_(["issued", "partially_paid", "overdue"])).scalar()
    collected = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == "completed").scalar()
    recent_tasks = db.query(Task).order_by(Task.created_at.desc()).limit(5).all()
    upcoming_compliance = db.query(ComplianceInstance).filter(ComplianceInstance.status.in_(["pending", "in_progress"]), ComplianceInstance.due_date >= today).order_by(ComplianceInstance.due_date.asc()).limit(10).all()
    return {
        "summary": {
            "total_clients": total_clients, "new_clients_month": new_clients_month,
            "active_leads": total_leads, "leads_this_month": leads_this_month,
            "open_tasks": open_tasks, "overdue_tasks": overdue_tasks,
            "pending_compliance": pending_compliance, "overdue_compliance": overdue_compliance,
            "upcoming_deadlines_7d": upcoming_deadlines, "filed_this_month": filed_this_month,
            "total_billed": float(total_billed), "outstanding": float(outstanding), "collected": float(collected),
        },
        "recent_tasks": [{"id": t.id, "title": t.title, "status": t.status, "priority": t.priority, "due_date": str(t.due_date) if t.due_date else None} for t in recent_tasks],
        "upcoming_compliance": [{"id": c.id, "rule_name": c.rule_name, "authority": c.authority, "due_date": str(c.due_date), "status": c.status, "client_id": c.client_id} for c in upcoming_compliance],
    }
