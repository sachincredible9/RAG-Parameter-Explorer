from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from .. import models, schemas
from ..services.document_service import DocumentService
from ..services.chunking_service import ChunkingService

router = APIRouter(prefix="/documents", tags=["Document Management"])

@router.post("/chunk-preview", response_model=schemas.ChunkPreviewResponse)
def get_chunk_preview(
    content: str = Form(...),
    chunk_size: int = Form(1000),
    chunk_overlap: int = Form(200)
):
    """
    Stateless dry-run helper that returns a chunked view of a text block
    to show character offsets in the frontend visual chunking simulator.
    """
    chunks = ChunkingService.chunk_text(content, chunk_size, chunk_overlap)
    return {
        "total_chunks": len(chunks),
        "chunks": chunks
    }

@router.post("/upload", response_model=schemas.DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    x_tenant_id: str = Header(..., description="Tenant Context ID"),
    db: Session = Depends(get_db)
):
    """
    Uploads a document (PDF or TXT), extracts text content, and saves it.
    Also splits it into default chunks and saves them in the database.
    """
    # Verify Tenant
    tenant = db.query(models.Tenant).filter(models.Tenant.id == x_tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")

    # Read bytes
    file_bytes = await file.read()
    file_size = len(file_bytes)
    
    try:
        content = DocumentService.extract_text(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # 1. Save Document
    db_doc = models.Document(
        tenant_id=x_tenant_id,
        name=file.filename,
        content=content,
        file_type="PDF" if file.filename.lower().endswith(".pdf") else "TXT",
        size=file_size
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    # 2. Ingest Default Chunks (e.g. size 1000, overlap 200) for query fallback
    default_chunks = ChunkingService.chunk_text(content, chunk_size=1000, chunk_overlap=200)
    db_chunks = []
    for chunk in default_chunks:
        db_chunk = models.DocumentChunk(
            tenant_id=x_tenant_id,
            document_id=db_doc.id,
            chunk_index=chunk["chunk_index"],
            content=chunk["content"],
            embedding=None # Simulation mode
        )
        db_chunks.append(db_chunk)
    
    db.add_all(db_chunks)
    db.commit()

    return db_doc

@router.get("", response_model=List[schemas.DocumentResponse])
def list_documents(
    x_tenant_id: str = Header(..., description="Tenant Context ID"),
    db: Session = Depends(get_db)
):
    """
    List all documents belonging to the active tenant.
    """
    return db.query(models.Document).filter(models.Document.tenant_id == x_tenant_id).all()

@router.get("/{document_id}", response_model=schemas.DocumentDetailResponse)
def get_document_details(
    document_id: str,
    x_tenant_id: str = Header(..., description="Tenant Context ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve document text details.
    """
    doc = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.tenant_id == x_tenant_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/{document_id}")
def delete_document(
    document_id: str,
    x_tenant_id: str = Header(..., description="Tenant Context ID"),
    db: Session = Depends(get_db)
):
    """
    Deletes the document and cascades deletes to document chunks.
    """
    doc = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.tenant_id == x_tenant_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db.delete(doc)
    db.commit()
    return {"message": "Document and all chunks deleted successfully"}
