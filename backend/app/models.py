import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .database import Base

# Helpers to support SQLite UUID representation as strings
def generate_uuid():
    return str(uuid.uuid4())

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    settings = Column(JSON, nullable=False, default=dict)

    documents = relationship("Document", back_populates="tenant", cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="tenant", cascade="all, delete-orphan")
    generation_logs = relationship("GenerationLog", back_populates="tenant", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    file_type = Column(String(50), nullable=False)
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    generation_logs = relationship("GenerationLog", back_populates="document")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True) # Stored as JSON list for SQLite & PostgreSQL compatibility

    tenant = relationship("Tenant", back_populates="chunks")
    document = relationship("Document", back_populates="chunks")

class GenerationLog(Base):
    __tablename__ = "generation_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    persona_name = Column(String(255), nullable=False)
    model = Column(String(255), nullable=False)
    parameters = Column(JSON, nullable=False)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    metrics = Column(JSON, nullable=False) # e.g., {"generation_time_ms": 230, "token_count": 450}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tenant = relationship("Tenant", back_populates="generation_logs")
    document = relationship("Document", back_populates="generation_logs")
class Persona(Base):
    __tablename__ = "personas"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    tenant_id = Column(String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    system_instruction = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
