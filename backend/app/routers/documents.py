"""Document upload and management"""
import uuid
import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.document import Document
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/documents", tags=["Documents"])

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get("")
def list_documents(client_id: Optional[str] = None, category: Optional[str] = None,
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Document)
    if client_id:
        query = query.filter(Document.client_id == client_id)
    if category:
        query = query.filter(Document.category == category)
    total = query.count()
    documents = query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "documents": documents}


@router.post("")
async def upload_document(
    file: UploadFile = File(...),
    client_id: str = Form(...),
    category: str = Form("other"),
    financial_year: str = Form(""),
    description: str = Form(""),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Create client folder
    client_dir = os.path.join(UPLOAD_DIR, client_id)
    os.makedirs(client_dir, exist_ok=True)

    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    file_id = str(uuid.uuid4())
    saved_name = f"{file_id}{file_ext}"
    file_path = os.path.join(client_dir, saved_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        id=file_id,
        client_id=client_id,
        file_name=file.filename,
        file_type=file_ext.lstrip("."),
        file_path=file_path,
        file_size=len(content),
        category=category,
        financial_year=financial_year or None,
        description=description or None,
        uploaded_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doc_id}")
def delete_document(doc_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    # Remove file from disk
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
