import uuid
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.retainer import ClientRetainer
from app.models.invoice import Invoice, InvoiceLine
from app.models.client import Client
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/retainers", tags=["Retainers"])


class RetainerCreate(BaseModel):
    client_id: str
    fee_amount: float
    frequency: str = "monthly"
    services_covered: str | None = None
    start_date: date
    end_date: date | None = None
    auto_invoice: str = "yes"
    notes: str | None = None


class RetainerUpdate(BaseModel):
    fee_amount: float | None = None
    frequency: str | None = None
    services_covered: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    auto_invoice: str | None = None
    status: str | None = None
    notes: str | None = None


def get_frequency_delta(frequency: str) -> relativedelta:
    if frequency == "monthly":
        return relativedelta(months=1)
    elif frequency == "quarterly":
        return relativedelta(months=3)
    elif frequency == "annually":
        return relativedelta(years=1)
    return relativedelta(months=1)


def generate_invoice_number(db: Session) -> str:
    count = db.query(Invoice).count()
    return f"INV-{str(count + 1).zfill(5)}"


@router.get("")
def list_retainers(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ClientRetainer)
    if client_id:
        query = query.filter(ClientRetainer.client_id == client_id)
    if status:
        query = query.filter(ClientRetainer.status == status)
    total = query.count()
    retainers = query.order_by(ClientRetainer.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "retainers": retainers}


@router.post("")
def create_retainer(
    data: RetainerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    retainer = ClientRetainer(
        id=str(uuid.uuid4()),
        client_id=data.client_id,
        fee_amount=data.fee_amount,
        frequency=data.frequency,
        services_covered=data.services_covered,
        start_date=data.start_date,
        end_date=data.end_date,
        auto_invoice=data.auto_invoice,
        notes=data.notes,
    )
    db.add(retainer)
    db.commit()
    db.refresh(retainer)
    return retainer


@router.patch("/{retainer_id}")
def update_retainer(
    retainer_id: str,
    data: RetainerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    retainer = db.query(ClientRetainer).filter(ClientRetainer.id == retainer_id).first()
    if not retainer:
        raise HTTPException(status_code=404, detail="Retainer not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(retainer, key, value)
    retainer.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(retainer)
    return retainer


@router.post("/generate-invoices")
def generate_retainer_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    active_retainers = (
        db.query(ClientRetainer)
        .filter(ClientRetainer.status == "active")
        .filter(ClientRetainer.auto_invoice == "yes")
        .all()
    )

    generated = []

    for retainer in active_retainers:
        frequency_delta = get_frequency_delta(retainer.frequency)
        last_invoiced = retainer.last_invoiced_date or retainer.start_date

        # Check if enough time has passed since last invoice
        next_invoice_date = last_invoiced + frequency_delta
        if next_invoice_date > today:
            continue

        # Check end_date
        if retainer.end_date and today > retainer.end_date:
            continue

        # Fetch client for invoice details
        client = db.query(Client).filter(Client.id == retainer.client_id).first()
        client_name = client.display_name if client else "Unknown"

        # Generate invoice
        invoice_id = str(uuid.uuid4())
        invoice_number = generate_invoice_number(db)
        due_date = today + relativedelta(days=15)

        taxable_value = retainer.fee_amount
        gst_rate = 18.0
        gst_amount = round(taxable_value * gst_rate / 100, 2)
        total = round(taxable_value + gst_amount, 2)

        invoice = Invoice(
            id=invoice_id,
            invoice_number=invoice_number,
            client_id=retainer.client_id,
            invoice_date=today,
            due_date=due_date,
            sub_total=retainer.fee_amount,
            taxable_value=taxable_value,
            cgst=round(gst_amount / 2, 2),
            sgst=round(gst_amount / 2, 2),
            total=total,
            balance_due=total,
            status="sent",
            notes=f"Auto-generated retainer invoice for {client_name}",
        )
        db.add(invoice)

        # Add invoice line
        line = InvoiceLine(
            id=str(uuid.uuid4()),
            invoice_id=invoice_id,
            description=retainer.services_covered or f"Professional services - {retainer.frequency} retainer",
            quantity=1.0,
            rate=retainer.fee_amount,
            amount=retainer.fee_amount,
            gst_rate=gst_rate,
        )
        db.add(line)

        # Update retainer last_invoiced_date
        retainer.last_invoiced_date = today
        retainer.updated_at = datetime.utcnow()

        generated.append({
            "retainer_id": retainer.id,
            "client_id": retainer.client_id,
            "client_name": client_name,
            "invoice_id": invoice_id,
            "invoice_number": invoice_number,
            "amount": total,
        })

    db.commit()
    return {"generated_count": len(generated), "invoices": generated}
