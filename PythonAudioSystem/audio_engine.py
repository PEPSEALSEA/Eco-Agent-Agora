import json
import os
import numpy as np
import librosa
import soundfile as sf
import whisper
import scipy.signal
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
        
        # Check if transcript contains Thai characters
        has_thai = any('\u0e00' <= char <= '\u0e7f' for char in transcript)
        
        if has_thai:
            # Thai doesn't use spaces. A rough estimate is 4 characters per word.
            # We strip spaces first to avoid counting them if they exist.
            clean_text = transcript.replace(" ", "")
            word_count = len(clean_text) / 4.0
        else:
            # English/Other languages with spaces
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
        print(f"\n--- New Analysis Request: {file_path} ---")
        if not os.path.exists(file_path):
            print(f"Error: File not found at {file_path}")
            raise FileNotFoundError(f"Audio file not found: {file_path}")

        # 1. Load using soundfile (No FFmpeg needed for WAV)
        try:
            data, samplerate = sf.read(file_path)
            print(f"Loaded audio: {len(data)} samples, samplerate={samplerate}")
            
            # Save a debug copy to see what the server actually received
            debug_path = os.path.join(os.path.dirname(file_path), "debug_last_received.wav")
            sf.write(debug_path, data, samplerate)
            print(f"Debug audio saved to: {debug_path}")
        except Exception as e:
            print(f"Error loading audio with soundfile: {e}")
            raise e
        
        # If stereo, convert to mono
        if len(data.shape) > 1:
            print(f"Converting stereo (shape {data.shape}) to mono")
            data = np.mean(data, axis=1)
            
        # Resample to 16000 for Whisper (No FFmpeg needed)
        if samplerate != 16000:
            print(f"Resampling from {samplerate} to 16000")
            num_samples = int(len(data) * 16000 / samplerate)
            y = scipy.signal.resample(data, num_samples)
            sr = 16000
        else:
            y = data
            sr = samplerate
            
        duration = len(y) / sr
        print(f"Audio duration: {duration:.2f} seconds")
        
        if duration < 0.1:
            print("Warning: Audio is too short!")
            return {
                "text": "",
                "vibe": "Neutral",
                "intensity": 0,
                "context_note": "Audio too short",
                "raw_metrics": {"db": -100, "wpm": 0, "pitch": "Stable", "pause": "Continuous"}
            }

        y = self.normalize_audio(y)
        avg_db = self.get_volume_db(y)
        print(f"Average volume: {avg_db:.2f} dB")

        # 2. Transcription (Pass numpy array directly to avoid FFmpeg)
        print("Starting Whisper transcription...")
        y_float32 = y.astype(np.float32)
        
        # Try transcribing with Thai language hint
        try:
            # We use language='th' to force Thai, as requested by user
            # If they also speak English, Whisper is usually good at code-switching 
            # even when forced to a specific language, or we can use 'auto' (None)
            result = self.model.transcribe(y_float32, language='th', task='transcribe')
            detected_lang = result.get('language', 'th')
            print(f"Transcription completed. Detected/Forced Language: {detected_lang}")
            transcript = result['text'].strip()
            print(f"Transcript: '{transcript}'")
        except Exception as e:
            print(f"Error during transcription: {e}")
            transcript = ""

        # 3. Audio Metrics
        pitch_trend = self.get_pitch_trend(y, sr)
        wpm = self.get_speech_rate(y, sr, transcript)
        pause_style = self.get_pause_analysis(y, sr)
        print(f"Metrics: WPM={wpm:.1f}, Pitch={pitch_trend}, Pause={pause_style}")

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

        print(f"Vibe detected: {vibe}")
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
