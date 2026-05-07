'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { gasFetch } from '@/lib/gas';
import { getGeminiResponse } from '@/lib/gemini';
import { useAuth } from '@/components/AuthProvider';
import { ArrowLeft, RefreshCcw, TrendingUp, Zap, HelpCircle, Trophy, Target, MessageSquare } from 'lucide-react';
import { CartoonLoading } from '@/components/CartoonLoading';
import Link from 'next/link';

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
        CRITICAL RULE: YOUR ANALYSIS MUST BE IN THAI LANGUAGE.
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
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">กำลังโหลดข้อมูลสรุป...</div>;
  }

  const averageScore = feedback.length > 0 
    ? feedback.reduce((acc, f) => acc + f.score, 0) / feedback.length 
    : 0;

  return (
    <div className="min-h-screen bg-nintendo-blue/10 bg-[radial-gradient(#0087e5_1px,transparent_1px)] [background-size:20px_20px] p-8 relative overflow-x-hidden">
      <CartoonLoading isOpen={loading} message="กำลังรวบรวมบทเรียนของคุณ..." />
      
      {/* Visual focus layer to separate content from background points */}
      <div className="fixed inset-0 backdrop-blur-[5px] bg-white/50 pointer-events-none z-0" />

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <Link 
            href="/scenarios" 
            prefetch={false}
            className="flex items-center bg-white border-4 border-gray-900 px-6 py-3 rounded-2xl hover:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 group"
          >
            <ArrowLeft size={20} className="mr-2" /> 
            <span className="font-black uppercase tracking-tighter">กลับหน้าภารกิจ</span>
          </Link>
          
          <div className="bg-white border-[6px] border-gray-900 px-10 py-6 rounded-[3rem] shadow-[0_12px_0_rgba(0,0,0,1)] -rotate-1">
            <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">สรุปผลการเจรจา</h1>
          </div>

          <button 
            onClick={() => router.push(`/negotiate?sessionId=${sessionId}`)} 
            className="flex items-center bg-nintendo-yellow text-gray-900 border-4 border-gray-900 px-6 py-3 rounded-2xl hover:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2"
          >
            <RefreshCcw size={20} className="mr-2" /> 
            <span className="font-black uppercase tracking-tighter">เล่นใหม่</span>
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white border-[6px] border-gray-900 p-8 rounded-[2.5rem] shadow-[0_10px_0_rgba(0,0,0,1)] text-center">
            <div className="w-12 h-12 bg-nintendo-blue rounded-2xl border-4 border-gray-900 flex items-center justify-center text-white mx-auto mb-4">
              <Trophy size={24} />
            </div>
            <p className="text-gray-400 font-black text-xs uppercase tracking-widest mb-1">คะแนนผลลัพธ์</p>
            <p className="text-5xl font-black text-nintendo-blue tracking-tighter">{averageScore.toFixed(1)}/10</p>
          </div>
          
          <div className="bg-white border-[6px] border-gray-900 p-8 rounded-[2.5rem] shadow-[0_10px_0_rgba(0,0,0,1)] text-center">
            <div className="w-12 h-12 bg-nintendo-green rounded-2xl border-4 border-gray-900 flex items-center justify-center text-white mx-auto mb-4">
              <MessageSquare size={24} />
            </div>
            <p className="text-gray-400 font-black text-xs uppercase tracking-widest mb-1">ข้อความที่ส่ง</p>
            <p className="text-5xl font-black text-nintendo-green tracking-tighter">{messages.filter(m => m.sender === 'user').length}</p>
          </div>

          <div className="bg-white border-[6px] border-gray-900 p-8 rounded-[2.5rem] shadow-[0_10px_0_rgba(0,0,0,1)] text-center">
            <div className="w-12 h-12 bg-nintendo-pink rounded-2xl border-4 border-gray-900 flex items-center justify-center text-white mx-auto mb-4">
              <Zap size={24} />
            </div>
            <p className="text-gray-400 font-black text-xs uppercase tracking-widest mb-1">แต้มทักษะ</p>
            <p className="text-5xl font-black text-nintendo-pink tracking-tighter">+{feedback.reduce((acc, f) => acc + f.score * 10, 0)}</p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-4xl font-black text-gray-900 mb-10 flex items-center uppercase tracking-tighter">
            <div className="p-3 bg-nintendo-blue rounded-2xl border-4 border-gray-900 mr-4 text-white">
              <Target size={32} />
            </div>
            ลำดับเหตุการณ์การเจรจา
          </h2>
          
          <div className="space-y-12 relative before:absolute before:inset-0 before:ml-8 before:h-full before:w-[6px] before:bg-gray-200 before:rounded-full">
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
                <div key={i} className="relative pl-20">
                  <div className="absolute left-0 w-16 h-16 bg-white border-[6px] border-gray-900 rounded-2xl flex items-center justify-center font-black text-2xl text-gray-900 shadow-[0_6px_0_rgba(0,0,0,1)] z-10">
                    {i + 1}
                  </div>
                  
                  <div className="bg-white border-[6px] border-gray-900 p-8 rounded-[2.5rem] shadow-[0_10px_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[0_5px_0_rgba(0,0,0,1)] transition-all">
                    <div className="flex justify-between items-start mb-6 gap-4">
                      <p className="text-xl font-bold text-gray-900 italic leading-snug">"{m.content}"</p>
                      <button 
                        onClick={() => handleWhatIf(m.id, m.content)}
                        className="flex-shrink-0 p-3 bg-nintendo-blue text-white rounded-2xl border-4 border-gray-900 shadow-[0_6px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all"
                        title="What If?"
                      >
                        <HelpCircle size={24} />
                      </button>
                    </div>
                    
                    {f && (
                      <div className="mt-6 pt-6 border-t-4 border-dashed border-gray-100">
                        <div className="bg-gray-50 border-4 border-gray-900 p-6 rounded-2xl mb-4 relative">
                           <div className="absolute -top-3 left-6 px-3 bg-white border-4 border-gray-900 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400">คำแนะนำจากโค้ช</div>
                           <p className="text-gray-600 font-bold leading-relaxed">{f.feedback_text}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 mt-4">
                          <span className="px-4 py-2 bg-nintendo-blue/10 border-2 border-nintendo-blue/30 rounded-full text-xs font-black text-nintendo-blue uppercase tracking-tighter">ความยาว: {dims?.length || 'N/A'}</span>
                          <span className="px-4 py-2 bg-nintendo-green/10 border-2 border-nintendo-green/30 rounded-full text-xs font-black text-nintendo-green uppercase tracking-tighter">ความครอบคลุม: {dims?.coverage || 'N/A'}</span>
                          <span className="px-4 py-2 bg-nintendo-pink/10 border-2 border-nintendo-pink/30 rounded-full text-xs font-black text-nintendo-pink uppercase tracking-tighter">ตรรกะ: {dims?.logic || 'N/A'}</span>
                        </div>
                      </div>
                    )}

                    {whatIfLoading === m.id && (
                      <div className="mt-6 p-6 bg-nintendo-yellow/20 border-4 border-nintendo-yellow rounded-2xl animate-pulse flex items-center">
                        <RefreshCcw size={20} className="mr-3 animate-spin text-nintendo-yellow" />
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">กำลังจำลองผลลัพธ์ใหม่...</p>
                      </div>
                    )}
                    
                    {whatIfResponse && whatIfLoading === null && (
                      <div className="mt-6 p-6 bg-nintendo-yellow border-4 border-gray-900 rounded-2xl shadow-[0_6px_0_rgba(0,0,0,0.1)] slide-in-bottom">
                         <div className="flex items-center mb-3">
                           <Zap size={18} className="mr-2 text-gray-900" />
                           <p className="text-xs font-black text-gray-900 uppercase tracking-widest">บทวิเคราะห์แบบ What-If</p>
                         </div>
                         <p className="text-gray-800 font-bold leading-relaxed">{whatIfResponse}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="text-center pb-20">
          <button 
            onClick={() => router.push('/profile')}
            className="bg-nintendo-red text-white font-black px-12 py-5 rounded-[2.5rem] border-[6px] border-gray-900 shadow-[0_12px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all uppercase tracking-tighter text-2xl flex items-center justify-center mx-auto space-x-3"
          >
            <span>ไปยังโปรไฟล์ของคุณ!</span>
            <ArrowLeft size={32} className="rotate-180" />
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
