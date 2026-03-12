'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getGeminiResponse } from '@/lib/gemini';
import { useAuth } from '@/components/AuthProvider';
import { Send, User as UserIcon, Bot, ArrowLeft, MessageSquare, Info, Users } from 'lucide-react';

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

function NegotiateContent() {
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
      else setMessages(messageData || []);

      setLoading(false);
    };

    fetchData();
  }, [sessionId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending || !sessionId) {
      if (!user) setError('You must be logged in to send messages.');
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
      setError('Failed to send message to database');
      setSending(false);
      return;
    }

    setMessages(prev => [...prev, userMsg]);

    // 2. Prepare Gemini Prompt (System Instruction)
    const systemInstruction = `
      You are a multi-character negotiation simulator. Play ALL characters in one JSON response.
      Characters: ${JSON.stringify(scenario.characters)}
      Rules: Respond based on agenda/personality. Adjust tone based on user's message.
      Format:
      {
        "characters": [{"name": "...", "mood": "open|neutral|resistant", "message": "..."}],
        "feedback": {"score": 1-10, "text": "...", "dimensions": {"length": "...", "coverage": "...", "logic": "..."}}
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

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'The AI is currently unavailable. Please try again.');
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
    <div className="flex h-screen bg-slate-950 text-white">
      {/* Character Sidebar */}
      <aside className="w-80 border-r border-white/10 bg-white/5 flex flex-col p-6">
        <button 
          onClick={() => router.push('/scenarios')}
          className="flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" /> Back to Scenarios
        </button>
        <h2 className="text-xl font-bold mb-6 flex items-center">
          <Users size={20} className="mr-2 text-cyan-400" /> Stakeholders
        </h2>
        <div className="space-y-4 flex-1 overflow-y-auto pr-2">
          {characters.map((char, i) => (
            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-sm">{char.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                  char.mood === 'open' ? 'bg-green-500/20 text-green-400' :
                  char.mood === 'resistant' ? 'bg-red-500/20 text-red-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {char.mood || 'neutral'}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 italic mb-1">{char.role}</p>
              <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${
                  char.mood === 'open' ? 'w-full bg-green-500' :
                  char.mood === 'resistant' ? 'w-1/3 bg-red-500' :
                  'w-2/3 bg-yellow-500'
                }`}></div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <p className="text-xs text-cyan-400 flex items-center mb-1">
            <Info size={12} className="mr-1" /> Strategy Tip
          </p>
          <p className="text-[10px] text-gray-300">
            {scenario.target_group === 'professional' 
              ? "Focus on resolving the investor's cost concerns while building trust with farmers."
              : "Try to understand the underlying issues of the defensive team member."}
          </p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col items-center justify-between p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black">
        <header className="w-full max-w-4xl flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            {scenario.title}
          </h1>
          <button 
            onClick={() => router.push(`/debrief?sessionId=${sessionId}`)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all"
          >
            End & Debrief
          </button>
        </header>

        <div className="w-full max-w-4xl flex-1 overflow-y-auto mb-6 scrollbar-hide space-y-4 px-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${
                m.sender === 'user' 
                  ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-br-none' 
                  : 'bg-white/5 border border-white/10 text-gray-200 rounded-bl-none'
              }`}>
                {m.sender === 'ai' && (
                  <p className="text-[10px] font-bold text-cyan-400 mb-1 uppercase">
                    {m.character_name}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{m.content}</p>
                <span className="text-[9px] text-white/40 block mt-2">
                  {new Date(m.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-bl-none animate-pulse">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-xs flex items-center">
                <Info size={14} className="mr-2" />
                {error}
                <button 
                  onClick={() => handleSend()} 
                  className="ml-4 underline hover:text-red-300 font-bold"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="w-full max-w-4xl bg-white/5 border border-white/10 p-2 rounded-2xl flex items-center shadow-2xl backdrop-blur-md">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your response..."
            className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="p-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-700 text-white rounded-xl transition-all shadow-lg shadow-cyan-500/20"
          >
            <Send size={20} />
          </button>
        </div>
      </main>
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
