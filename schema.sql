-- SQL Schema for DocMind Studio POC (Supabase/PostgreSQL Compatible)
-- Enables multi-tenancy via tenant_id and Row-Level Security (RLS)

-- Enable pgvector if available for RAG search
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    settings JSONB NOT NULL DEFAULT '{
        "custom_llm_enabled": false,
        "custom_llm_url": "",
        "custom_llm_key": "",
        "custom_llm_model": "",
        "default_model": "gemini-1.5-flash",
        "gemini_api_key": "",
        "openai_api_key": ""
    }'::jsonb
);

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    file_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Document Chunks Table
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536) -- Optional: for pgvector embeddings
);

-- 4. Generation Logs / Saved Simulation Runs Table
CREATE TABLE IF NOT EXISTS generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    persona_name TEXT NOT NULL,
    model TEXT NOT NULL,
    parameters JSONB NOT NULL,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    metrics JSONB NOT NULL, -- e.g., {"generation_time_ms": 230, "token_count": 450, "matching_chunks": [0, 1]}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON document_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_logs_tenant ON generation_logs(tenant_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

-- Create Tenant Isolation Policies (Assuming auth.jwt() maps to user with tenant_id metadata)
-- For Supabase integration, we check the user's JWT metadata
CREATE POLICY tenant_isolation_tenants ON tenants
    FOR ALL USING (id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_documents ON documents
    FOR ALL USING (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_chunks ON document_chunks
    FOR ALL USING (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid);

CREATE POLICY tenant_isolation_logs ON generation_logs
    FOR ALL USING (tenant_id = (auth.jwt() -> 'user_metadata' ->> 'tenant_id')::uuid);

-- Initial Mock Tenants seed data for local setup
INSERT INTO tenants (id, name, settings) VALUES 
('da3b573a-23d2-432d-8959-1a73fa132f86', 'Acme Medical Auditors', '{
    "custom_llm_enabled": false,
    "custom_llm_url": "",
    "custom_llm_key": "",
    "custom_llm_model": "",
    "default_model": "mistral-7b-instruct-gguf",
    "gemini_api_key": "",
    "openai_api_key": ""
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenants (id, name, settings) VALUES 
('f5b5c92c-6330-4e31-8f5b-1188339ab257', 'Lex Legal Research', '{
    "custom_llm_enabled": false,
    "custom_llm_url": "",
    "custom_llm_key": "",
    "custom_llm_model": "",
    "default_model": "mistral-7b-instruct-gguf",
    "gemini_api_key": "",
    "openai_api_key": ""
}'::jsonb)
ON CONFLICT (id) DO NOTHING;
