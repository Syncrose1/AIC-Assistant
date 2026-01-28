#
# ML Backend Service for AIRI
#
# Provides HTTP endpoints for:
# - Emotion detection from text
# - Phoneme alignment from audio + text (BFA)
#
# Auto-started by Tauri, runs on localhost:8001
#
# Architecture:
# - FastAPI for HTTP server
# - Models loaded once on startup
# - GPU acceleration via CUDA
#
# Models:
# - Emotion: j-hartmann/emotion-english-distilroberta-base (7 emotions)
# - Aligner: Bournemouth Forced Aligner (BFA) with CUPE
#

import os
import sys
import torch
import logging
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global model instances
emotion_model = None
aligner_model = None

# Configuration
HOST = os.getenv("ML_BACKEND_HOST", "127.0.0.1")
PORT = int(os.getenv("ML_BACKEND_PORT", "8001"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class EmotionRequest(BaseModel):
    text: str


class EmotionResponse(BaseModel):
    emotion: str
    confidence: float
    all_emotions: List[Dict[str, Any]]
    processing_time_ms: float


class AlignRequest(BaseModel):
    text: str
    audio_path: str  # Path to audio file (temporary)


class PhonemeTimestamp(BaseModel):
    phoneme: str
    ipa: str
    start_ms: float
    end_ms: float
    confidence: float


class AlignResponse(BaseModel):
    phonemes: List[PhonemeTimestamp]
    words: List[Dict[str, Any]]
    processing_time_ms: float


class HealthResponse(BaseModel):
    status: str
    device: str
    models_loaded: Dict[str, bool]
    timestamp: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup, cleanup on shutdown"""
    global emotion_model, aligner_model

    logger.info("=" * 60)
    logger.info("AI Assistant ML Backend Service Starting...")
    logger.info(f"Device: {DEVICE}")
    logger.info(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
        logger.info(
            f"VRAM: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB"
        )
    logger.info("=" * 60)

    # Load emotion model
    try:
        logger.info(
            "Loading emotion model: j-hartmann/emotion-english-distilroberta-base"
        )
        from transformers import pipeline

        emotion_model = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            device=0 if DEVICE == "cuda" else -1,
            top_k=None,
        )
        logger.info("✓ Emotion model loaded successfully")
    except Exception as e:
        logger.error(f"✗ Failed to load emotion model: {e}")
        emotion_model = None

    # Load BFA aligner (lazy loading - will initialize on first use)
    logger.info("BFA aligner ready for lazy initialization")
    aligner_model = None

    logger.info("=" * 60)
    logger.info(f"Service ready on http://{HOST}:{PORT}")
    logger.info("=" * 60)

    yield

    # Cleanup
    logger.info("Shutting down ML Backend Service...")
    if emotion_model:
        del emotion_model
    if aligner_model:
        del aligner_model
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    logger.info("Cleanup complete")


app = FastAPI(
    title="AI Assistant ML Backend",
    description="ML inference service for emotion detection and phoneme alignment",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware (allow requests from Tauri app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tauri localhost
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        device=DEVICE,
        models_loaded={
            "emotion": emotion_model is not None,
            "aligner": True,  # Lazy loaded
        },
        timestamp=datetime.now().isoformat(),
    )


@app.post("/emotion/detect", response_model=EmotionResponse)
async def detect_emotion(request: EmotionRequest):
    """
    Detect emotion from text

    Returns the top emotion and all emotion scores
    """
    import time

    if not emotion_model:
        raise HTTPException(status_code=503, detail="Emotion model not loaded")

    if not request.text or not request.text.strip():
        return EmotionResponse(
            emotion="neutral",
            confidence=1.0,
            all_emotions=[{"label": "neutral", "score": 1.0}],
            processing_time_ms=0.0,
        )

    try:
        start_time = time.time()

        # Run inference
        results = emotion_model(request.text.strip())

        # Handle different output formats
        if isinstance(results, list) and len(results) > 0:
            if isinstance(results[0], list):
                results = results[0]  # Nested list format

        # Sort by score descending
        results = sorted(results, key=lambda x: x["score"], reverse=True)

        top_result = results[0]

        processing_time = (time.time() - start_time) * 1000

        return EmotionResponse(
            emotion=top_result["label"],
            confidence=top_result["score"],
            all_emotions=results,
            processing_time_ms=processing_time,
        )

    except Exception as e:
        logger.error(f"Emotion detection failed: {e}")
        raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")


@app.post("/align/phonemes", response_model=AlignResponse)
async def align_phonemes(request: AlignRequest):
    """
    Align phonemes to audio using Bournemouth Forced Aligner (BFA)

    Takes audio file path and text, returns precise phoneme timestamps
    """
    import time

    global aligner_model

    # Lazy load BFA aligner
    if aligner_model is None:
        try:
            logger.info("Initializing BFA aligner...")
            from bournemouth_aligner import PhonemeTimestampAligner

            aligner_model = PhonemeTimestampAligner(
                preset="en-us",
                device=DEVICE,
                duration_max=30,  # Max 30 seconds
            )
            logger.info("✓ BFA aligner initialized")
        except Exception as e:
            logger.error(f"Failed to initialize BFA: {e}")
            raise HTTPException(
                status_code=503, detail=f"Aligner initialization failed: {str(e)}"
            )

    if not os.path.exists(request.audio_path):
        raise HTTPException(
            status_code=400, detail=f"Audio file not found: {request.audio_path}"
        )

    try:
        start_time = time.time()

        # Load audio
        audio_wav = aligner_model.load_audio(request.audio_path)

        # Process alignment
        timestamps = aligner_model.process_sentence(
            text=request.text, audio_wav=audio_wav, do_groups=True, debug=False
        )

        # Extract phoneme timestamps
        phonemes = []
        if timestamps and "segments" in timestamps and len(timestamps["segments"]) > 0:
            segment = timestamps["segments"][0]

            # Get phoneme timestamps
            if "phoneme_ts" in segment:
                for ph in segment["phoneme_ts"]:
                    phonemes.append(
                        PhonemeTimestamp(
                            phoneme=ph.get("phoneme_label", ""),
                            ipa=ph.get("phoneme_label", ""),  # BFA uses IPA labels
                            start_ms=ph.get("start_ms", 0),
                            end_ms=ph.get("end_ms", 0),
                            confidence=ph.get("confidence", 0),
                        )
                    )

        # Extract word timestamps
        words = []
        if timestamps and "segments" in timestamps and len(timestamps["segments"]) > 0:
            segment = timestamps["segments"][0]
            if "words_ts" in segment:
                words = segment["words_ts"]

        processing_time = (time.time() - start_time) * 1000

        return AlignResponse(
            phonemes=phonemes, words=words, processing_time_ms=processing_time
        )

    except Exception as e:
        logger.error(f"Phoneme alignment failed: {e}")
        raise HTTPException(status_code=500, detail=f"Alignment failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host=HOST, port=PORT, log_level="info", access_log=True)
