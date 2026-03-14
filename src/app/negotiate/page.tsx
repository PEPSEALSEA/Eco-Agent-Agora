'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getGeminiResponse } from '@/lib/gemini';
import { useAuth } from '@/components/AuthProvider';
import { Send, User as UserIcon, Bot, ArrowLeft, MessageSquare, Info, Users, ScrollText, X } from 'lucide-react';
import { CharacterAvatar } from '@/components/CharacterAvatar';
import { DialogueBox } from '@/components/DialogueBox';

type Character = {
  name: string;
  role: string;
  agenda: string;
  personality: string;
  mood?: 'open' | 'neutral' | 'resistant';
};

type Message = {
  id?: string;
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
  const [sending, setSending] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!sessionId) return;

    const fetchData = async () => {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*, scenarios(*)')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error(sessionError);
        router.push('/scenarios');
        return;
      }

      setSession(sessionData);
      setScenario(sessionData.scenarios);
      setCharacters(sessionData.scenarios.characters.map((c: any) => ({ ...c, mood: 'neutral' })));

      // Fetch messages
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messageError) console.error(messageError);
      else {
        const msgs = messageData || [];
        setMessages(msgs);
        if (msgs.length > 0) {
          setCurrentMessageIndex(msgs.length - 1);
          setIsStarted(true); // If there are messages, the session has already started
        }
      }

      setLoading(false);
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
    setSending(true);

    const systemInstruction = `
      You are a multi-character negotiation simulator. Play ALL characters in one JSON response.
      Current Scenario: ${scenario.title} - ${scenario.description}
      Characters: ${JSON.stringify(scenario.characters)}
      
      TASK: Provide an initial greeting and opening statement from the key characters to start the negotiation. 
      The player is a negotiator trying to achieve the following: ${scenario.target_group === 'professional' ? 'Resolve the conflict fairly while meeting business goals.' : 'Help friends resolve their conflict.'}
      
      CRITICAL RULE: ALL character messages AND feedback MUST BE IN THAI LANGUAGE.
      
      Format:
      {
        "characters": [{"name": "...", "mood": "neutral", "message": "ข้อความภาษาไทย..."}],
        "feedback": {"score": 5, "text": "เริ่มการเจรจา...", "dimensions": {"length": "appropriate", "coverage": "initial", "logic": "starting"}}
      }
    `;

    try {
      const geminiData = await getGeminiResponse(systemInstruction, []);
      const aiMessages: any[] = [];
      
      for (const charResp of geminiData.characters) {
        const { data: aiMsg, error: aiMsgError } = await supabase
          .from('messages')
          .insert([{ session_id: sessionId, sender: 'ai', character_name: charResp.name, content: charResp.message }])
          .select().single();
        if (!aiMsgError) aiMessages.push(aiMsg);
      }

      setMessages(prev => {
        const updated = [...prev, ...aiMessages];
        if (prev.length === 0) setCurrentMessageIndex(0);
        return updated;
      });
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError('การเริ่มต้น AI ล้มเหลว คุณยังสามารถพิมพ์เพื่อเริ่มได้ ' + errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !user || sending || !sessionId) {
      if (!user) setError('คุณต้องเข้าสู่ระบบเพื่อส่งข้อความ');
      return;
    }

    setSending(true);
    setError(null);
    const userMessageContent = input;
    setInput('');

    // 1. Save User Message
    const { data: userMsg, error: userMsgError } = await supabase
      .from('messages')
      .insert([
        { session_id: sessionId, sender: 'user', content: userMessageContent }
      ])
      .select()
      .single();

    if (userMsgError) {
      console.error(userMsgError);
      setError('ไม่สามารถส่งข้อความไปยังฐานข้อมูลได้');
      setSending(false);
      return;
    }

    const newMessagesList = [...messages, userMsg];
    setMessages(newMessagesList);
    setCurrentMessageIndex(newMessagesList.length - 1);

    // 2. Prepare Gemini Prompt (System Instruction)
    const systemInstruction = `
      You are a multi-character negotiation simulator. Play ALL characters in one JSON response.
      Characters: ${JSON.stringify(scenario.characters)}
      Rules: Respond based on agenda/personality. Adjust tone based on user's message.
      CRITICAL RULE: ALL character messages AND feedback MUST BE IN THAI LANGUAGE.
      Format:
      {
        "characters": [{"name": "...", "mood": "open|neutral|resistant", "message": "ข้อความภาษาไทย..."}],
        "feedback": {"score": 1-10, "text": "ข้อเสนอแนะภาษาไทย...", "dimensions": {"length": "...", "coverage": "...", "logic": "..."}}
      }
    `;

    // 3. Prepare and Prune History (Cost optimization: keep last 15 messages)
    const chatHistory = messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })).slice(-15);
    
    chatHistory.push({ role: 'user', parts: [{ text: userMessageContent }] });

    try {
      const geminiData = await getGeminiResponse(systemInstruction, chatHistory);

      // 4. Process AI Responses
      const aiMessages: any[] = [];
      for (const charResp of geminiData.characters) {
        const { data: aiMsg, error: aiMsgError } = await supabase
          .from('messages')
          .insert([
            { 
              session_id: sessionId, 
              sender: 'ai', 
              character_name: charResp.name, 
              content: charResp.message 
            }
          ])
          .select()
          .single();

        if (aiMsgError) console.error(aiMsgError);
        else aiMessages.push(aiMsg);
      }

      setMessages(prev => [...prev, ...aiMessages]);
      
      // Update moods in local state
      setCharacters(prev => prev.map(c => {
        const charUpdate = geminiData.characters.find((cr: any) => cr.name === c.name);
        return charUpdate ? { ...c, mood: charUpdate.mood } : c;
      }));

      // 4. Save Feedback
      const { error: feedbackError } = await supabase
        .from('feedback_logs')
        .insert([
          {
            session_id: sessionId,
            message_id: userMsg.id,
            feedback_text: geminiData.feedback.text,
            score: geminiData.feedback.score,
            dimension: JSON.stringify(geminiData.feedback.dimensions)
          }
        ]);

      if (feedbackError) console.error(feedbackError);

      // 5. Update Skills (Simplified logic)
      const skills = ['opening_conversation', 'handling_pushback', 'finding_common_ground', 'empathy_expression', 'logical_argument'];
      const skillName = skills[Math.floor(Math.random() * skills.length)];
      await supabase.rpc('increment_skill_xp', { 
        p_user_id: user.id, 
        p_skill_name: skillName, 
        p_xp: geminiData.feedback.score * 10 
      });

    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage || 'AI ไม่พร้อมใช้งานในขณะนี้ โปรดลองอีกครั้ง');
    } finally {
      setSending(false);
    }
  };

  if (loading || !sessionId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden relative">
      {/* Start Overlay */}
      {!isStarted && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-700">
          <div className="max-w-xl p-12 bg-white/5 border border-white/20 rounded-3xl text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center text-cyan-400 mx-auto mb-6">
              <MessageSquare size={32} />
            </div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-4">
              {scenario.title}
            </h1>
            <p className="text-gray-300 mb-8 leading-relaxed">
              {scenario.description}
            </p>
            <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl mb-8 text-left">
              <h3 className="text-xs font-bold text-cyan-400 uppercase mb-2 flex items-center">
                <Info size={14} className="mr-2" /> ภารกิจของคุณ
              </h3>
              <p className="text-sm text-gray-200">
                {scenario.target_group === 'professional' 
                  ? "จัดการข้อพิพาททางธุรกิจนี้และค้นหาทางออกที่ตอบสนองผู้มีส่วนได้ส่วนเสียในขณะที่ปกป้องผลประโยชน์ของคุณ"
                  : "ช่วยเพื่อนของคุณแก้ไขความขัดแย้งและทำให้ทุกอย่างกลับมาเป็นปกติ"}
              </p>
            </div>
            <button
              onClick={handleStart}
              className="px-12 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-cyan-500/20 text-lg hover:scale-105 active:scale-95"
            >
              เริ่มการเจรจา
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
              {scenario.target_group === 'professional' 
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
              <p className="text-[10px] text-gray-500 italic mb-3 line-clamp-1">{char.role}</p>
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
        className="flex-1 flex flex-col items-center relative overflow-hidden bg-gradient-to-b from-indigo-950/40 via-slate-900 to-black cursor-pointer"
        onClick={advanceMessage}
      >
        {/* Header Layer */}
        <header className="w-full max-w-6xl flex justify-between items-start p-8 z-30 absolute top-0 pointer-events-auto">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-md">
              {scenario.title}
            </h1>
            <p className="text-sm text-gray-300 drop-shadow-md mt-1">ระดับการเจรจา: ปานกลาง</p>
          </div>
          <div className="flex items-center space-x-3 bg-black/40 p-2 rounded-2xl backdrop-blur-md border border-white/5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowLogModal(true); }}
              className="px-4 py-2 hover:bg-white/10 rounded-xl text-sm font-bold transition-all text-cyan-400 flex items-center"
              title="ดูบันทึกการสนทนา"
            >
              <ScrollText size={16} className="mr-2"/> ประวัติ
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); router.push(`/debrief?sessionId=${sessionId}`); }}
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
            <div className={`w-full mb-6 border p-2 rounded-[2rem] flex items-center shadow-[0_15px_40px_rgba(0,0,0,0.6)] backdrop-blur-2xl transition-all duration-700 ${
              currentMessageIndex < messages.length - 1 || isTyping 
                ? 'opacity-0 translate-y-10 focus-within:opacity-0 pointer-events-none absolute bottom-full' 
                : 'opacity-100 translate-y-0 bg-slate-900/90 border-white/20 hover:border-cyan-500/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.15)] relative z-30'
            }`}>
              <div className="pl-6 text-cyan-400">
                <MessageSquare size={20} />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                onClick={(e) => e.stopPropagation()}
                disabled={!isStarted || sending || currentMessageIndex < messages.length - 1 || isTyping}
                placeholder="พิมพ์ข้อโต้แย้งของคุณที่นี่... (กด Enter เพื่อส่ง)"
                className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-[17px] placeholder:text-gray-500 text-white font-sans"
              />
              <button
                onClick={(e) => { e.stopPropagation(); handleSend(); }}
                disabled={sending || !input.trim() || !isStarted || currentMessageIndex < messages.length - 1 || isTyping}
                className={`p-4 rounded-full transition-all text-white ${
                  !input.trim() || !isStarted || sending || currentMessageIndex < messages.length - 1 || isTyping
                    ? 'bg-white/5 text-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:scale-110 active:scale-95'
                }`}
              >
                <Send size={20} className={input.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
              </button>
            </div>

            {/* Dialogue Box */}
            {messages.length > 0 && currentMessageIndex >= 0 && (
              <DialogueBox 
                sender={messages[currentMessageIndex]?.sender || 'ai'}
                characterName={messages[currentMessageIndex]?.character_name}
                content={messages[currentMessageIndex]?.content || ''}
                isTyping={isTyping}
                onTypingComplete={() => setIsTyping(false)}
                isLastMessage={currentMessageIndex === messages.length - 1}
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
