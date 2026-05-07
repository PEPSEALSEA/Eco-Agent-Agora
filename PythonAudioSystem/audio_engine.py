import json
import os
import numpy as np
import librosa
import whisper
import warnings

# Suppress potential warnings from librosa/whisper
warnings.filterwarnings("ignore")

class AudioEngine:
    def __init__(self, model_size="base"):
        print(f"Initializing Whisper model ({model_size})...")
        self.model = whisper.load_model(model_size)

    def normalize_audio(self, y):
        """Normalizes audio to a target peak level."""
        return librosa.util.normalize(y)

    def get_volume_db(self, y):
        """Calculates the average volume in dB."""
        rms = librosa.feature.rms(y=y)[0]
        # Convert to dB relative to 1.0 (peak)
        # We add a small epsilon to avoid log10(0)
        db = librosa.amplitude_to_db(rms, ref=1.0)
        return np.mean(db)

    def get_pitch_trend(self, y, sr):
        """
        Estimates if the pitch is increasing, decreasing, or stable.
        Returns: "Increasing", "Decreasing", or "Stable"
        """
        # Extract pitch using YIN algorithm
        pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
        
        # Select the most dominant pitch in each frame
        pitch_track = []
        for i in range(pitches.shape[1]):
            index = magnitudes[:, i].argmax()
            pitch = pitches[index, i]
            if pitch > 0:
                pitch_track.append(pitch)
        
        if len(pitch_track) < 2:
            return "Stable"

        # Calculate linear regression slope
        x = np.arange(len(pitch_track))
        slope, _ = np.polyfit(x, pitch_track, 1)

        if slope > 1.0: # Threshold for 'Increasing'
            return "Increasing"
        elif slope < -1.0:
            return "Decreasing"
        else:
            return "Stable"

    def get_speech_rate(self, y, sr, transcript):
        """Calculates speaking rate in words per minute (WPM)."""
        duration = librosa.get_duration(y=y, sr=sr)
        if duration == 0:
            return 0
        
        # Count words (basic approach, works well for Thai/English mix if spaces are present)
        # For pure Thai, this might need a word segmenter, but let's stick to a general approach
        word_count = len(transcript.split())
        wpm = (word_count / duration) * 60
        return wpm

    def get_pause_analysis(self, y, sr):
        """Analyzes pauses in speech."""
        # Detect non-silent intervals
        intervals = librosa.effects.split(y, top_db=30) # 30dB threshold for silence
        
        if len(intervals) < 2:
            return "Continuous"
        
        # Calculate gaps between intervals
        pauses = []
        for i in range(len(intervals) - 1):
            pause_duration = (intervals[i+1][0] - intervals[i][1]) / sr
            pauses.append(pause_duration)
        
        max_pause = max(pauses) if pauses else 0
        avg_pause = np.mean(pauses) if pauses else 0
        
        if max_pause > 2.0: # Pause longer than 2 seconds
            return "Hesitant/Fragmented"
        elif avg_pause > 0.8:
            return "Measured/Slow"
        else:
            return "Fluent"

    def analyze(self, file_path):
        """
        Main analysis function with advanced behavioral metrics.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Audio file not found: {file_path}")

        # 1. Load and Normalize
        y, sr = librosa.load(file_path, sr=16000)
        y = self.normalize_audio(y)

        # 2. Transcription
        print("Transcribing...")
        result = self.model.transcribe(file_path)
        transcript = result['text'].strip()

        # 3. Audio Metrics
        avg_db = self.get_volume_db(y)
        pitch_trend = self.get_pitch_trend(y, sr)
        wpm = self.get_speech_rate(y, sr, transcript)
        pause_style = self.get_pause_analysis(y, sr)

        # 4. Deep Vibe Analysis
        # Normalize DB to 0-1
        intensity = min(max((avg_db + 40) / 40, 0), 1.0)

        vibe = "Neutral"
        
        # Logic for mapping metrics to complex vibes
        if avg_db > -10 and pitch_trend == "Increasing" and wpm > 160:
            vibe = "Hostile/Aggressive" # Loud, high pitch, fast
        elif avg_db > -12 and wpm > 180:
            vibe = "Excited/Enthusiastic" # Loud and very fast
        elif wpm < 80 and pause_style == "Hesitant/Fragmented":
            vibe = "Hesitant/Insecure" # Slow and many pauses
        elif avg_db < -25 and pause_style == "Measured/Slow":
            vibe = "Melancholy/Thoughtful" # Quiet and slow
        elif avg_db > -15 and pitch_trend == "Stable" and pause_style == "Fluent":
            vibe = "Confident/Assertive" # Steady volume, stable pitch, fluent
        elif pitch_trend == "Decreasing" and wpm < 100:
            vibe = "Defeated/Submissive"

        # 5. Generate Context Note
        context_note = f"Metrics: {round(avg_db, 1)}dB | {round(wpm, 1)} WPM | {pitch_trend} Pitch | {pause_style} Delivery."
        
        # Add human-readable cues
        cues = []
        if wpm > 160: cues.append("พูดเร็วมาก")
        if pause_style == "Hesitant/Fragmented": cues.append("มีการหยุดคิดเป็นช่วงๆ")
        if avg_db > -10: cues.append("เสียงดังผิดปกติ")
        if pitch_trend == "Increasing": cues.append("โทนเสียงสูงขึ้นท้ายประโยค")
        
        if cues:
            context_note += " สังเกตเห็น: " + ", ".join(cues)

        return {
            "text": transcript,
            "vibe": vibe,
            "intensity": round(intensity, 2),
            "context_note": context_note,
            "raw_metrics": {
                "db": round(float(avg_db), 2),
                "wpm": round(float(wpm), 2),
                "pitch": pitch_trend,
                "pause": pause_style
            }
        }

if __name__ == "__main__":
    # For testing, you'd need an actual audio file
    engine = AudioEngine(model_size="tiny") # Use 'tiny' for faster testing
    
    # Check if a test file exists, otherwise print mock instructions
    test_file = "test_audio.wav"
    if os.path.exists(test_file):
        result = engine.analyze(test_file)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print(f"Please provide '{test_file}' to run a real test.")
        print("Logic is now implemented using librosa and whisper.")
