"""
main.py — FastAPI Resume Analyser Backend
NVIDIA NIM AI + SQLite + PDF/DOCX parsing
"""
import os
import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

import sys
from pathlib import Path

# Fix: Add backend folder to sys.path so nested imports work when run from root
sys.path.append(str(Path(__file__).parent))

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from database import init_db, get_db, Analysis
from resume_parser import parse_resume
from ai_analyzer import analyze_resume

# ─────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 10))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}

# ─────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────
app = FastAPI(
    title="ResumeAI API",
    description="AI-powered resume analyser backend using NVIDIA NIM",
    version="1.0.0",
)

# Allow frontend (file:// and localhost) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production restrict to your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise DB on startup
@app.on_event("startup")
def on_startup():
    init_db()
    print("[*] ResumeAI API started")
    print(f"[*] Upload directory: {UPLOAD_DIR.resolve()}")
    print(f"[*] AI model: {os.getenv('NVIDIA_MODEL', 'meta/llama-3.1-70b-instruct')}")
    
    # Diagnostic: Check frontend path
    print(f"[*] Frontend directory: {frontend_dir.resolve()}")
    index_path = frontend_dir / "index.html"
    if index_path.exists():
        print(f"[OK] index.html found at: {index_path.resolve()}")
    else:
        print(f"[ERR] index.html NOT FOUND at: {index_path.resolve()}")
        
    print("[Docs] http://localhost:8000/docs")


# ─────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    file_id: str
    job_role: str


class AnalysisResponse(BaseModel):
    analysis_id: int
    filename: str
    job_role: str
    score: int
    match_pct: int
    tier: str
    rank_text: str
    skills: list
    missing: list
    suggestions: list
    created_at: str


# ─────────────────────────────────────────
# Helper
# ─────────────────────────────────────────
def get_upload_path(file_id: str) -> Optional[Path]:
    """Find uploaded file by its ID prefix."""
    for f in UPLOAD_DIR.iterdir():
        if f.stem.startswith(file_id):
            return f
    return None


# ─────────────────────────────────────────
# Routes
# ─────────────────────────────────────────

@app.get("/api/health", tags=["System"])
def health_check():
    """Check if the API is running correctly."""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "model": os.getenv("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct"),
    }


@app.post("/api/upload", tags=["Resume"])
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a resume file (PDF or DOCX).
    Returns a file_id to use in the analyze endpoint.
    """
    # Validate extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Please upload PDF or DOCX."
        )

    # Read file content
    content = await file.read()

    # Validate size
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB."
        )

    # Save with unique ID
    file_id = uuid.uuid4().hex[:12]
    safe_name = f"{file_id}{ext}"
    file_path = UPLOAD_DIR / safe_name

    with open(file_path, "wb") as f:
        f.write(content)

    print(f"[*] File uploaded: {file.filename} -> {safe_name} ({len(content)//1024}KB)")

    return {
        "file_id": file_id,
        "filename": file.filename,
        "size_kb": round(len(content) / 1024, 1),
        "message": "File uploaded successfully. Call /api/analyze to proceed.",
    }


@app.post("/api/analyze", response_model=AnalysisResponse, tags=["Resume"])
async def analyze(request: AnalyzeRequest, db: Session = Depends(get_db)):
    """
    Analyze an uploaded resume against a target job role using AI.
    Saves results to database and returns the full analysis.
    """
    # Validate job role
    if not request.job_role or len(request.job_role.strip()) < 2:
        raise HTTPException(status_code=400, detail="Please provide a valid job role.")

    # Find uploaded file
    file_path = get_upload_path(request.file_id)
    if not file_path or not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Uploaded file not found. Please upload your resume again."
        )

    # Extract text from resume
    try:
        print(f"📄 Parsing: {file_path.name}")
        resume_text = parse_resume(str(file_path))
        if not resume_text or len(resume_text.strip()) < 30:
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from the resume. Ensure the file is not scanned/image-only."
            )
        print(f"[OK] Extracted {len(resume_text)} characters from resume")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")

    # Run AI analysis
    try:
        ai_result = await analyze_resume(resume_text, request.job_role.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    # Save to database
    analysis = Analysis(
        filename=file_path.name,
        job_role=request.job_role.strip(),
        resume_text=resume_text[:5000],  # store first 5000 chars
        score=ai_result["score"],
        match_pct=ai_result["match_pct"],
        tier=ai_result["tier"],
        rank_text=ai_result["rank_text"],
    )
    analysis.skills = ai_result["skills"]
    analysis.missing = ai_result["missing"]
    analysis.suggestions = ai_result["suggestions"]

    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    print(f"[DB] Saved analysis #{analysis.id} -- Score: {analysis.score}, Match: {analysis.match_pct}%")

    return AnalysisResponse(
        analysis_id=analysis.id,
        filename=file_path.name,
        job_role=analysis.job_role,
        score=analysis.score,
        match_pct=analysis.match_pct,
        tier=analysis.tier,
        rank_text=analysis.rank_text,
        skills=analysis.skills,
        missing=analysis.missing,
        suggestions=analysis.suggestions,
        created_at=analysis.created_at.isoformat(),
    )


@app.get("/api/results/{analysis_id}", response_model=AnalysisResponse, tags=["Resume"])
def get_result(analysis_id: int, db: Session = Depends(get_db)):
    """Retrieve a previously saved analysis by ID."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis #{analysis_id} not found.")

    return AnalysisResponse(
        analysis_id=analysis.id,
        filename=analysis.filename,
        job_role=analysis.job_role,
        score=analysis.score,
        match_pct=analysis.match_pct,
        tier=analysis.tier,
        rank_text=analysis.rank_text or "",
        skills=analysis.skills,
        missing=analysis.missing,
        suggestions=analysis.suggestions,
        created_at=analysis.created_at.isoformat(),
    )


@app.get("/api/history", tags=["Resume"])
def get_history(limit: int = 20, db: Session = Depends(get_db)):
    """
    List recent analyses (most recent first).
    Returns lightweight records without full resume text.
    """
    analyses = (
        db.query(Analysis)
        .order_by(Analysis.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "total": len(analyses),
        "analyses": [a.to_dict() for a in analyses],
    }


@app.delete("/api/results/{analysis_id}", tags=["Resume"])
def delete_result(analysis_id: int, db: Session = Depends(get_db)):
    """Delete a saved analysis."""
    analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail=f"Analysis #{analysis_id} not found.")
    db.delete(analysis)
    db.commit()
    return {"message": f"Analysis #{analysis_id} deleted successfully."}

# ─────────────────────────────────────────
# Serve Frontend Static Files
# ─────────────────────────────────────────
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# The frontend code is one folder up from the backend folder
# We use .resolve() to handle absolute paths correctly on Windows
frontend_dir = Path(__file__).parent.parent.resolve()

@app.get("/")
async def serve_index():
    """Explicitly serve index.html for the root path."""
    index_path = frontend_dir / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return JSONResponse(
        status_code=404, 
        content={"error": f"index.html not found at {index_path}"}
    )

# Serve all other files (app.js, styles.css, etc.)
app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
