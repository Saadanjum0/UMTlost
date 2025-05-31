from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
import logging
from pathlib import Path
import uuid
from datetime import datetime, date
import os
import aiofiles
from PIL import Image, ImageDraw, ImageFont
import io
import time
from pydantic import BaseModel
from fastapi.responses import Response

# Import our custom modules
from config import settings
from database import get_supabase, get_supabase_admin
from models import *

# API Configuration
API_BASE_URL = "http://localhost:8000/api"

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Lost & Found Portal API",
    description="API for UMT Lost & Found Portal",
    version="1.0.0"
)

# Create API router
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router in app
app.include_router(api_router)

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Lost & Found Portal API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 