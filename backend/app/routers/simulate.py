from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from ..database import get_db
from .. import models, schemas
from ..services.chunking_service import ChunkingService
from ..services.llm_service import LLMService

router = APIRouter(prefix="/simulate", tags=["Simulator Playground"])

# CRUD Personas
@router.get("/personas", response_model=List[schemas.PersonaResponse])
def get_personas(
    x_tenant_id: str = Header(..., description="Tenant Context ID"),
    db: Session = Depends(get_db)
):
    """
    List all custom prompts / personas saved for the active tenant.
    """
    personas = db.query(models.Persona).filter(models.Persona.tenant_id == x_tenant_id).all()
    # Default seed personas if none exist
    if not personas:
        default_personas = [
            models.Persona(
                tenant_id=x_tenant_id,
                name="Senior Medical Auditor",
                role="Medical Compliance Reviewer",
                system_instruction="You are a Senior Medical Auditor. Analyze clinical documentation carefully for compliance, billing accuracy, and medical necessity. Answer queries strictly based on evidence in the context chunks."
            ),
            models.Persona(
                tenant_id=x_tenant_id,
                name="Legal Researcher",
                role="Contract Auditor",
                system_instruction="You are a Legal Researcher. Interpret the clauses, warranties, liabilities, and agreements precisely. Cite page breaks and identify liability caps clearly."
            ),
            models.Persona(
                tenant_id=x_tenant_id,
                name="Software QA Engineer",
                role="Technical Document Auditor",
                system_instruction="You are a Software QA Engineer. Synthesize the requirements, error codes, and api specs. Detail edge cases and validation rules."
            )
        ]
        db.add_all(default_personas)
        db.commit()
        personas = db.query(models.Persona).filter(models.Persona.tenant_id == x_tenant_id).all()
    return personas

@router.post("/personas", response_model=schemas.PersonaResponse)
def create_persona(
    persona: schemas.PersonaCreate,
    x_tenant_id: str = Header(..., description="Tenant Context ID"),
    db: Session = Depends(get_db)
):
    """
    Create a new custom persona/role definition.
    """
    db_persona = models.Persona(
        tenant_id=x_tenant_id,
        name=persona.name,
        role=persona.role,
        system_instruction=persona.system_instruction
    )
    db.add(db_persona)
    db.commit()
    db.refresh(db_persona)
    return db_persona

@router.delete("/personas/{persona_id}")
def delete_persona(
    persona_id: str,
    x_tenant_id: str = Header(..., description="Tenant Context ID"),
    db: Session = Depends(get_db)
):
    """
    Deletes a custom persona.
    """
    p = db.query(models.Persona).filter(
        models.Persona.id == persona_id,
        models.Persona.tenant_id == x_tenant_id
    ).first()
    if not p:
        raise HTTPException(status_code=404, detail="Persona not found")
    db.delete(p)
    db.commit()
    return {"message": "Persona deleted successfully"}

# History logs
@router.get("/logs", response_model=List[schemas.GenerationLogResponse])
def get_simulation_logs(
    x_tenant_id: str = Header(..., description="Tenant Context ID"),
    db: Session = Depends(get_db)
):
    """
    Retrieve history of saved parameter runs for the tenant.
    """
    return db.query(models.GenerationLog).filter(
        models.GenerationLog.tenant_id == x_tenant_id
    ).order_by(models.GenerationLog.created_at.desc()).all()

