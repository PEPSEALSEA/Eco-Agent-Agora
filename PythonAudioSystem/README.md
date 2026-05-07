# Python Audio Engine

This module handles audio analysis and metadata extraction.

## Analysis Logic
The engine should extract:
- **Transcript**: Text from audio (using Whisper).
- **Vibe**: Emotional context (e.g., Agitated, Calm).
- **Intensity**: Severity of emotion (0.0 - 1.0).
- **Physical Clues**: Volume (dB), Pitch trends, etc.

## Prompt for LLM Analysis (If using LLM to extract Metadata)
If you are passing the transcript and audio metrics to an LLM to generate the JSON, use the following prompt:

```text
Task: Analyze the following audio metrics and transcript to produce a JSON summary.

Input:
- Transcript: "{{transcript}}"
- Avg Volume: {{volume}}dB
- Pitch Trend: {{pitch}}

Output Format (JSON):
{
  "text": "original transcript",
  "vibe": "Detected emotion (e.g., Agitated/Aggressive, Calm/Steady)",
  "intensity": 0.0 to 1.0,
  "context_note": "A brief explanation of why this vibe was chosen based on volume and pitch."
}
```

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Run analysis: `python audio_engine.py`
