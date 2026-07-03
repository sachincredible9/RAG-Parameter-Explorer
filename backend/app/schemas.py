from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Tenant Settings Schema
class TenantSettings(BaseModel):
    custom_llm_enabled: bool = False
    custom_llm_url: str = ""
    custom_llm_key: str = ""
    custom_llm_model: str = ""
    default_model: str = "gemini-1.5-flash"
    gemini_api_key: str = ""
    openai_api_key: str = ""

# Tenant Schemas
class TenantBase(BaseModel):
    name: str

class TenantCreate(TenantBase):
    settings: Optional[TenantSettings] = None

class TenantResponse(TenantBase):
    id: str
    created_at: datetime
    settings: Dict[str, Any]

    class Config:
        from_attributes = True

# Persona Schemas
class PersonaBase(BaseModel):
    name: str
    role: str
    system_instruction: str

class PersonaCreate(PersonaBase):
    pass

class PersonaResponse(PersonaBase):
    id: str
    tenant_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Document Schemas
class DocumentResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    file_type: str
    size: int
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    content: str

    class Config:
        from_attributes = True

# Chunk Preview Schema (For Visual Chunking Simulator)
class ChunkPreview(BaseModel):
    chunk_index: int
    content: str
    start_char: int
    end_char: int

class ChunkPreviewResponse(BaseModel):
    total_chunks: int
    chunks: List[ChunkPreview]

# Playground Configuration Schema
class RunConfig(BaseModel):
    model: str
    chunk_size: int = Field(default=1000, ge=100, le=5000)
    chunk_overlap: int = Field(default=200, ge=0, le=1000)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    top_k: int = Field(default=40, ge=1, le=100)

class SimulationRequest(BaseModel):
    document_id: str
    query: str
    system_instruction: str # Persona text
    config_a: RunConfig
    config_b: RunConfig

# Single Simulation Run Output
class SimulationRunResult(BaseModel):
    response: str
    generation_time_ms: int
    token_count: int
    matching_chunks: List[Dict[str, Any]] # Selected chunks with indices and score

class SimulationResponse(BaseModel):
    query: str
    config_a_result: SimulationRunResult
    config_b_result: SimulationRunResult

# Generation Log Schema
class GenerationLogResponse(BaseModel):
    id: str
    tenant_id: str
    document_id: Optional[str]
    persona_name: str
    model: str
    parameters: Dict[str, Any]
    query: str
    response: str
    metrics: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True
