"""CSV Export functionality"""
import io
import csv
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.compliance import ComplianceInstance
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.get("/clients")
def export_clients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    clients = db.query(Client).order_by(Client.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Code", "Name", "Entity Type", "PAN", "GSTIN", "Email", "Phone", "City", "State", "Status", "Services", "Created"])
    for c in clients:
        writer.writerow([c.client_code, c.display_name, c.entity_type, c.pan or "", c.gstin or "", c.email or "", c.phone or "", c.city or "", c.state or "", c.status, c.services or "", str(c.created_at)[:10]])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=clients_export.csv"})


@router.get("/invoices")
def export_invoices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    invoices = db.query(Invoice).order_by(Invoice.invoice_date.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Invoice #", "Client ID", "Date", "Due Date", "Sub Total", "CGST", "SGST", "IGST", "Total", "Balance Due", "Status"])
    for inv in invoices:
        writer.writerow([inv.invoice_number, inv.client_id, str(inv.invoice_date), str(inv.due_date), inv.sub_total, inv.cgst, inv.sgst, inv.igst, inv.total, inv.balance_due, inv.status])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=invoices_export.csv"})


@router.get("/compliance")
def export_compliance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    instances = db.query(ComplianceInstance).order_by(ComplianceInstance.due_date.asc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Rule", "Authority", "Client ID", "Period Start", "Period End", "Due Date", "Status", "Filed At", "ARN"])
    for c in instances:
        writer.writerow([c.rule_name, c.authority, c.client_id, str(c.period_start), str(c.period_end), str(c.due_date), c.status, str(c.filed_at or ""), c.arn or ""])
    output.seek(0)
    return StreamingResponse(io.BytesIO(output.getvalue().encode()), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=compliance_export.csv"})
