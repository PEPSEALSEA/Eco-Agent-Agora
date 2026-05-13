'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Play, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceRecorderProps {
  onTranscription: (result: { text: string; vibe: string; intensity: number; context_note: string }) => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscription, disabled }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputRef = useRef<AudioNode | null>(null);
  const leftChannelRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      
      const input = audioContext.createMediaStreamSource(stream);
      inputRef.current = input;

      // Use a ScriptProcessorNode (deprecated but simple for this purpose) 
      // or AudioWorklet for better performance.
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

      // Stop nodes
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      }
      if (inputRef.current) inputRef.current.disconnect();
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      
      // Flatten buffers
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

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', blob, 'recording.wav');

    try {
      // Connect to the local Python server
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown server error' }));
        throw new Error(errorData.detail || 'Analysis server error');
      }

      const result = await response.json();
      onTranscription(result);
    } catch (err: any) {
      console.error('Error analyzing audio:', err);
      alert(`ไม่สามารถวิเคราะห์เสียงได้: ${err.message}\n\n(หากเป็นข้อผิดพลาด 500 หรือ FFmpeg not found กรุณาตรวจสอบว่าติดตั้ง FFmpeg ในเครื่องแล้ว)`);
    } finally {
      setIsProcessing(false);
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
            กำลังวิเคราะห์เสียง...
          </motion.div>
        ) : isRecording ? (
          <motion.div 
            key="recording"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center space-x-3"
          >
            <div className="flex items-center bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-2xl text-red-400 font-bold">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
              {formatTime(recordingTime)}
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
