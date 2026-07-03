from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/auth", tags=["Authentication & Tenants"])

@router.get("/tenants", response_model=List[schemas.TenantResponse])
def list_tenants(db: Session = Depends(get_db)):
    """
    Lists all available tenants. Used in the navbar dropdown for tenant switching.
    """
    tenants = db.query(models.Tenant).all()
    # If no tenants exist, seed them automatically
    if not tenants:
        default_tenants = [
            models.Tenant(
                id="da3b573a-23d2-432d-8959-1a73fa132f86",
                name="Acme Medical Auditors",
                settings={
                    "custom_llm_enabled": False,
                    "custom_llm_url": "",
                    "custom_llm_key": "",
                    "custom_llm_model": "",
                    "default_model": "mistral-7b-instruct-gguf",
                    "gemini_api_key": "",
                    "openai_api_key": ""
                }
            ),
            models.Tenant(
                id="f5b5c92c-6330-4e31-8f5b-1188339ab257",
                name="Lex Legal Research",
                settings={
                    "custom_llm_enabled": False,
                    "custom_llm_url": "",
                    "custom_llm_key": "",
                    "custom_llm_model": "",
                    "default_model": "mistral-7b-instruct-gguf",
                    "gemini_api_key": "",
                    "openai_api_key": ""
                }
            )
        ]
        db.add_all(default_tenants)
        db.commit()
        tenants = db.query(models.Tenant).all()
    return tenants

@router.post("/tenants", response_model=schemas.TenantResponse)
def create_tenant(tenant: schemas.TenantCreate, db: Session = Depends(get_db)):
    """
    Creates a new tenant.
    """
    db_tenant = models.Tenant(
        name=tenant.name,
        settings=tenant.settings.dict() if tenant.settings else {
            "custom_llm_enabled": False,
            "custom_llm_url": "",
            "custom_llm_key": "",
            "custom_llm_model": "",
            "default_model": "mistral-7b-instruct-gguf",
            "gemini_api_key": "",
            "openai_api_key": ""
        }
    )
    db.add(db_tenant)
    db.commit()
    db.refresh(db_tenant)
    return db_tenant

@router.put("/tenants/{tenant_id}/settings", response_model=schemas.TenantResponse)
def update_tenant_settings(
    tenant_id: str,
    settings: schemas.TenantSettings,
    db: Session = Depends(get_db)
):
    """
    Updates the settings (API keys, model preferences, custom endpoint details) for a tenant.
    """
    tenant = db.query(models.Tenant).filter(models.Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    tenant.settings = settings.dict()
    db.commit()
    db.refresh(tenant)
    return tenant
