from datetime import datetime, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.invoice import Invoice, InvoiceLine, Payment
from app.models.user import User
from app.utils.auth import get_current_user
import uuid

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])


class InvoiceLineInput(BaseModel):
    description: str
    hsn_sac: str = "9982"
    quantity: float = 1.0
    rate: float
    gst_rate: float = 18.0


class InvoiceCreate(BaseModel):
    client_id: str
    invoice_date: date
    due_date: date
    place_of_supply: str = "MH"
    lines: list[InvoiceLineInput]
    notes: str | None = None
    terms: str | None = None
    is_igst: bool = False


class PaymentCreate(BaseModel):
    amount: float
    payment_date: date
    payment_mode: str = "upi"
    reference_number: str | None = None
    notes: str | None = None


def generate_invoice_number(db: Session) -> str:
    today = date.today()
    fy = f"{today.year % 100}-{(today.year + 1) % 100}" if today.month >= 4 else f"{(today.year - 1) % 100}-{today.year % 100}"
    count = db.query(Invoice).count() + 1
    return f"INV/{fy}/{str(count).zfill(4)}"


@router.get("")
def list_invoices(client_id: Optional[str] = None, status: Optional[str] = None,
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Invoice)
    if client_id:
        query = query.filter(Invoice.client_id == client_id)
    if status:
        query = query.filter(Invoice.status == status)
    total = query.count()
    invoices = query.order_by(Invoice.invoice_date.desc()).offset(skip).limit(limit).all()
    return {"total": total, "invoices": invoices}


@router.post("")
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub_total = sum(l.quantity * l.rate for l in data.lines)
    taxable_value = sub_total
    total_cgst = total_sgst = total_igst = 0.0
    for line in data.lines:
        tax = line.quantity * line.rate * line.gst_rate / 100
        if data.is_igst:
            total_igst += tax
        else:
            total_cgst += tax / 2
            total_sgst += tax / 2
    total = taxable_value + total_cgst + total_sgst + total_igst
    invoice = Invoice(id=str(uuid.uuid4()), invoice_number=generate_invoice_number(db),
        client_id=data.client_id, invoice_date=data.invoice_date, due_date=data.due_date,
        place_of_supply=data.place_of_supply, sub_total=round(sub_total, 2),
        taxable_value=round(taxable_value, 2), cgst=round(total_cgst, 2), sgst=round(total_sgst, 2),
        igst=round(total_igst, 2), total=round(total, 2), balance_due=round(total, 2),
        notes=data.notes, terms=data.terms)
    db.add(invoice)
    db.flush()
    for line in data.lines:
        db.add(InvoiceLine(id=str(uuid.uuid4()), invoice_id=invoice.id, description=line.description,
            hsn_sac=line.hsn_sac, quantity=line.quantity, rate=line.rate,
            amount=round(line.quantity * line.rate, 2), gst_rate=line.gst_rate))
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}")
def get_invoice(invoice_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    lines = db.query(InvoiceLine).filter(InvoiceLine.invoice_id == invoice_id).all()
    payments = db.query(Payment).filter(Payment.invoice_id == invoice_id).all()
    return {"invoice": invoice, "lines": lines, "payments": payments}


@router.post("/{invoice_id}/issue")
def issue_invoice(invoice_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft invoices can be issued")
    invoice.status = "issued"
    invoice.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Invoice issued", "invoice_number": invoice.invoice_number}


@router.post("/{invoice_id}/payment")
def record_payment(invoice_id: str, data: PaymentCreate,
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    payment = Payment(id=str(uuid.uuid4()), invoice_id=invoice_id, client_id=invoice.client_id,
        amount=data.amount, payment_date=data.payment_date, payment_mode=data.payment_mode,
        reference_number=data.reference_number, notes=data.notes)
    db.add(payment)
    invoice.balance_due = max(0, round(invoice.balance_due - data.amount, 2))
    invoice.status = "paid" if invoice.balance_due <= 0 else "partially_paid"
    invoice.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Payment recorded", "balance_due": invoice.balance_due}
