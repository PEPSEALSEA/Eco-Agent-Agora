'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseAudioAnalysisJson, sleep } from '@/lib/parseGeminiJson';

interface VoiceRecorderProps {
  onTranscription: (result: { text: string; vibe: string; intensity: number; context_note: string }) => void;
  disabled?: boolean;
}

const AUDIO_ANALYSIS_RETRIES = 3;
const AUDIO_ANALYSIS_PROMPT = `
Task: Analyze the audio in Thai language and return ONLY a JSON object (no markdown).
Transcribe the audio exactly into natural written Thai.
Rules for "text":
- Write Thai words continuously without spaces between syllables within a word.
- Use spaces only for natural pauses, clause breaks, or sentence boundaries.
- Use spaces before and after English words.

Analyze emotional vibe, volume, speech rate, pauses, clarity, confidence, politeness, pressure, and negotiation impact.
"context_note" must be a detailed voice-coach comment for the debrief page (Thai).

Required JSON shape:
{"text":"...","vibe":"Neutral","intensity":0.5,"context_note":"..."}

"vibe" must be one of: Happy, Calm, Serious, Neutral
"intensity" must be a number from 0.0 to 1.0
`.trim();

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscription, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('กำลังวิเคราะห์เสียง...');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputRef = useRef<AudioNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const leftChannelRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#f87171';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const input = audioContext.createMediaStreamSource(stream);
      inputRef.current = input;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      input.connect(analyser);

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      leftChannelRef.current = [];

      processor.onaudioprocess = (e: any) => {
        const left = e.inputBuffer.getChannelData(0);
        leftChannelRef.current.push(new Float32Array(left));
      };

      input.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setRecordingTime(0);
      
      setTimeout(drawWaveform, 100);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('ไม่สามารถเข้าถึงไมโครโฟนได้');
    }
  };

  const stopRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);

      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      }
      if (analyserRef.current) analyserRef.current.disconnect();
      if (inputRef.current) inputRef.current.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      
      const data = flattenArray(leftChannelRef.current);
      const wavBlob = createWavBlob(data, audioContextRef.current?.sampleRate || 44100);
      
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);
      processAudio(wavBlob);
      
      if (audioContextRef.current) audioContextRef.current.close();
    }
  };

  const flattenArray = (channelBuffer: Float32Array[]) => {
    const result = new Float32Array(channelBuffer.reduce((acc, b) => acc + b.length, 0));
    let offset = 0;
    for (const b of channelBuffer) {
      result.set(b, offset);
      offset += b.length;
    }
    return result;
  };

  const createWavBlob = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 32 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  const analyzeAudioWithGemini = async (base64Audio: string): Promise<{ text: string; vibe: string; intensity: number; context_note: string }> => {
    const { GoogleGenerativeAI, SchemaType } = await import('@google/generative-ai');
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

    if (!apiKey) {
      throw new Error('ไม่พบ API Key ของ Gemini กรุณาตั้งค่าตัวแปร NEXT_PUBLIC_GEMINI_API_KEY ในไฟล์ .env');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            text: { type: SchemaType.STRING, description: 'Thai transcription' },
            vibe: {
              type: SchemaType.STRING,
              format: 'enum',
              enum: ['Happy', 'Calm', 'Serious', 'Neutral'],
            },
            intensity: { type: SchemaType.NUMBER, description: '0.0 to 1.0' },
            context_note: { type: SchemaType.STRING, description: 'Voice coach feedback in Thai' },
          },
          required: ['text', 'vibe', 'intensity', 'context_note'],
        },
      },
    });

    const result = await model.generateContent([
      AUDIO_ANALYSIS_PROMPT,
      {
        inlineData: {
          data: base64Audio,
          mimeType: 'audio/wav',
        },
      },
    ]);

    return parseAudioAnalysisJson(result.response.text());
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    setProcessingLabel('กำลังวิเคราะห์เสียง...');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
      });

      let lastError: Error | null = null;

      for (let attempt = 0; attempt < AUDIO_ANALYSIS_RETRIES; attempt++) {
        if (attempt > 0) {
          setProcessingLabel(`ลองใหม่ (${attempt + 1}/${AUDIO_ANALYSIS_RETRIES})...`);
          await sleep(600 * attempt);
        }

        try {
          const jsonResult = await analyzeAudioWithGemini(base64Audio);
          onTranscription(jsonResult);
          return;
        } catch (err: any) {
          lastError = err instanceof Error ? err : new Error(String(err));
          console.warn(`Audio analysis attempt ${attempt + 1} failed:`, lastError.message);
        }
      }

      throw lastError ?? new Error('วิเคราะห์เสียงไม่สำเร็จ');
    } catch (err: any) {
      console.error('Error analyzing audio with Gemini:', err);
      alert(`ไม่สามารถวิเคราะห์เสียงได้หลังลอง ${AUDIO_ANALYSIS_RETRIES} ครั้ง: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingLabel('กำลังวิเคราะห์เสียง...');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3">
      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div 
            key="processing"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center bg-cyan-500/20 border border-cyan-500/30 px-4 py-2 rounded-2xl text-cyan-400 font-bold"
          >
            <Loader2 size={18} className="animate-spin mr-2" />
            {processingLabel}
          </motion.div>
        ) : isRecording ? (
          <motion.div 
            key="recording"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-3 bg-black/40 backdrop-blur-md p-2 pl-4 rounded-3xl border border-white/10"
          >
            <div className="flex flex-col">
              <div className="flex items-center text-red-400 font-mono text-sm mb-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
                {formatTime(recordingTime)}
              </div>
              <canvas 
                ref={canvasRef} 
                width={100} 
                height={30} 
                className="opacity-80"
              />
            </div>
            
            <button
              onClick={stopRecording}
              className="p-3 bg-red-500 hover:bg-red-400 text-white rounded-full shadow-lg shadow-red-500/20 transition-all hover:scale-110 active:scale-95"
            >
              <Square size={20} fill="currentColor" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={startRecording}
            disabled={disabled}
            className={`p-4 rounded-full transition-all flex items-center justify-center ${
              disabled 
                ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                : 'bg-nintendo-red hover:bg-red-500 text-white shadow-lg shadow-red-500/20 hover:scale-110 active:scale-95'
            }`}
            title="บันทึกเสียง"
          >
            <Mic size={24} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
