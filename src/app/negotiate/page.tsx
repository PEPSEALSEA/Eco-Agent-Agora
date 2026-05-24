'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gasFetch, gasPost, uuid } from '@/lib/gas';
import { getGeminiResponse } from '@/lib/gemini';
import { useAuth } from '@/components/AuthProvider';
import { Send, User as UserIcon, Bot, ArrowLeft, MessageSquare, Info, Users, ScrollText, X, Mic } from 'lucide-react';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { DialogueBox } from '@/components/DialogueBox';
import { StrategyBlocks, Strategy } from '@/components/StrategyBlocks';
import { ReignsSystem } from '@/components/ReignsSystem';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Baby, Briefcase, GraduationCap } from 'lucide-react';
import { CartoonLoading } from '@/components/CartoonLoading';
import { KidGameplay } from '@/components/KidGameplay';
import { VoiceRecorder } from '@/components/VoiceRecorder';

type Character = {
  id: string;
  name: string;
  role: string;
  agenda: string;
  personality: string;
  mood?: 'open' | 'neutral' | 'resistant';
  stats?: { trust: number, anger: number };
};

type Message = {
  id?: string;
  session_id?: string;
  sender: 'user' | 'ai';
  character_name?: string;
  content: string;
  created_at?: string;
  input_mode?: 'text' | 'strategy' | 'microphone';
  vibe?: string;
  intensity?: number;
  context_note?: string;
  voice_vibe?: string;
  voice_intensity?: number;
  voice_comment?: string;
};

function NegotiateContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [scenario, setScenario] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('กำลังเตรียมข้อมูล...');
  const [sending, setSending] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [mode, setMode] = useState<'kid' | 'adult' | 'pro'>('kid');
  const [currentDynamicDecisions, setCurrentDynamicDecisions] = useState<any>(null);
  const [phase, setPhase] = useState<'rapport' | 'discovery' | 'bargaining' | 'closing' | string>('rapport');
  const [runtimeState, setRuntimeState] = useState<any>(null);
  const [narrator, setNarrator] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [outcome, setOutcome] = useState<'win' | 'fail' | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string | null>(null);
  const [streamingChar, setStreamingChar] = useState<string | null>(null);
  const [currentVibe, setCurrentVibe] = useState<'Happy' | 'Calm' | 'Serious' | string>('Calm');
  const [showPulse, setShowPulse] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [angerDebugPreview, setAngerDebugPreview] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const angerDebugSequenceIndex = useRef(0);
  const angerDebugRoundsCompleted = useRef(0);

  const ANGER_DEBUG_KEYS = ['a', 'n', 'g', 'e', 'r'] as const;
  const ANGER_DEBUG_ROUNDS_REQUIRED = 3;
  const effectiveVibe = angerDebugPreview ? 'Serious' : currentVibe;

  const kidGameplayActive =
    scenario?.target_group === 'kids' && mode === 'kid';
  const useFreeTextInput =
    scenario?.target_group === 'professional' || mode === 'pro';

  useEffect(() => {
    if (!scenario?.id) return;
    if (scenario?.target_group === 'professional') setMode('pro');
    else setMode('kid');
  }, [scenario?.id, scenario?.target_group]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!sessionId) return;

    const fetchData = async () => {
      setLoadingMessage('กำลังดึงข้อมูลเซสชัน...');
      try {
        // Fetch optimized session data
        const result = await gasFetch('get_negotiation_data', undefined, undefined, { sessionId });
        if (result.error) throw new Error(result.error);

        const { session: sessionData, scenario: scenarioData, messages: messagesData } = result;

        if (!sessionData) {
          router.push('/scenarios');
          return;
        }

        if (!scenarioData) {
          router.push('/scenarios');
          return;
        }

        setSession(sessionData);
        setScenario(scenarioData);
        setCharacters(scenarioData.characters.map((c: any) => ({ ...c, mood: 'neutral' })));

        // Sort messages by time
        const sortedMessages = (messagesData || [])
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        setMessages(sortedMessages);
        if (sortedMessages.length > 0) {
          setCurrentMessageIndex(sortedMessages.length - 1);
          setIsStarted(true);
        }
        
        if (sessionData.status === 'completed') {
          setIsGameOver(true);
          setOutcome(sessionData.outcome_score > 0 ? 'win' : 'fail');
        }
      } catch (err) {
        console.error('Fetch data error:', err);
        router.push('/scenarios');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showLogModal]);

  // Debug: type A-N-G-E-R three times in a row to toggle anger / red-screen preview
  useEffect(() => {
    const resetSequence = () => {
      angerDebugSequenceIndex.current = 0;
      angerDebugRoundsCompleted.current = 0;
    };

    const triggerAngerPreview = () => {
      setAngerDebugPreview((prev) => {
        const next = !prev;
        if (next) {
          setShowPulse(true);
          window.setTimeout(() => setShowPulse(false), 1000);
        }
        return next;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && angerDebugPreview) {
        e.preventDefault();
        setAngerDebugPreview(false);
        resetSequence();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key.length !== 1) return;

      const expected = ANGER_DEBUG_KEYS[angerDebugSequenceIndex.current];
      if (key === expected) {
        angerDebugSequenceIndex.current += 1;
        if (angerDebugSequenceIndex.current >= ANGER_DEBUG_KEYS.length) {
          angerDebugSequenceIndex.current = 0;
          angerDebugRoundsCompleted.current += 1;
          if (angerDebugRoundsCompleted.current >= ANGER_DEBUG_ROUNDS_REQUIRED) {
            e.preventDefault();
            resetSequence();
            triggerAngerPreview();
          }
        }
      } else {
        angerDebugSequenceIndex.current = key === ANGER_DEBUG_KEYS[0] ? 1 : 0;
        angerDebugRoundsCompleted.current = 0;
      }
    };

    const handleBlur = () => resetSequence();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
    };
  }, [angerDebugPreview]);

  // Start sequence typing for new message
  useEffect(() => {
    if (currentMessageIndex >= 0 && currentMessageIndex < messages.length) {
      setIsTyping(true);
    }
  }, [currentMessageIndex, messages.length]);

  const advanceMessage = () => {
    if (isTyping) {
      setIsTyping(false); // Skip animation
    } else if (currentMessageIndex < messages.length - 1) {
      setCurrentMessageIndex(prev => prev + 1);
    }
  };

  const handleStart = async () => {
    if (!scenario || isStarted) return;
    setIsStarted(true);
    setLoading(true);
    setLoadingMessage('AI กำลังเตรียมตัวเจรจา...');
    setSending(true);

    try {
      // 1. Get Context from GAS
      const context = await gasPost('get_chat_context', 'logs', {
        sessionId: sessionId,
        text: "[System: เริ่มต้นสถานการณ์ อ้างอิงจาก opening_scene และ phase_rules. กรุณาเริ่มบทสนทนาได้เลย]",
      });

      if (context.error) throw new Error(context.error);

      // 2. Stream from Gemini
      let accumulatedText = "";
      const aiResponse = await getGeminiResponse(
        context.systemPrompt,
        context.history,
        (text) => {
          accumulatedText = text;
          // Extract partial line content for UI
          const match = text.match(/"line":\s*"([^"]*)"/);
          const partialMatch = text.match(/"line":\s*"([^"]*)$/);
          const displayContent = match ? match[1] : (partialMatch ? partialMatch[1] : "");
          if (displayContent) setStreamingMessage(displayContent);
        },
        context.geminiApiKey
      );

      // 3. Process Result in GAS (Background)
      const processResult = await gasPost('process_chat_result', 'logs', {
        sessionId: sessionId,
        aiResponse: aiResponse,
        state: context.state,
        userText: "[System: เริ่มต้นสถานการณ์]"
      });

      const aiMessages: Message[] = (aiResponse.dialogue || [])
        .filter((line: any) => {
          if (useFreeTextInput) {
            const char = line.char?.toLowerCase();
            return char !== 'narrator' && char !== 'system' && char !== 'บรรยาย';
          }
          return true;
        })
        .map((line: any) => ({
          id: uuid(),
          session_id: sessionId!,
          sender: 'ai',
          character_name: line.char,
          content: line.line,
          created_at: new Date().toISOString()
        }));
      
      setMessages(aiMessages);
      setNarrator(aiResponse.narrator);
      setStreamingMessage(null);
      setStreamingChar(null);
      
      if (aiMessages.length > 0) {
        setCurrentMessageIndex(0);
      }
      
      if (processResult.state) {
        const finalState = processResult.state;
        setRuntimeState(finalState);
        if (finalState.current_phase) setPhase(finalState.current_phase);
        
        setCharacters(prev => prev.map(c => {
          const rel = finalState.relationships?.[c.id] || finalState.relationships?.[c.name];
          if (rel) {
            return {
              ...c,
              mood: rel.anger > 7 ? 'resistant' : rel.trust > 7 ? 'open' : 'neutral',
              stats: { trust: rel.trust, anger: rel.anger }
            };
          }
          return c;
        }));
      }
    } catch (err: any) {
      console.error(err);
      setError('การเริ่มต้น AI ล้มเหลว: ' + err.message);
    } finally {
      setSending(false);
      setLoading(false);
      setStreamingMessage(null);
    }
  };

  const handleSend = async (strategyOverride?: Strategy, audioResult?: { text: string, vibe: string, intensity: number, context_note?: string }) => {
    if ((!input.trim() && !strategyOverride && !audioResult) || !user || sending || !sessionId) {
      if (!user) setError('คุณต้องเข้าสู่ระบบเพื่อส่งข้อความ');
      return;
    }

    const userMessageContent = audioResult ? audioResult.text : (strategyOverride ? strategyOverride.thaiLabel : input);
    const vibe = audioResult ? audioResult.vibe : "Neutral";
    const intensity = audioResult ? audioResult.intensity : 0.5;
    const voiceComment = audioResult?.context_note || '';
    
    if (!audioResult) setInput('');
    setError(null);

    const userMsg: Message = {
      id: uuid(),
      session_id: sessionId!,
      sender: 'user',
      content: userMessageContent,
      input_mode: audioResult ? 'microphone' : (strategyOverride ? 'strategy' : 'text'),
      voice_vibe: audioResult ? vibe : '',
      voice_intensity: audioResult ? intensity : undefined,
      voice_comment: voiceComment,
      vibe: audioResult ? vibe : undefined,
      intensity: audioResult ? intensity : undefined,
      context_note: voiceComment,
      created_at: new Date().toISOString()
    };

    const newMessagesList = [...messages, userMsg];
    setMessages(newMessagesList);
    setCurrentMessageIndex(newMessagesList.length - 1);
    setSending(true);

    try {
      // Background save user message
      gasPost('create', 'messages', userMsg);

      // 1. Get Context from GAS
      const context = await gasPost('get_chat_context', 'logs', {
        sessionId: sessionId,
        text: userMessageContent,
        vibe: vibe,
        intensity: intensity,
        voiceComment
      });

      if (context.error) throw new Error(context.error);

      // 2. Stream from Gemini (Directly from frontend for speed)
      const aiResponse = await getGeminiResponse(
        context.systemPrompt,
        context.history,
        (text) => {
          // Extract partial character name and line content for UI
          const charMatch = text.match(/"char":\s*"([^"]*)"/);
          if (charMatch) setStreamingChar(charMatch[1]);
          
          const match = text.match(/"line":\s*"([^"]*)"/);
          const partialMatch = text.match(/"line":\s*"([^"]*)$/);
          const displayContent = match ? match[1] : (partialMatch ? partialMatch[1] : "");
          if (displayContent) {
            setStreamingMessage(displayContent);
          }
        },
        context.geminiApiKey
      );

      // 3. Process Result in GAS
      const processResult = await gasPost('process_chat_result', 'logs', {
        sessionId: sessionId,
        aiResponse: aiResponse,
        state: context.state,
        userText: userMessageContent,
        voiceVibe: audioResult ? vibe : '',
        voiceIntensity: audioResult ? intensity : '',
        voiceComment
      });

      if (processResult.error) throw new Error(processResult.error);

      const aiMessages: Message[] = (aiResponse.dialogue || [])
        .filter((line: any) => {
          if (useFreeTextInput) {
            const char = line.char?.toLowerCase();
            return char !== 'narrator' && char !== 'system' && char !== 'บรรยาย';
          }
          return true;
        })
        .map((line: any) => ({
          id: uuid(),
          session_id: sessionId!,
          sender: 'ai',
          character_name: line.char,
          content: line.line,
          created_at: new Date().toISOString()
        }));

      // Background save AI messages
      if (aiMessages.length > 0) {
        Promise.all(aiMessages.map(msg => gasPost('create', 'messages', msg)));
      }

      const startIndex = messages.length;
      setMessages(prev => [...prev, ...aiMessages]);
      setNarrator(aiResponse.narrator);
      setStreamingMessage(null);
      setStreamingChar(null);
      
      if (aiMessages.length > 0) {
        setCurrentMessageIndex(startIndex);
      }
      
      if (processResult.game_over) {
        setIsGameOver(true);
        setOutcome(processResult.outcome);
      }
      
      if (processResult.state) {
        const finalState = processResult.state;
        setRuntimeState(finalState);
        if (finalState.current_phase) setPhase(finalState.current_phase);
        
        // Trigger UI Pulse if stats changed significantly
        setShowPulse(true);
        setTimeout(() => setShowPulse(false), 1000);

        setCharacters(prev => prev.map(c => {
          const rel = finalState.relationships?.[c.id] || finalState.relationships?.[c.name];
          if (rel) {
            return {
              ...c,
              mood: rel.anger > 7 ? 'resistant' : rel.trust > 7 ? 'open' : 'neutral',
              stats: { trust: rel.trust, anger: rel.anger }
            };
          }
          return c;
        }));
      }
      
      if (audioResult?.vibe) {
        setCurrentVibe(audioResult.vibe);
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'AI ไม่พร้อมใช้งานในขณะนี้');
    } finally {
      setSending(false);
      setStreamingMessage(null);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden relative flex-col lg:flex-row ${
      kidGameplayActive ? 'bg-kids-cream text-gray-900' : 'bg-slate-950 text-white'
    }`}>
      <CartoonLoading isOpen={loading || authLoading} message={loadingMessage} />
      
      {/* Mobile Header (Only on small screens) */}
      <div className={`lg:hidden flex items-center justify-between p-4 z-40 ${
        kidGameplayActive
          ? 'border-b-4 border-gray-900 bg-white/80'
          : 'border-b border-white/10 bg-black/40'
      }`}>
        <button
          onClick={() => router.push('/scenarios')}
          className={`p-2 rounded-lg ${kidGameplayActive ? 'border-2 border-gray-900 bg-white text-gray-900' : ''}`}
        >
          <ArrowLeft size={20}/>
        </button>
        <h1 className={`font-black text-sm truncate px-4 ${kidGameplayActive ? 'text-gray-900' : 'font-bold'}`}>{scenario?.title}</h1>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`p-2 rounded-lg border-2 border-gray-900 ${
            kidGameplayActive ? 'bg-white text-gray-900 shadow-[0_3px_0_#2b221a]' : 'text-cyan-400'
          }`}
        >
          <Users size={20}/>
        </button>
      </div>

      {/* Start Overlay */}
      {!isStarted && scenario && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-700">
          <div className={kidGameplayActive
            ? "max-w-xl p-12 bg-white border-[10px] border-gray-900 rounded-[4rem] text-center shadow-[0_30px_0_rgba(0,0,0,1)] animate-in fade-in zoom-in duration-500"
            : "max-w-xl p-12 bg-white/5 border border-white/20 rounded-3xl text-center animate-in fade-in zoom-in duration-500"
          }>
            <div className={kidGameplayActive
              ? "w-20 h-20 bg-nintendo-red rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-[0_8px_0_rgba(0,0,0,0.2)]"
              : "w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 mx-auto mb-6"
            }>
              <MessageSquare size={32} />
            </div>
            <h1 className={kidGameplayActive
              ? "text-5xl font-black text-gray-900 mb-4 uppercase tracking-normal leading-normal"
              : "text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4"
            }>
              {scenario?.title}
            </h1>
            <p className={kidGameplayActive ? "text-gray-600 font-bold mb-8 leading-relaxed text-xl" : "text-gray-300 mb-8 leading-relaxed"}>
              {scenario?.description}
            </p>
            <div className={kidGameplayActive
              ? "bg-gray-100 border-4 border-gray-900 p-6 rounded-3xl mb-8 text-left shadow-inner"
              : "bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl mb-8 text-left"
            }>
              <h3 className={kidGameplayActive ? "text-lg font-black text-gray-900 uppercase mb-2 flex items-center" : "text-xs font-bold text-cyan-400 uppercase mb-2 flex items-center"}>
                <Info size={14} className="mr-2" /> {kidGameplayActive ? 'เป้าหมาย!' : 'ภารกิจของคุณ'}
              </h3>
              <p className={kidGameplayActive ? "text-gray-700 font-bold leading-relaxed" : "text-sm text-gray-200"}>
                {scenario?.target_group === 'professional' 
                  ? "จัดการข้อพิพาททางธุรกิจนี้และค้นหาทางออกที่ตอบสนองผู้มีส่วนได้ส่วนเสียในขณะที่ปกป้องผลประโยชน์ของคุณ"
                  : "ช่วยเพื่อนของคุณแก้ไขความขัดแย้งและทำให้ทุกอย่างกลับมาเป็นปกติ"}
              </p>
            </div>
            <button
              onClick={handleStart}
              className={kidGameplayActive
                ? "px-16 py-6 bg-nintendo-red hover:bg-red-500 text-white font-black rounded-3xl transition-all shadow-[0_12px_0_rgba(179,0,14,1)] text-3xl uppercase tracking-tighter hover:translate-y-1 hover:shadow-[0_8px_0_rgba(179,0,14,1)] active:translate-y-3 active:shadow-none"
                : "px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-cyan-500/20 text-lg hover:scale-105 active:scale-95"
              }
            >
              {kidGameplayActive ? 'ลุยเลย!' : 'เริ่มการเจรจา'}
            </button>
          </div>
        </div>
      )}

      {/* Sidebar (Responsive) */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-72 transition-transform duration-300 transform lg:relative lg:translate-x-0 lg:flex
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        flex-col p-6
        ${kidGameplayActive
          ? 'border-r-4 border-gray-900 bg-white shadow-[4px_0_0_rgba(43,34,26,0.12)]'
          : 'border-r border-white/10 bg-slate-900/95 backdrop-blur-xl'
        }
      `}>
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => router.push('/scenarios')}
            className={`flex items-center text-sm font-bold transition-colors ${
              kidGameplayActive
                ? 'text-gray-900 hover:text-nintendo-red'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowLeft size={16} className="mr-2" /> ลานฝึกซ้อม
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`lg:hidden ${kidGameplayActive ? 'text-gray-900' : 'text-gray-500'}`}
          >
            <X size={20}/>
          </button>
        </div>

        <section className="mb-8">
          <h2 className={`text-xs font-black uppercase tracking-widest mb-4 flex items-center ${
            kidGameplayActive ? 'text-gray-900' : 'text-gray-500 font-bold'
          }`}>
            <Info size={14} className={`mr-2 ${kidGameplayActive ? 'text-nintendo-blue' : 'text-cyan-400'}`} /> เป้าหมายภารกิจ
          </h2>
          <div className={`p-4 rounded-xl border-2 ${
            kidGameplayActive
              ? 'bg-kids-cream border-gray-900 shadow-[0_4px_0_#2b221a]'
              : 'bg-cyan-500/5 border border-cyan-500/10'
          }`}>
            <p className={`text-xs leading-relaxed font-bold ${
              kidGameplayActive ? 'text-gray-800' : 'text-gray-300'
            }`}>
              {scenario?.target_group === 'professional' 
                ? "บรรลุข้อตกลงราคาที่ยุติธรรมโดยไม่สูญเสียความไว้วางใจ" 
                : "ทำให้ทุกคนกลับมาทำงานในโครงการก่อนกำหนดเวลา"}
            </p>
          </div>
        </section>

        <h2 className={`text-xs uppercase tracking-widest mb-4 flex items-center ${
          kidGameplayActive ? 'font-black text-gray-900' : 'font-bold text-gray-500'
        }`}>
          <Users size={14} className={`mr-2 ${kidGameplayActive ? 'text-nintendo-pink' : 'text-purple-400'}`} /> ผู้มีส่วนได้ส่วนเสีย
        </h2>
        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {characters.map((char, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl transition-all group ${
                kidGameplayActive
                  ? 'bg-white border-[3px] border-gray-900 shadow-[0_5px_0_#2b221a] hover:translate-y-0.5 hover:shadow-[0_3px_0_#2b221a]'
                  : 'bg-white/5 border border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black mr-3 border-2 border-gray-900 ${
                    kidGameplayActive
                      ? 'bg-nintendo-blue text-white shadow-[0_3px_0_#2b221a]'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600 font-bold shadow-lg'
                  }`}>
                    {char.name.charAt(0)}
                  </div>
                  <span className={`font-black text-sm ${kidGameplayActive ? 'text-gray-900' : 'font-bold'}`}>{char.name}</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  char.mood === 'open' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                  char.mood === 'resistant' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                  'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                }`}></div>
              </div>
              <p className={`text-[10px] italic mb-1 line-clamp-1 font-bold ${
                kidGameplayActive ? 'text-gray-600' : 'text-gray-500'
              }`}>{char.role}</p>
              
              {char.stats && (
                <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                  <span className={kidGameplayActive ? 'text-emerald-700' : 'text-green-400'}>Trust: {char.stats.trust}</span>
                  <span className={kidGameplayActive ? 'text-red-700' : 'text-red-400'}>Anger: {char.stats.anger}</span>
                </div>
              )}

              <div className={`h-1.5 w-full rounded-full overflow-hidden border ${
                kidGameplayActive ? 'bg-gray-200 border-gray-900' : 'bg-white/5'
              }`}>
                <div className={`h-full transition-all duration-500 ${
                  char.mood === 'open' ? 'w-full bg-green-500' :
                  char.mood === 'resistant' ? 'w-1/3 bg-red-500' :
                  'w-2/3 bg-yellow-500'
                }`}></div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Stage Area */}
      <main 
        className={`flex-1 flex flex-col items-center relative overflow-hidden cursor-pointer transition-all duration-1000 mx-auto w-full max-w-[1440px] ${
          kidGameplayActive
            ? (effectiveVibe === 'Serious' ? 'bg-[#fce8d4]' : effectiveVibe === 'Happy' ? 'bg-kids-cream' : 'bg-kids-cream-deep')
            : (effectiveVibe === 'Serious' ? 'bg-red-950/40' : effectiveVibe === 'Happy' ? 'bg-amber-950/20' : 'bg-slate-900/40')
        } ${showPulse ? 'scale-[1.01]' : 'scale-100'}`}
        onClick={advanceMessage}
      >
        {/* Vibe Background Layer */}
        <motion.div 
          animate={{ 
            backgroundColor: kidGameplayActive
              ? (effectiveVibe === 'Serious' ? 'rgba(251, 191, 177, 0.35)' :
                 effectiveVibe === 'Happy' ? 'rgba(253, 230, 138, 0.25)' : 'rgba(186, 230, 253, 0.2)')
              : (effectiveVibe === 'Serious' ? 'rgba(239, 68, 68, 0.1)' : 
                 effectiveVibe === 'Happy' ? 'rgba(248, 204, 0, 0.1)' : 'rgba(0, 0, 0, 0)'),
            opacity: kidGameplayActive ? [0.2, 0.35, 0.2] : [0.3, 0.5, 0.3]
          }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Dynamic Pattern Layer */}
        <div className={`absolute inset-0 pointer-events-none ${
          kidGameplayActive 
            ? 'opacity-[0.08] bg-[radial-gradient(rgba(43,34,26,0.22)_2px,transparent_2px)] [background-size:40px_40px]' 
            : 'opacity-20 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:100px_100px]'
        }`} />
        {angerDebugPreview && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-4 py-2 rounded-full bg-red-600 text-white text-xs font-black border-2 border-gray-900 shadow-[0_4px_0_#2b221a] uppercase tracking-wide">
            โหมดทดสอบ: ตัวละครโกรธ / พื้นหลังแดง (พิมพ์ anger 3 ครั้งปิด · Esc ออก)
          </div>
        )}

        {/* Header Layer */}
        <header className="w-full max-w-6xl flex justify-between items-start p-8 z-30 absolute top-0 pointer-events-auto">
          <div>
            <h1 className={kidGameplayActive
              ? 'text-2xl font-black text-gray-900'
              : 'text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-md'
            }>
              {scenario?.title || 'กำลังเตรียมข้อมูล...'}
            </h1>
            {kidGameplayActive ? (
              <span className="inline-flex mt-2 items-center gap-1.5 bg-white border-2 border-gray-900 text-gray-900 text-xs font-black uppercase tracking-wide px-3 py-1 rounded-full shadow-[0_3px_0_#2b221a]">
                เฟส: {
                  phase === 'rapport' ? 'สานสัมพันธ์' :
                  phase === 'discovery' ? 'สำรวจความต้องการ' :
                  phase === 'bargaining' ? 'ต่อรอง' : 'สรุปข้อตกลง'
                }
              </span>
            ) : (
              <p className="text-sm mt-1 text-gray-300 drop-shadow-md">
                เฟสปัจจุบัน: {
                  phase === 'rapport' ? 'สานสัมพันธ์' :
                  phase === 'discovery' ? 'สำรวจความต้องการ' :
                  phase === 'bargaining' ? 'ต่อรอง' : 'สรุปข้อตกลง'
                }
              </p>
            )}
          </div>
          <div className={`flex items-center gap-2 p-2 rounded-2xl border ${
            kidGameplayActive
              ? 'bg-white border-[3px] border-gray-900 shadow-[0_6px_0_#2b221a]'
              : 'bg-black/40 backdrop-blur-md border-white/5 space-x-3'
          }`}>
            {/* Mode Cycle: kid → adult → pro → kid */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (scenario?.target_group === 'professional') return;
                setMode(prev => prev === 'kid' ? 'adult' : prev === 'adult' ? 'pro' : 'kid');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all flex items-center border-2 ${
                scenario?.target_group === 'professional' ? 'opacity-60 cursor-default' : ''
              } ${
                kidGameplayActive
                  ? (mode === 'kid'
                    ? 'bg-purple-600 text-white border-gray-900 shadow-[0_4px_0_#2b221a]'
                    : mode === 'adult'
                      ? 'bg-white text-gray-900 border-gray-900 hover:bg-gray-50'
                      : 'bg-white text-gray-900 border-gray-900 hover:bg-gray-50')
                  : (mode === 'kid' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                    mode === 'adult' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30')
              }`}
              title={scenario?.target_group === 'professional' ? 'สถานการณ์นี้ใช้การพิมพ์อิสระ (โหมดผู้เชี่ยวชาญ)' : undefined}
            >
              {mode === 'kid' ? <><Baby size={16} className="mr-2" /> โหมดเด็ก</> :
               mode === 'adult' ? <><Briefcase size={16} className="mr-2" /> โหมดผู้ใหญ่</> :
               <><GraduationCap size={16} className="mr-2" /> โหมดผู้เชี่ยวชาญ</>}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowLogModal(true); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all flex items-center border-2 ${
                kidGameplayActive
                  ? 'bg-gray-900 text-white border-gray-900 shadow-[0_4px_0_#2b221a] hover:bg-gray-800'
                  : 'hover:bg-white/10 text-cyan-400'
              }`}
              title="ดูบันทึกการสนทนา"
            >
              <ScrollText size={16} className="mr-2"/> ประวัติ
            </button>
            <button 
              onClick={async (e) => { 
                e.stopPropagation(); 
                if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการยุติการเจรจาตอนนี้? (ระบบจะสรุปคะแนนจากผลงานปัจจุบัน)')) {
                  try {
                    setLoading(true);
                    setLoadingMessage('กำลังสรุปผลคะแนน...');
                    const result = await gasPost('end_session', 'sessions', { sessionId });
                    if (result.error) throw new Error(result.error);
                    router.push(`/debrief?sessionId=${sessionId}`);
                  } catch (err) {
                    console.error(err);
                    alert('เกิดข้อผิดพลาดในการจบการเจรจา กรุณาลองใหม่อีกครั้ง');
                    setLoading(false);
                  } finally {
                    setTimeout(() => setLoading(false), 5000); 
                  }
                }
              }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition-all border-2 ${
                kidGameplayActive
                  ? 'bg-nintendo-red text-white border-gray-900 shadow-[0_4px_0_#b3000e] hover:bg-red-600'
                  : 'bg-red-500/20 hover:bg-red-500/40 text-red-200'
              }`}
            >
              ยุติเซสชัน
            </button>
          </div>
        </header>

        {/* Character Stage Layer */}
        <div className={`absolute bottom-0 left-0 w-full h-full flex justify-center items-end space-x-4 sm:space-x-12 z-10 pointer-events-none ${
          kidGameplayActive ? 'pb-[38vh] sm:pb-[36vh]' : 'pb-[22vh]'
        }`}>
          {characters.map((char, i) => {
            const currentMsg = messages[currentMessageIndex];
            const isTalking = currentMsg?.sender === 'ai' && currentMsg?.character_name === char.name;
            
            // Reactive animation props
            const isAngry = angerDebugPreview || (char.stats?.anger || 0) > 6;
            const isHappy = !angerDebugPreview && (char.stats?.trust || 0) > 7;
            const displayMood = angerDebugPreview ? 'resistant' : (char.mood || 'neutral');

            return (
              <motion.div
                key={i}
                animate={{
                  y: isTalking ? [0, -10, 0] : isHappy ? [0, -5, 0] : 0,
                  x: isAngry ? [0, -2, 2, -2, 0] : 0,
                  scale: isTalking ? 1.05 : 1,
                  filter: isAngry ? 'sepia(0.3) saturate(2) hue-rotate(-30deg)' : 'none'
                }}
                transition={{
                  y: { repeat: isTalking || isHappy ? Infinity : 0, duration: isTalking ? 0.4 : 2 },
                  x: { repeat: isAngry ? Infinity : 0, duration: 0.1 }
                }}
              >
                <CharacterAvatar 
                  name={char.name} 
                  mood={displayMood} 
                  isTalking={isTalking} 
                />
              </motion.div>
            );
          })}
        </div>

        {/* UI / Dialogue Layer */}
        <div className={`absolute left-0 w-full z-20 px-4 flex justify-center pointer-events-none ${
          kidGameplayActive ? 'bottom-4 sm:bottom-6' : 'bottom-8'
        }`}>
          <div className={`w-full pointer-events-auto flex flex-col items-center relative ${
            kidGameplayActive ? 'max-w-3xl gap-3' : 'max-w-4xl'
          }`}>
            
            {error && (
              <div className="absolute -top-16 bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl text-red-400 text-sm flex items-center backdrop-blur-md shadow-lg">
                <Info size={16} className="mr-2" />
                {error}
                <button onClick={(e) => { e.stopPropagation(); handleSend(); }} className="ml-4 font-bold underline text-white hover:text-red-200">ย้ำอีกครั้ง</button>
              </div>
            )}

            {sending && (
              <div className="absolute -top-12">
                 <span className="text-cyan-400 animate-pulse text-sm font-bold tracking-widest bg-black/60 px-6 py-2 rounded-full border border-cyan-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                   ผู้เชี่ยวชาญกำลังคิด...
                 </span>
              </div>
            )}

            {/* Input Bar (Only visible when it's user's turn) */}
            <div className={`w-full mb-6 transition-all duration-700 ${
              currentMessageIndex < messages.length - 1 || isTyping 
                ? 'opacity-0 translate-y-10 pointer-events-none absolute bottom-full' 
                : 'opacity-100 translate-y-0 relative z-30'
            }`}>
              {kidGameplayActive ? (
                <div className="w-full flex flex-col items-center z-20 relative">
                  <div className="bg-white border-4 border-gray-900 px-6 py-2 rounded-full mb-3 text-sm font-black text-gray-900 flex items-center shadow-[0_6px_0_rgba(0,0,0,1)] uppercase tracking-normal">
                    <Sparkles size={16} className="mr-2 text-nintendo-yellow" /> เลือกการ์ดการกระทำ!
                  </div>
                  <KidGameplay 
                    onSelect={(s, res) => handleSend(s, res)} 
                    dynamicDecisions={currentDynamicDecisions}
                    disabled={sending || currentMessageIndex < messages.length - 1 || isTyping}
                  />
                </div>
              ) : mode === 'adult' && !useFreeTextInput ? (
                <StrategyBlocks
                  onSelect={(s) => handleSend(s)}
                  disabled={sending || currentMessageIndex < messages.length - 1 || isTyping}
                  isKidMode={false}
                />
              ) : (
                <div className="w-full flex items-center space-x-4">
                  <div className="flex-1 border p-2 rounded-[2rem] flex items-center shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl bg-slate-900/90 border-white/20 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                    <div className="pl-6 text-emerald-400">
                      <GraduationCap size={20} />
                    </div>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!isStarted || sending || currentMessageIndex < messages.length - 1 || isTyping}
                      placeholder="พิมพ์อิสระ... ใช้ทักษะการเจรจาขั้นสูงของคุณ (กด Enter เพื่อส่ง)"
                      className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-[17px] placeholder:text-gray-500 text-white font-sans"
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSend(); }}
                      disabled={sending || !input.trim() || !isStarted || currentMessageIndex < messages.length - 1 || isTyping}
                      className={`p-4 rounded-full transition-all text-white ${
                        !input.trim() || !isStarted || sending || currentMessageIndex < messages.length - 1 || isTyping
                          ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-emerald-400 to-teal-600 shadow-[0_0_20px_rgba(52,211,153,0.4)] hover:scale-110 active:scale-95'
                      }`}
                    >
                      <Send size={20} className={input.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                    </button>
                  </div>
                  
                  <VoiceRecorder 
                    onTranscription={(res) => handleSend(undefined, res)}
                    disabled={sending || currentMessageIndex < messages.length - 1 || isTyping}
                  />
                </div>
              )}
            </div>

            {/* Narrator text */}
            {!useFreeTextInput && narrator && currentMessageIndex === messages.length - 1 && !isTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 px-6 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl text-xs font-bold text-gray-400 italic text-center"
              >
                {narrator}
              </motion.div>
            )}

            {/* Dialogue Box */}
            {(messages.length > 0 || streamingMessage) && (
              <div className={`w-full relative ${kidGameplayActive ? 'z-30' : ''}`}>
              <DialogueBox 
                sender={streamingMessage ? 'ai' : (messages[currentMessageIndex]?.sender || 'ai')}
                characterName={
                  streamingMessage 
                    ? (characters.find(c => c.id === streamingChar || c.name === streamingChar)?.name || streamingChar || 'AI') 
                    : (messages[currentMessageIndex]?.sender === 'ai' 
                        ? (characters.find(c => c.id === messages[currentMessageIndex]?.character_name || c.name === messages[currentMessageIndex]?.character_name)?.name || messages[currentMessageIndex]?.character_name)
                        : 'คุณ')
                }
                content={streamingMessage || (messages[currentMessageIndex]?.content || '')}
                isTyping={streamingMessage ? false : isTyping}
                onTypingComplete={() => setIsTyping(false)}
                isLastMessage={streamingMessage ? true : currentMessageIndex === messages.length - 1}
                isKidMode={kidGameplayActive}
              />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Log Modal */}
      {showLogModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl h-[80vh] bg-slate-900 border border-white/20 rounded-3xl flex flex-col shadow-[0_0_50px_rgba(34,211,238,0.1)]">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h2 className="text-xl font-bold flex items-center text-cyan-400">
                <ScrollText className="mr-3" /> บันทึกการสนทนาทั้งหมด
              </h2>
              <button 
                onClick={() => setShowLogModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.slice(0, currentMessageIndex + 1).map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[12px] text-gray-400 mb-1 font-bold flex items-center">
                    {m.sender === 'user' ? 'คุณ' : m.character_name}
                  </span>
                  <div className={`px-5 py-3 rounded-2xl max-w-[85%] text-[15px] leading-relaxed shadow-lg ${
                    m.sender === 'user' 
                      ? 'bg-blue-600 text-blue-50 rounded-tr-sm' 
                      : 'bg-slate-800 text-gray-200 rounded-tl-sm border border-white/10'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameOver && currentMessageIndex === messages.length - 1 && !isTyping && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-1000">
          <div className={`max-w-md w-full p-10 text-center rounded-3xl shadow-2xl border-2 ${
            outcome === 'win' ? 'bg-gradient-to-b from-green-900/90 to-emerald-950 border-green-500/50' : 'bg-gradient-to-b from-red-900/90 to-rose-950 border-red-500/50'
          }`}>
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${
              outcome === 'win' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {outcome === 'win' ? <Sparkles size={40} /> : <Info size={40} />}
            </div>
            <h2 className="text-4xl font-black text-white mb-4 drop-shadow-md">
              {outcome === 'win' ? 'สำเร็จ!' : 'ล้มเหลว'}
            </h2>
            <p className="text-gray-300 mb-8 leading-relaxed">
              {narrator || (outcome === 'win' ? 'การเจรจาจบลงด้วยดี คุณสามารถหาข้อตกลงร่วมกันได้' : 'การเจรจาล้มเหลว ไม่สามารถหาข้อสรุปได้ในเวลาที่กำหนด')}
            </p>
            <button
              onClick={() => router.push(`/debrief?sessionId=${sessionId}`)}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:scale-105 active:scale-95 ${
                outcome === 'win' 
                  ? 'bg-green-500 hover:bg-green-400 text-white shadow-green-500/20' 
                  : 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
              }`}
            >
              ดูผลลัพธ์การประเมิน
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default function NegotiatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <NegotiateContent />
    </Suspense>
  );
}
