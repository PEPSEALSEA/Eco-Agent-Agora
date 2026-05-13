import os
import shutil
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from audio_engine import AudioEngine

app = FastAPI()

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local use
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Audio Engine
# Using 'base' model by default. Can be changed to 'tiny' for speed.
engine = AudioEngine(model_size="base")

TEMP_DIR = "temp_audio"
os.makedirs(TEMP_DIR, exist_ok=True)

@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    """
    Receives an audio file, saves it temporarily, analyzes it, and returns results.
    """
    file_id = str(uuid.uuid4())
    # Ensure correct extension (usually webm or wav from browser)
    ext = os.path.splitext(file.filename)[1] or ".webm"
    temp_path = os.path.join(TEMP_DIR, f"{file_id}{ext}")
    
    try:
        # Save uploaded file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Analyze using the existing AudioEngine
        result = engine.analyze(temp_path)
        
        return result
    
    except Exception as e:
        error_msg = str(e)
        print(f"Error during analysis: {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)
    
    finally:
        # Cleanup temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "engine": "Whisper"}

if __name__ == "__main__":
    import uvicorn
    print("Starting Local Audio Analysis Server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
