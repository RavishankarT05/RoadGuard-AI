import os
from pathlib import Path
from typing import Any
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent
PROJECT_ROOT = BASE_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "RoadGuard AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Storage Directories
    DATABASE_DIR: Path = PROJECT_ROOT / "database"
    REPORTS_DIR: Path = PROJECT_ROOT / "reports"
    UPLOADS_DIR: Path = BASE_DIR / "uploads"
    OUTPUTS_DIR: Path = BASE_DIR / "outputs"
    WEIGHTS_DIR: Path = BASE_DIR / "weights"
    
    # Database URL (Supports PostgreSQL for Render/Production and SQLite for Local)
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{PROJECT_ROOT / 'database' / 'roadguard.db'}"
    )
    
    # YOLO & AI Settings
    DEFAULT_MODEL_NAME: str = "pothole_best.pt"
    ACTIVE_MODEL_PATH: str = str(WEIGHTS_DIR / "pothole_best.pt")
    CONFIDENCE_THRESHOLD: float = 0.25
    IOU_THRESHOLD: float = 0.45
    
    # CORS (supports comma-separated string or list)
    CORS_ORIGINS: Any = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
for folder in [settings.DATABASE_DIR, settings.REPORTS_DIR, settings.UPLOADS_DIR, settings.OUTPUTS_DIR, settings.WEIGHTS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)

