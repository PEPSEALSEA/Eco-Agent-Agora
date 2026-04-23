'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gasFetch } from '@/lib/gas';
import { getGeminiResponse } from '@/lib/gemini';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, RefreshCcw, TrendingUp, Zap, HelpCircle } from 'lucide-react';

function DebriefContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [whatIfLoading, setWhatIfLoading] = useState<string | null>(null);
  const [whatIfResponse, setWhatIfResponse] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    
    const fetchData = async () => {
      try {
        const allData = await gasFetch('read_all');
        if (allData.error) throw new Error(allData.error);

        const sessionData = allData.sessions.find((s: any) => s.id === sessionId);
        const messageData = allData.messages.filter((m: any) => m.session_id === sessionId)
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const feedbackData = allData.feedback_logs.filter((f: any) => f.session_id === sessionId);

        setSession(sessionData);
        setMessages(messageData || []);
        setFeedback(feedbackData || []);
      } catch (err) {
        console.error('Fetch debrief data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  const handleWhatIf = async (messageId: string, originalContent: string) => {
    setWhatIfLoading(messageId);
    setWhatIfResponse(null);
    
    try {
      const systemPrompt = `
        You are a negotiation coach. The user is looking at a "What If" scenario.
        They previously said: "${originalContent}"
        Analyze this and describe how a more empathetic or more logical approach (depending on what was missing) would have changed the mood of the stakeholders.
        Keep it brief and insightful.
      `;
      
      const history = [{ role: 'user', parts: [{ text: "What if I said something else?" }] }];
      const result = await getGeminiResponse(systemPrompt, history);
      setWhatIfResponse(result.feedback.text);
    } catch (err) {
      console.error(err);
    } finally {
      setWhatIfLoading(null);
    }
  };

  if (loading || !sessionId) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading debrief...</div>;
  }

  const averageScore = feedback.length > 0 
    ? feedback.reduce((acc, f) => acc + f.score, 0) / feedback.length 
    : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <button onClick={() => router.push('/scenarios')} className="flex items-center text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} className="mr-2" /> Back to Scenarios
          </button>
          <h1 className="text-3xl font-bold">Negotiation Debrief</h1>
          <button onClick={() => router.push(`/negotiate?sessionId=${sessionId}`)} className="flex items-center text-cyan-400 hover:text-cyan-300">
            <RefreshCcw size={18} className="mr-2" /> Replay
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1 uppercase">Outcome Score</p>
            <p className="text-4xl font-bold text-cyan-400">{averageScore.toFixed(1)}/10</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1 uppercase">Messages Sent</p>
            <p className="text-4xl font-bold flex items-center"><TrendingUp size={24} className="mr-2 text-green-400" /> {messages.filter(m => m.sender === 'user').length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
            <p className="text-gray-400 text-sm mb-1 uppercase">Skill XP Gained</p>
            <p className="text-4xl font-bold flex items-center"><Zap size={24} className="mr-2 text-yellow-400" /> {feedback.reduce((acc, f) => acc + f.score * 10, 0)}</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6">Negotiation Timeline</h2>
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-white/10">
            {messages.filter(m => m.sender === 'user').map((m, i) => {
              const f = feedback.find(fb => fb.message_id === m.id);
              let dims = null;
              if (f && f.dimension) {
                try {
                  dims = typeof f.dimension === 'string' ? JSON.parse(f.dimension) : f.dimension;
                } catch (e) {
                  console.error('Dimension parse error', e);
                }
              }
              
              return (
                <div key={i} className="relative pl-12">
                  <div className="absolute left-0 w-10 h-10 bg-cyan-500 rounded-full border-4 border-slate-950 flex items-center justify-center font-bold text-xs ring-4 ring-cyan-500/20">
                    {i + 1}
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <p className="text-sm font-medium flex-1">"{m.content}"</p>
                      <button 
                        onClick={() => handleWhatIf(m.id, m.content)}
                        className="ml-4 p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors border border-purple-500/20"
                        title="What If?"
                      >
                        <HelpCircle size={18} />
                      </button>
                    </div>
                    
                    {f && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-gray-400 mb-2">{f.feedback_text}</p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-gray-400">Length: {dims?.length}</span>
                          <span className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-gray-400">Coverage: {dims?.coverage}</span>
                          <span className="px-2 py-0.5 bg-white/5 rounded-full text-[10px] text-gray-400">Logic: {dims?.logic}</span>
                        </div>
                      </div>
                    )}

                    {whatIfLoading === m.id && (
                      <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl animate-pulse">
                        <p className="text-xs text-purple-300">Simulating alternate outcomes...</p>
                      </div>
                    )}
                    
                    {whatIfResponse && whatIfLoading === null && (
                      <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl slide-in-bottom">
                         <p className="text-[10px] font-bold text-purple-400 mb-1 uppercase tracking-wider">Coach Analysis</p>
                         <p className="text-xs text-gray-300 leading-relaxed">{whatIfResponse}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="text-center pb-12">
          <button 
            onClick={() => router.push('/profile')}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-xl shadow-cyan-500/20"
          >
            Go to My Profile
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function DebriefPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <DebriefContent />
    </Suspense>
  );
}
