from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, clients, leads, compliance, tasks, invoices, dashboard

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PraxisCA - Practice Management for Chartered Accountants",
    description="Enterprise CRM & Practice Management Platform for CA Firms",
    version="1.0.0-mvp",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(clients.router)
app.include_router(leads.router)
app.include_router(compliance.router)
app.include_router(tasks.router)
app.include_router(invoices.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"app": "PraxisCA", "version": "1.0.0-mvp", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "healthy"}