# Run Side-by-Side Simulation
@router.post("", response_model=schemas.SimulationResponse)
def run_simulation(
    req: schemas.SimulationRequest,
    x_tenant_id: str = Header(..., description="Tenant Context ID"),
    db: Session = Depends(get_db)
):
    """
    Core simulation playground route. Performs double RAG search and double LLM invocation
    side-by-side with Config A and Config B, and saves the runs in history.
    """
    # 1. Fetch Tenant settings
    tenant = db.query(models.Tenant).filter(models.Tenant.id == x_tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant context not found")
    
    # 2. Fetch Document content
    doc = db.query(models.Document).filter(
        models.Document.id == req.document_id,
        models.Document.tenant_id == x_tenant_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    tenant_config = tenant.settings or {}

    # Run Config A Ingestion & Search
    chunks_a = ChunkingService.chunk_text(doc.content, req.config_a.chunk_size, req.config_a.chunk_overlap)
    # top_k matches the user's config top_k parameter
    matching_chunks_a = ChunkingService.find_relevant_chunks(req.query, chunks_a, top_k=min(req.config_a.top_k, 5))
    
    # Run Config B Ingestion & Search
    chunks_b = ChunkingService.chunk_text(doc.content, req.config_b.chunk_size, req.config_b.chunk_overlap)
    matching_chunks_b = ChunkingService.find_relevant_chunks(req.query, chunks_b, top_k=min(req.config_b.top_k, 5))

    # Formulate Context Prompts
    context_text_a = "\n\n".join([f"[Chunk {c['chunk_index']} (Score: {c['score']})]\n{c['content']}" for c in matching_chunks_a])
    prompt_a = f"You are reviewing the document: '{doc.name}'. Use the following context chunks to answer the user's query.\n\nContext:\n{context_text_a}\n\nQuery: {req.query}\n\nAnswer precisely based only on the context provided."

    context_text_b = "\n\n".join([f"[Chunk {c['chunk_index']} (Score: {c['score']})]\n{c['content']}" for c in matching_chunks_b])
    prompt_b = f"You are reviewing the document: '{doc.name}'. Use the following context chunks to answer the user's query.\n\nContext:\n{context_text_b}\n\nQuery: {req.query}\n\nAnswer precisely based only on the context provided."

    # Call LLMs Side-by-Side
    # Config A execution
    res_a = LLMService.execute_query(
        prompt=prompt_a,
        system_instruction=req.system_instruction,
        model=req.config_a.model,
        config=tenant_config,
        temperature=req.config_a.temperature,
        top_p=req.config_a.top_p,
        top_k=req.config_a.top_k
    )

    # Config B execution
    res_b = LLMService.execute_query(
        prompt=prompt_b,
        system_instruction=req.system_instruction,
        model=req.config_b.model,
        config=tenant_config,
        temperature=req.config_b.temperature,
        top_p=req.config_b.top_p,
        top_k=req.config_b.top_k
    )

    # 3. Log results to generation history
    log_a = models.GenerationLog(
        tenant_id=x_tenant_id,
        document_id=doc.id,
        persona_name=req.system_instruction[:50], # Label identifier
        model=req.config_a.model,
        parameters=req.config_a.dict(),
        query=req.query,
        response=res_a["response"],
        metrics={
            "generation_time_ms": res_a["generation_time_ms"],
            "token_count": res_a["token_count"],
            "matching_chunks": [c["chunk_index"] for c in matching_chunks_a]
        }
    )

    log_b = models.GenerationLog(
        tenant_id=x_tenant_id,
        document_id=doc.id,
        persona_name=req.system_instruction[:50],
        model=req.config_b.model,
        parameters=req.config_b.dict(),
        query=req.query,
        response=res_b["response"],
        metrics={
            "generation_time_ms": res_b["generation_time_ms"],
            "token_count": res_b["token_count"],
            "matching_chunks": [c["chunk_index"] for c in matching_chunks_b]
        }
    )

    db.add_all([log_a, log_b])
    db.commit()

    return {
        "query": req.query,
        "config_a_result": {
            "response": res_a["response"],
            "generation_time_ms": res_a["generation_time_ms"],
            "token_count": res_a["token_count"],
            "matching_chunks": matching_chunks_a
        },
        "config_b_result": {
            "response": res_b["response"],
            "generation_time_ms": res_b["generation_time_ms"],
            "token_count": res_b["token_count"],
            "matching_chunks": matching_chunks_b
        }
    }
