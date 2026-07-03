import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Local GGUF Model Configs
    MODEL_REPO_ID: str = "TheBloke/Mistral-7B-Instruct-v0.2-GGUF"
    MODEL_BASENAME: str = "mistral-7b-instruct-v0.2.Q6_K.gguf"
    MODEL_DIR: str = "./models"
    
    # Secret key for JWT or mock auth session
    SECRET_KEY: str = "docmind_studio_poc_secret_key"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
