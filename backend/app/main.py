from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.database import engine, Base
from app.routers import auth, clients, leads, compliance, tasks, invoices, dashboard
from app.routers import notes, documents, export, settings
from app.routers import dsc, notices, timesheet, retainers, audit

# Import all models so tables are created
from app.models.audit_log import AuditLog
from app.models.dsc import DSCRecord
from app.models.notice import Notice, NoticeAction
from app.models.timesheet import TimeEntry
from app.models.retainer import ClientRetainer
from app.routers.notes import ClientNote
from app.routers.settings import FirmSetting

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PraxisCA - Practice Management for Chartered Accountants",
    description="Enterprise CRM & Practice Management Platform for CA Firms",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core routers
app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(leads.router)
app.include_router(compliance.router)
app.include_router(tasks.router)
app.include_router(invoices.router)
app.include_router(dashboard.router)

# Extended routers
app.include_router(notes.router)
app.include_router(documents.router)
app.include_router(export.router)
app.include_router(settings.router)
app.include_router(dsc.router)
app.include_router(notices.router)
app.include_router(timesheet.router)
app.include_router(retainers.router)
app.include_router(audit.router)

# Serve uploaded files
os.makedirs("./uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
def root():
    return {"app": "PraxisCA", "version": "2.0.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}
