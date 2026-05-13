import uuid
from datetime import datetime, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.database import get_db
from app.models.timesheet import TimeEntry
from app.models.invoice import Invoice
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/timesheet", tags=["Timesheet"])


class TimeEntryCreate(BaseModel):
    client_id: str | None = None
    task_id: str | None = None
    work_date: date
    hours: float
    description: str | None = None
    billable: str = "yes"


class TimeEntryUpdate(BaseModel):
    client_id: str | None = None
    task_id: str | None = None
    work_date: date | None = None
    hours: float | None = None
    description: str | None = None
    billable: str | None = None
    billed: str | None = None


@router.get("")
def list_time_entries(
    user_id: Optional[str] = None,
    client_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(TimeEntry)
    if user_id:
        query = query.filter(TimeEntry.user_id == user_id)
    if client_id:
        query = query.filter(TimeEntry.client_id == client_id)
    if date_from:
        query = query.filter(TimeEntry.work_date >= date_from)
    if date_to:
        query = query.filter(TimeEntry.work_date <= date_to)
    total = query.count()
    entries = query.order_by(TimeEntry.work_date.desc()).offset(skip).limit(limit).all()
    return {"total": total, "entries": entries}


@router.get("/summary")
def timesheet_summary(
    client_id: Optional[str] = None,
    period: str = Query("month", regex="^(week|month|quarter|year)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    if period == "week":
        start_date = today - timedelta(days=today.weekday())
    elif period == "month":
        start_date = today.replace(day=1)
    elif period == "quarter":
        quarter_month = ((today.month - 1) // 3) * 3 + 1
        start_date = today.replace(month=quarter_month, day=1)
    else:
        start_date = today.replace(month=1, day=1)

    query = db.query(
        TimeEntry.client_id,
        func.sum(TimeEntry.hours).label("total_hours"),
        func.count(TimeEntry.id).label("entry_count"),
    ).filter(TimeEntry.work_date >= start_date)

    if client_id:
        query = query.filter(TimeEntry.client_id == client_id)

    results = query.group_by(TimeEntry.client_id).all()

    summary = [
        {
            "client_id": row.client_id,
            "total_hours": row.total_hours,
            "entry_count": row.entry_count,
        }
        for row in results
    ]
    return {"period": period, "start_date": str(start_date), "summary": summary}


@router.get("/aging")
def receivables_aging(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    unpaid_invoices = (
        db.query(Invoice)
        .filter(Invoice.status.in_(["sent", "overdue", "partially_paid"]))
        .filter(Invoice.balance_due > 0)
        .all()
    )

    aging = {
        "0_30": {"count": 0, "total": 0.0, "invoices": []},
        "31_60": {"count": 0, "total": 0.0, "invoices": []},
        "61_90": {"count": 0, "total": 0.0, "invoices": []},
        "90_plus": {"count": 0, "total": 0.0, "invoices": []},
    }

    for inv in unpaid_invoices:
        days_overdue = (today - inv.due_date).days if inv.due_date else 0
        invoice_data = {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "client_id": inv.client_id,
            "due_date": str(inv.due_date),
            "balance_due": inv.balance_due,
            "days_overdue": days_overdue,
        }
        if days_overdue <= 30:
            aging["0_30"]["count"] += 1
            aging["0_30"]["total"] += inv.balance_due
            aging["0_30"]["invoices"].append(invoice_data)
        elif days_overdue <= 60:
            aging["31_60"]["count"] += 1
            aging["31_60"]["total"] += inv.balance_due
            aging["31_60"]["invoices"].append(invoice_data)
        elif days_overdue <= 90:
            aging["61_90"]["count"] += 1
            aging["61_90"]["total"] += inv.balance_due
            aging["61_90"]["invoices"].append(invoice_data)
        else:
            aging["90_plus"]["count"] += 1
            aging["90_plus"]["total"] += inv.balance_due
            aging["90_plus"]["invoices"].append(invoice_data)

    total_receivable = sum(bucket["total"] for bucket in aging.values())
    return {"total_receivable": total_receivable, "aging": aging}


@router.post("")
def create_time_entry(
    data: TimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = TimeEntry(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        client_id=data.client_id,
        task_id=data.task_id,
        work_date=data.work_date,
        hours=data.hours,
        description=data.description,
        billable=data.billable,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}")
def update_time_entry(
    entry_id: str,
    data: TimeEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    entry.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}")
def delete_time_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Time entry deleted"}
