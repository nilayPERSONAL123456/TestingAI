"""CSV Export, Engagement Letter PDF, and Full ZIP Export"""
import io
import csv
import zipfile
import json
import os
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib import colors
from app.database import get_db
from app.models.client import Client
from app.models.invoice import Invoice, InvoiceLine, Payment
from app.models.compliance import ComplianceInstance
from app.models.task import Task
from app.models.document import Document
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



# ==========================================
# ENGAGEMENT LETTER PDF GENERATION
# ==========================================

class EngagementLetterInput(BaseModel):
    client_id: str
    services: str | None = None
    fee_amount: float | None = None
    fee_frequency: str = "monthly"
    start_date: str | None = None
    custom_terms: str | None = None


def _get_firm_settings(db: Session) -> dict:
    """Get firm settings as a dict"""
    from app.routers.settings import FirmSetting
    settings = db.query(FirmSetting).all()
    return {s.key: s.value for s in settings}


@router.post("/engagement-letter/{client_id}")
def generate_engagement_letter(
    client_id: str,
    data: EngagementLetterInput = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate an Engagement Letter PDF for a client"""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    firm = _get_firm_settings(db)
    firm_name = firm.get("firm_name", "Your CA Firm")
    firm_address = firm.get("firm_address", "")
    firm_city = firm.get("firm_city", "")
    firm_state = firm.get("firm_state", "")
    firm_pan = firm.get("firm_pan", "")
    firm_gstin = firm.get("firm_gstin", "")
    firm_email = firm.get("firm_email", "")
    firm_phone = firm.get("firm_phone", "")

    today = date.today()
    start_date = data.start_date if data and data.start_date else today.strftime("%d-%m-%Y")
    services = data.services if data and data.services else (client.services or "Professional Services")
    fee_amount = data.fee_amount if data and data.fee_amount else 0
    fee_frequency = data.fee_frequency if data else "monthly"
    custom_terms = data.custom_terms if data and data.custom_terms else ""

    # Build PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1.5*cm, bottomMargin=1.5*cm, leftMargin=2*cm, rightMargin=2*cm)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='FirmName', fontSize=16, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=4))
    styles.add(ParagraphStyle(name='FirmInfo', fontSize=9, fontName='Helvetica', alignment=TA_CENTER, textColor=colors.grey, spaceAfter=2))
    styles.add(ParagraphStyle(name='LetterTitle', fontSize=13, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=20, spaceBefore=15))
    styles.add(ParagraphStyle(name='BodyText2', fontSize=10, fontName='Helvetica', alignment=TA_JUSTIFY, spaceAfter=8, leading=14))
    styles.add(ParagraphStyle(name='SectionHead', fontSize=11, fontName='Helvetica-Bold', spaceAfter=6, spaceBefore=12))
    styles.add(ParagraphStyle(name='RightAlign', fontSize=10, fontName='Helvetica', alignment=TA_RIGHT))

    elements = []

    # Firm Header
    elements.append(Paragraph(firm_name, styles['FirmName']))
    if firm_address:
        elements.append(Paragraph(f"{firm_address}, {firm_city}, {firm_state}", styles['FirmInfo']))
    info_parts = []
    if firm_pan:
        info_parts.append(f"PAN: {firm_pan}")
    if firm_gstin:
        info_parts.append(f"GSTIN: {firm_gstin}")
    if firm_email:
        info_parts.append(f"Email: {firm_email}")
    if firm_phone:
        info_parts.append(f"Phone: {firm_phone}")
    if info_parts:
        elements.append(Paragraph(" | ".join(info_parts), styles['FirmInfo']))

    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2563EB")))
    elements.append(Spacer(1, 10))

    # Date
    elements.append(Paragraph(f"Date: {today.strftime('%d %B %Y')}", styles['RightAlign']))
    elements.append(Spacer(1, 10))

    # Title
    elements.append(Paragraph("ENGAGEMENT LETTER", styles['LetterTitle']))

    # To
    elements.append(Paragraph(f"To,", styles['BodyText2']))
    elements.append(Paragraph(f"<b>{client.display_name}</b>", styles['BodyText2']))
    client_addr_parts = []
    if client.address:
        client_addr_parts.append(client.address)
    if client.city:
        client_addr_parts.append(client.city)
    if client.state:
        client_addr_parts.append(client.state)
    if client_addr_parts:
        elements.append(Paragraph(", ".join(client_addr_parts), styles['BodyText2']))
    if client.pan:
        elements.append(Paragraph(f"PAN: {client.pan}", styles['BodyText2']))
    if client.gstin:
        elements.append(Paragraph(f"GSTIN: {client.gstin}", styles['BodyText2']))

    elements.append(Spacer(1, 12))

    # Subject
    elements.append(Paragraph(f"<b>Subject: Engagement for Professional Services</b>", styles['BodyText2']))
    elements.append(Spacer(1, 8))

    # Dear
    elements.append(Paragraph(f"Dear Sir/Madam,", styles['BodyText2']))
    elements.append(Paragraph(
        f"We are pleased to confirm our engagement as your Chartered Accountant for providing the professional "
        f"services as detailed below. This letter sets out the terms and conditions under which we shall provide "
        f"our services to <b>{client.display_name}</b>.",
        styles['BodyText2']
    ))

    # Scope of Services
    elements.append(Paragraph("1. SCOPE OF SERVICES", styles['SectionHead']))
    elements.append(Paragraph(f"We shall provide the following services:", styles['BodyText2']))
    for svc in services.split(","):
        svc = svc.strip()
        if svc:
            elements.append(Paragraph(f"&bull; {svc}", styles['BodyText2']))

    # Fees
    elements.append(Paragraph("2. PROFESSIONAL FEES", styles['SectionHead']))
    if fee_amount and fee_amount > 0:
        elements.append(Paragraph(
            f"Our professional fees for the above services shall be <b>INR {fee_amount:,.2f}</b> "
            f"payable <b>{fee_frequency}</b>, plus applicable GST @ 18%.",
            styles['BodyText2']
        ))
    else:
        elements.append(Paragraph(
            "Our professional fees shall be as mutually agreed and communicated separately. "
            "GST @ 18% shall be charged additionally.",
            styles['BodyText2']
        ))

    # Period
    elements.append(Paragraph("3. PERIOD OF ENGAGEMENT", styles['SectionHead']))
    elements.append(Paragraph(
        f"This engagement shall commence from <b>{start_date}</b> and shall continue until terminated "
        f"by either party with 30 days written notice.",
        styles['BodyText2']
    ))

    # Responsibilities
    elements.append(Paragraph("4. CLIENT RESPONSIBILITIES", styles['SectionHead']))
    elements.append(Paragraph(
        "The client shall provide all necessary documents, data, and information in a timely manner. "
        "Any delay in providing information may result in delayed filings and the firm shall not be "
        "held responsible for penalties arising from such delays.",
        styles['BodyText2']
    ))

    # Confidentiality
    elements.append(Paragraph("5. CONFIDENTIALITY", styles['SectionHead']))
    elements.append(Paragraph(
        "We shall maintain strict confidentiality of all client information and documents. "
        "No information shall be disclosed to third parties without your prior written consent, "
        "except as required by law or regulatory authorities.",
        styles['BodyText2']
    ))

    # Limitation
    elements.append(Paragraph("6. LIMITATION OF LIABILITY", styles['SectionHead']))
    elements.append(Paragraph(
        "Our liability under this engagement shall be limited to the fees paid for the services "
        "giving rise to the claim. We shall not be liable for any consequential or indirect losses.",
        styles['BodyText2']
    ))

    # Custom terms
    if custom_terms:
        elements.append(Paragraph("7. ADDITIONAL TERMS", styles['SectionHead']))
        elements.append(Paragraph(custom_terms, styles['BodyText2']))

    # Acceptance
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(
        "Please sign and return a copy of this letter to indicate your acceptance of the terms and conditions.",
        styles['BodyText2']
    ))

    elements.append(Spacer(1, 25))
    elements.append(Paragraph(f"For <b>{firm_name}</b>", styles['BodyText2']))
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("________________________", styles['BodyText2']))
    elements.append(Paragraph("Authorized Signatory", styles['BodyText2']))

    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.grey))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("<b>ACCEPTANCE</b>", styles['SectionHead']))
    elements.append(Paragraph(
        f"I/We, on behalf of <b>{client.display_name}</b>, accept the above terms and conditions.",
        styles['BodyText2']
    ))
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Signature: ________________________    Date: _______________", styles['BodyText2']))
    elements.append(Paragraph(f"Name: ________________________", styles['BodyText2']))
    elements.append(Paragraph(f"Designation: ________________________", styles['BodyText2']))

    doc.build(elements)
    buffer.seek(0)

    filename = f"Engagement_Letter_{client.client_code}_{today.strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ==========================================
# FULL ZIP DATA EXPORT
# ==========================================

@router.get("/full-backup")
def full_data_export(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Export ALL firm data as a ZIP file containing CSVs + documents list"""

    # Check permission - only owner/partner
    if current_user.role not in ["owner", "partner"]:
        raise HTTPException(status_code=403, detail="Only owners/partners can perform full data export")

    zip_buffer = io.BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:

        # 1. Clients CSV
        clients = db.query(Client).order_by(Client.created_at.desc()).all()
        clients_csv = io.StringIO()
        w = csv.writer(clients_csv)
        w.writerow(["Code", "Name", "Entity Type", "PAN", "GSTIN", "CIN", "TAN", "Email", "Phone", "Address", "City", "State", "Pincode", "Risk Category", "Status", "Services", "Notes", "Created"])
        for c in clients:
            w.writerow([c.client_code, c.display_name, c.entity_type, c.pan or "", c.gstin or "", c.cin or "", c.tan or "", c.email or "", c.phone or "", c.address or "", c.city or "", c.state or "", c.pincode or "", c.risk_category, c.status, c.services or "", c.notes or "", str(c.created_at)[:19]])
        zf.writestr("clients.csv", clients_csv.getvalue())

        # 2. Invoices CSV
        invoices = db.query(Invoice).order_by(Invoice.invoice_date.desc()).all()
        inv_csv = io.StringIO()
        w = csv.writer(inv_csv)
        w.writerow(["Invoice #", "Client ID", "Date", "Due Date", "Place of Supply", "Sub Total", "CGST", "SGST", "IGST", "Total", "Balance Due", "Status", "Notes", "Terms", "Created"])
        for inv in invoices:
            w.writerow([inv.invoice_number, inv.client_id, str(inv.invoice_date), str(inv.due_date), inv.place_of_supply or "", inv.sub_total, inv.cgst, inv.sgst, inv.igst, inv.total, inv.balance_due, inv.status, inv.notes or "", inv.terms or "", str(inv.created_at)[:19]])
        zf.writestr("invoices.csv", inv_csv.getvalue())

        # 3. Invoice Lines CSV
        lines = db.query(InvoiceLine).all()
        lines_csv = io.StringIO()
        w = csv.writer(lines_csv)
        w.writerow(["Invoice ID", "Description", "HSN/SAC", "Quantity", "Rate", "Amount", "GST Rate"])
        for l in lines:
            w.writerow([l.invoice_id, l.description, l.hsn_sac, l.quantity, l.rate, l.amount, l.gst_rate])
        zf.writestr("invoice_lines.csv", lines_csv.getvalue())

        # 4. Payments CSV
        payments = db.query(Payment).all()
        pay_csv = io.StringIO()
        w = csv.writer(pay_csv)
        w.writerow(["Invoice ID", "Client ID", "Amount", "Payment Date", "Mode", "Reference", "Status", "Notes", "Created"])
        for p in payments:
            w.writerow([p.invoice_id, p.client_id, p.amount, str(p.payment_date), p.payment_mode, p.reference_number or "", p.status, p.notes or "", str(p.created_at)[:19]])
        zf.writestr("payments.csv", pay_csv.getvalue())

        # 5. Compliance CSV
        instances = db.query(ComplianceInstance).order_by(ComplianceInstance.due_date.asc()).all()
        comp_csv = io.StringIO()
        w = csv.writer(comp_csv)
        w.writerow(["Client ID", "Rule Code", "Rule Name", "Authority", "Period Start", "Period End", "Due Date", "Status", "Assigned To", "Filed At", "ARN", "Notes"])
        for c in instances:
            w.writerow([c.client_id, c.rule_code, c.rule_name, c.authority, str(c.period_start), str(c.period_end), str(c.due_date), c.status, c.assigned_to or "", str(c.filed_at or ""), c.arn or "", c.notes or ""])
        zf.writestr("compliance.csv", comp_csv.getvalue())

        # 6. Tasks CSV
        tasks = db.query(Task).order_by(Task.created_at.desc()).all()
        task_csv = io.StringIO()
        w = csv.writer(task_csv)
        w.writerow(["Title", "Description", "Client ID", "Type", "Priority", "Status", "Assigned To", "Due Date", "Completed At", "Created By", "Created"])
        for t in tasks:
            w.writerow([t.title, t.description or "", t.client_id or "", t.task_type, t.priority, t.status, t.assigned_to or "", str(t.due_date or ""), str(t.completed_at or ""), t.created_by or "", str(t.created_at)[:19]])
        zf.writestr("tasks.csv", task_csv.getvalue())

        # 7. Documents manifest (list, not actual files — files are on disk)
        documents = db.query(Document).order_by(Document.created_at.desc()).all()
        doc_csv = io.StringIO()
        w = csv.writer(doc_csv)
        w.writerow(["ID", "Client ID", "File Name", "File Type", "File Path", "Size (bytes)", "Category", "Financial Year", "Description", "Uploaded By", "Created"])
        for d in documents:
            w.writerow([d.id, d.client_id or "", d.file_name, d.file_type or "", d.file_path, d.file_size or 0, d.category or "", d.financial_year or "", d.description or "", d.uploaded_by or "", str(d.created_at)[:19]])
        zf.writestr("documents_manifest.csv", doc_csv.getvalue())

        # 8. Include actual uploaded documents if they exist
        upload_dir = "./uploads"
        if os.path.exists(upload_dir):
            for root, dirs, files in os.walk(upload_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, ".")
                    try:
                        zf.write(file_path, arcname)
                    except Exception:
                        pass  # Skip files that can't be read

        # 9. Firm settings JSON
        from app.routers.settings import FirmSetting
        settings = db.query(FirmSetting).all()
        settings_dict = {s.key: s.value for s in settings}
        zf.writestr("firm_settings.json", json.dumps(settings_dict, indent=2))

        # 10. Users CSV (no passwords)
        users = db.query(User).all()
        user_csv = io.StringIO()
        w = csv.writer(user_csv)
        w.writerow(["ID", "Email", "Full Name", "Role", "Branch", "Active", "Phone", "Created"])
        for u in users:
            w.writerow([u.id, u.email, u.full_name, u.role, u.branch, u.is_active, u.phone or "", str(u.created_at)[:19]])
        zf.writestr("team_members.csv", user_csv.getvalue())

        # 11. Export metadata
        metadata = {
            "export_date": datetime.utcnow().isoformat(),
            "exported_by": current_user.full_name,
            "exported_by_email": current_user.email,
            "total_clients": len(clients),
            "total_invoices": len(invoices),
            "total_compliance_items": len(instances),
            "total_tasks": len(tasks),
            "total_documents": len(documents),
            "total_payments": len(payments),
            "app_version": "2.0.0",
        }
        zf.writestr("export_metadata.json", json.dumps(metadata, indent=2))

    zip_buffer.seek(0)
    today_str = date.today().strftime("%Y%m%d")
    filename = f"PraxisCA_Full_Backup_{today_str}.zip"

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
