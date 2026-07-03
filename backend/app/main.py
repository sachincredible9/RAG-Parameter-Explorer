from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, documents, simulate

# Initialize Database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DocMind Studio API",
    description="Multi-Tenant Document Intelligence & LLM Parameter Simulator API",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(simulate.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "DocMind Studio API Gateway",
        "message": "Welcome to the Multi-Tenant LLM Parameter Simulation Portal"
    }
