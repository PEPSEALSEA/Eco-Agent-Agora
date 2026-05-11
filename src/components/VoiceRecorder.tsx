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
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาตรวจสอบสิทธิ์การใช้งาน');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', blob, 'recording.webm');

    try {
      // Connect to the local Python server
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis server error');
      }

      const result = await response.json();
      onTranscription(result);
    } catch (err) {
      console.error('Error analyzing audio:', err);
      alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์วิเคราะห์เสียงได้ (ตรวจสอบว่ารัน Python server หรือยัง?)');
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
