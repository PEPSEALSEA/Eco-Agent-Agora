'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gasFetch, gasPost, uuid } from '@/lib/gas';
import { useAuth } from '@/components/AuthProvider';
import { Send, User as UserIcon, Bot, ArrowLeft, MessageSquare, Info, Users, ScrollText, X, Mic } from 'lucide-react';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { DialogueBox } from '@/components/DialogueBox';
import { StrategyBlocks, Strategy } from '@/components/StrategyBlocks';
import { ReignsSystem } from '@/components/ReignsSystem';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Baby, Briefcase, GraduationCap } from 'lucide-react';
import { CartoonLoading } from '@/components/CartoonLoading';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        // Fetch session
        const allData = await gasFetch('read_all');
        if (allData.error) throw new Error(allData.error);

        const sessionData = allData.sessions.find((s: any) => s.id === sessionId);
        if (!sessionData) {
          router.push('/scenarios');
          return;
        }

        const scenarioData = allData.scenarios.find((s: any) => s.id === sessionData.scenario_id);
        if (!scenarioData) {
          router.push('/scenarios');
          return;
        }

        setSession(sessionData);
        setScenario(scenarioData);
        setCharacters(scenarioData.characters.map((c: any) => ({ ...c, mood: 'neutral' })));

        // Fetch messages
        const messagesData = allData.messages.filter((m: any) => m.session_id === sessionId)
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        setMessages(messagesData);
        if (messagesData.length > 0) {
          setCurrentMessageIndex(messagesData.length - 1);
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
      const result = await gasPost('chat', 'logs', {
        sessionId: sessionId,
        text: "[System: เริ่มต้นสถานการณ์ อ้างอิงจาก opening_scene และ phase_rules. กรุณาเริ่มบทสนทนาได้เลย]",
        vibe: "Neutral",
        intensity: 0.5
      });

      if (result.error) throw new Error(result.error);

      const aiMessages: Message[] = (result.dialogue || [])
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
      
      // Save AI messages to database individually for correct formatting
      if (aiMessages.length > 0) {
        await Promise.all(aiMessages.map(msg => gasPost('create', 'messages', msg)));
      }

      setMessages(aiMessages);
      setCurrentMessageIndex(0);
      setNarrator(result.narrator);
      
      if (result.state) {
        setRuntimeState(result.state);
        if (result.state.current_phase) setPhase(result.state.current_phase);
        
        setCharacters(prev => prev.map(c => {
          const rel = result.state.relationships?.[c.id] || result.state.relationships?.[c.name];
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
    }
  };

  const handleSend = async (strategyOverride?: Strategy, audioResult?: { text: string, vibe: string, intensity: number }) => {
    if ((!input.trim() && !strategyOverride && !audioResult) || !user || sending || !sessionId) {
      if (!user) setError('คุณต้องเข้าสู่ระบบเพื่อส่งข้อความ');
      return;
    }

    const userMessageContent = audioResult ? audioResult.text : (strategyOverride ? strategyOverride.thaiLabel : input);
    const vibe = audioResult ? audioResult.vibe : "Neutral";
    const intensity = audioResult ? audioResult.intensity : 0.5;
    
    // Clear input and show user message immediately
    if (!audioResult) setInput('');
    setError(null);

    const userMsg: Message = {
      id: uuid(),
      session_id: sessionId!,
      sender: 'user',
      content: userMessageContent,
      created_at: new Date().toISOString()
    };

    const newMessagesList = [...messages, userMsg];
    setMessages(newMessagesList);
    setCurrentMessageIndex(newMessagesList.length - 1);

    // Now start the loading state for AI processing
    setSending(true);

    try {
      // Save to background
      const saveResult = await gasPost('create', 'messages', userMsg);
      if (saveResult.error) {
        setError('ไม่สามารถบันทึกข้อความได้');
        setSending(false);
        return;
      }

      const result = await gasPost('chat', 'logs', {
        sessionId: sessionId,
        text: userMessageContent,
        vibe: vibe,
        intensity: intensity,
        // FAST PATH: Send current state to avoid Sheet reads
        scenario: scenario,
        state: runtimeState,
        history_summary: session?.history_summary,
        recent_messages: newMessagesList.slice(-10)
      });

      if (result.error) throw new Error(result.error);

      const aiMessages: Message[] = (result.dialogue || [])
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

      // Save AI messages to database individually for correct formatting
      if (aiMessages.length > 0) {
        // Use Promise.all to save messages in parallel
        await Promise.all(aiMessages.map(msg => gasPost('create', 'messages', msg)));
      }

      setMessages(prev => [...prev, ...aiMessages]);
      setNarrator(result.narrator);
      
      if (result.game_over) {
        setIsGameOver(true);
        setOutcome(result.outcome);
      }
      
      if (result.state) {
        setRuntimeState(result.state);
        if (result.state.current_phase) setPhase(result.state.current_phase);
        
        setCharacters(prev => prev.map(c => {
          const rel = result.state.relationships?.[c.id] || result.state.relationships?.[c.name];
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
      setError(err.message || 'AI ไม่พร้อมใช้งานในขณะนี้');
    } finally {
      setSending(false);
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
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden relative">
      <CartoonLoading isOpen={loading || authLoading} message={loadingMessage} />
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

      {/* Sidebar */}
      <aside className="w-80 border-r border-white/10 bg-black/40 flex flex-col p-6 z-10">
        <button 
          onClick={() => router.push('/scenarios')}
          className="flex items-center text-gray-400 hover:text-white mb-8 transition-colors text-sm"
        >
          <ArrowLeft size={16} className="mr-2" /> ลานฝึกซ้อม
        </button>

        <section className="mb-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center">
            <Info size={14} className="mr-2 text-cyan-400" /> เป้าหมายภารกิจ
          </h2>
          <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
            <p className="text-xs text-gray-300 leading-relaxed">
              {scenario?.target_group === 'professional' 
                ? "บรรลุข้อตกลงราคาที่ยุติธรรมโดยไม่สูญเสียความไว้วางใจ" 
                : "ทำให้ทุกคนกลับมาทำงานในโครงการก่อนกำหนดเวลา"}
            </p>
          </div>
        </section>

        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center">
          <Users size={14} className="mr-2 text-purple-400" /> ผู้มีส่วนได้ส่วนเสีย
        </h2>
        <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {characters.map((char, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold mr-3 shadow-lg">
                    {char.name.charAt(0)}
                  </div>
                  <span className="font-bold text-sm">{char.name}</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  char.mood === 'open' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                  char.mood === 'resistant' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                  'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                }`}></div>
              </div>
              <p className="text-[10px] text-gray-500 italic mb-1 line-clamp-1">{char.role}</p>
              
              {char.stats && (
                <div className="flex justify-between text-[9px] font-bold uppercase mb-1">
                  <span className="text-green-400">Trust: {char.stats.trust}</span>
                  <span className="text-red-400">Anger: {char.stats.anger}</span>
                </div>
              )}

              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
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
        className={`flex-1 flex flex-col items-center relative overflow-hidden cursor-pointer transition-colors duration-1000 ${
          kidGameplayActive
            ? 'bg-nintendo-yellow/20 bg-[radial-gradient(#f8cc00_2px,transparent_2px)] [background-size:60px_60px]' 
            : 'cartoon-bg-dark-blue'
        }`}
        onClick={advanceMessage}
      >
        {/* Header Layer */}
        <header className="w-full max-w-6xl flex justify-between items-start p-8 z-30 absolute top-0 pointer-events-auto">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-md">
              {scenario?.title || 'กำลังเตรียมข้อมูล...'}
            </h1>
            <p className="text-sm text-gray-300 drop-shadow-md mt-1">
              เฟสปัจจุบัน: {
                phase === 'rapport' ? 'สานสัมพันธ์' : 
                phase === 'discovery' ? 'สำรวจความต้องการ' : 
                phase === 'bargaining' ? 'ต่อรอง' : 'สรุปข้อตกลง'
              }
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-black/40 p-2 rounded-2xl backdrop-blur-md border border-white/5">
            {/* Mode Cycle: kid → adult → pro → kid */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (scenario?.target_group === 'professional') return;
                setMode(prev => prev === 'kid' ? 'adult' : prev === 'adult' ? 'pro' : 'kid');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center ${
                scenario?.target_group === 'professional' ? 'opacity-60 cursor-default' : ''
              } ${
                mode === 'kid' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                mode === 'adult' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
              title={scenario?.target_group === 'professional' ? 'สถานการณ์นี้ใช้การพิมพ์อิสระ (โหมดผู้เชี่ยวชาญ)' : undefined}
            >
              {mode === 'kid' ? <><Baby size={16} className="mr-2" /> โหมดเด็ก</> :
               mode === 'adult' ? <><Briefcase size={16} className="mr-2" /> โหมดผู้ใหญ่</> :
               <><GraduationCap size={16} className="mr-2" /> โหมดผู้เชี่ยวชาญ</>}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setShowLogModal(true); }}
              className="px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-bold transition-all text-cyan-400 flex items-center"
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
                    // Note: We don't set loading false here because we are navigating away
                    // But if navigation fails or stays, we should allow user to try again
                    setTimeout(() => setLoading(false), 5000); 
                  }
                }
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 rounded-xl text-sm font-bold transition-all"
            >
              ยุติเซสชัน
            </button>
          </div>
        </header>

        {/* Character Stage Layer */}
        <div className="absolute bottom-0 left-0 w-full h-full flex justify-center items-end space-x-4 sm:space-x-12 pb-[22vh] z-10 pointer-events-none">
          {characters.map((char, i) => {
            const currentMsg = messages[currentMessageIndex];
            const isTalking = currentMsg?.sender === 'ai' && currentMsg?.character_name === char.name;
            
            return (
              <CharacterAvatar 
                key={i} 
                name={char.name} 
                mood={char.mood || 'neutral'} 
                isTalking={isTalking} 
              />
            );
          })}
        </div>

        {/* UI / Dialogue Layer */}
        <div className="absolute bottom-8 left-0 w-full z-20 px-4 flex justify-center pointer-events-none">
          <div className="w-full max-w-4xl pointer-events-auto flex flex-col items-center relative">
            
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
                <div className="w-full flex flex-col items-center">
                  <div className="bg-white border-4 border-gray-900 px-6 py-2 rounded-full mb-4 text-sm font-black text-gray-900 flex items-center shadow-[0_6px_0_rgba(0,0,0,1)] uppercase tracking-normal">
                    <Sparkles size={16} className="mr-2 text-nintendo-yellow" /> ปัดเพื่อตัดสินใจ!
                  </div>
                  <ReignsSystem 
                    onSelect={(s) => handleSend(s)} 
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
            {messages.length > 0 && currentMessageIndex >= 0 && (
              <DialogueBox 
                sender={messages[currentMessageIndex]?.sender || 'ai'}
                characterName={
                  messages[currentMessageIndex]?.sender === 'ai' 
                    ? (characters.find(c => c.id === messages[currentMessageIndex]?.character_name)?.name || messages[currentMessageIndex]?.character_name)
                    : 'คุณ'
                }
                content={messages[currentMessageIndex]?.content || ''}
                isTyping={isTyping}
                onTypingComplete={() => setIsTyping(false)}
                isLastMessage={currentMessageIndex === messages.length - 1}
                isKidMode={kidGameplayActive}
              />
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
