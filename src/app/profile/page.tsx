'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { User, Flame, Award, Calendar, ChevronRight, LogOut, Edit2, Globe, ArrowLeft, Target, BookOpen, Plus, X } from 'lucide-react';
import { gasFetch, gasPost } from '@/lib/gas';
import { CartoonLoading } from '@/components/CartoonLoading';
import Image from 'next/image';
import Link from 'next/link';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

type Skill = {
  skill_name: string;
  level: number;
  xp: number;
};

type RealWorldJournal = {
  id: string;
  title: string;
  situation_description: string;
  outcome: string;
  success_rate: number;
  created_at: string;
};

const ADMIN_EMAILS = ['sealseapep@gmail.com'];

type Session = {
  id: string;
  started_at: string;
  outcome_score: number;
  scenario_title: string;
};

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [history, setHistory] = useState<Session[]>([]);
  const [journals, setJournals] = useState<RealWorldJournal[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('กำลังเรียกดูข้อมูลตัวตนของคุณ...');
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [newJournal, setNewJournal] = useState({ title: '', situation_description: '', outcome: '', success_rate: 50 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        const allData = await gasFetch('read_all');
        if (allData.error) throw new Error(allData.error);

        // Fetch user specific data
        const profile = allData.users.find((u: any) => u.email === user.email);
        const skillData = allData.skill_progress.filter((s: any) => s.user_id === user.id);
        
        const sessionHistory = allData.sessions
          .filter((s: any) => s.user_id === user.id)
          .map((s: any) => {
            const scenario = allData.scenarios.find((sc: any) => sc.id === s.scenario_id);
            return {
              ...s,
              scenario_title: scenario ? scenario.title : 'Unknown Scenario'
            };
          })
          .sort((a: any, b: any) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());

        const journalData = allData.real_world_journals?.filter((j: any) => j.user_id === user.id) || [];

        setUserData(profile);
        setSkills(skillData || []);
        setHistory(sessionHistory || []);
        setJournals(journalData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (err) {
        console.error('Fetch profile data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const skillList = [
    { name: 'opening_conversation', label: 'การเริ่มสนทนา' }, 
    { name: 'handling_pushback', label: 'รับมือแรงต้าน' }, 
    { name: 'finding_common_ground', label: 'การหาจุดร่วม' }, 
    { name: 'empathy_expression', label: 'ความเห็นอกเห็นใจ' }, 
    { name: 'logical_argument', label: 'ตรรกะและเหตุผล' }
  ];

  const handleJournalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSave = {
        id: crypto.randomUUID(),
        user_id: user?.id,
        ...newJournal,
        created_at: new Date().toISOString()
      };
      
      const res = await gasPost('create', 'real_world_journals', dataToSave);
      if (!res?.error) {
        setJournals([dataToSave, ...journals]);
        setIsJournalModalOpen(false);
        setNewJournal({ title: '', situation_description: '', outcome: '', success_rate: 50 });
      } else {
        alert('Failed to save journal');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const radarData = skillList.map(item => {
    const skill = skills.find(s => s.skill_name === item.name) || { level: 1 };
    return {
      subject: item.label,
      A: skill.level,
      fullMark: 10
    };
  });

  return (
    <div className="min-h-screen cartoon-bg-blue p-8 relative overflow-x-hidden">
      <CartoonLoading isOpen={loading} message={loadingMessage} />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
               <div className="w-32 h-32 bg-white border-[6px] border-gray-900 rounded-[2.5rem] flex items-center justify-center shadow-[0_10px_0_rgba(0,0,0,1)] overflow-hidden rotate-3 transition-transform hover:rotate-0">
                {user?.picture ? (
                  <Image src={user.picture} alt={user.name || 'User'} width={128} height={128} className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-gray-900" />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-nintendo-yellow border-4 border-gray-900 rounded-2xl flex items-center justify-center text-gray-900 shadow-lg">
                <Edit2 size={16} />
              </div>
            </div>

            <div className="text-center md:text-left">
              <div className="bg-white border-[6px] border-gray-900 p-6 rounded-[2.5rem] shadow-[0_10px_0_rgba(0,0,0,1)] -rotate-1">
                <h1 className="text-5xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">
                  {user?.name || user?.email?.split('@')[0]}
                </h1>
                <p className="text-gray-400 font-bold text-lg uppercase tracking-tighter">{user?.email}</p>
              </div>
              
              <div className="flex mt-6 space-x-4 justify-center md:justify-start">
                 <div className="flex items-center bg-nintendo-pink text-white px-5 py-2 rounded-2xl border-4 border-gray-900 shadow-[0_6px_0_rgba(0,0,0,1)]">
                   <Flame size={18} className="mr-2" />
                   <span className="font-black uppercase tracking-tighter">ต่อเนื่อง {userData?.streak_count || 0} วัน</span>
                 </div>
                 <div className="flex items-center bg-nintendo-yellow text-gray-900 px-5 py-2 rounded-2xl border-4 border-gray-900 shadow-[0_6px_0_rgba(0,0,0,1)]">
                   <Award size={18} className="mr-2" />
                   <span className="font-black uppercase tracking-tighter">ระดับ {Math.floor(skills.reduce((acc, s) => acc + s.level, 0) / 5) || 1}</span>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <Link 
              href="/scenarios"
              prefetch={false}
              className="flex-1 md:flex-none flex items-center justify-center bg-white border-4 border-gray-900 px-6 py-3 rounded-2xl hover:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 group"
            >
              <ArrowLeft size={20} className="mr-2" />
              <span className="font-black uppercase tracking-tighter">กลับ</span>
            </Link>

            {user && ADMIN_EMAILS.includes(user.email) && (
              <>
                <button 
                  onClick={() => router.push('/admin/settings')}
                  className="flex-1 md:flex-none p-3 bg-nintendo-blue text-white rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center"
                  title="ตั้งค่าระบบ"
                >
                  <Globe size={20} />
                </button>
                <button 
                  onClick={() => router.push('/admin')}
                  className="flex-1 md:flex-none flex items-center justify-center bg-nintendo-green text-white px-6 py-3 rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all"
                >
                  <Edit2 size={20} className="mr-2" /> 
                  <span className="font-black uppercase tracking-tighter">จัดการระบบ</span>
                </button>
              </>
            )}
            <button 
              onClick={handleLogout}
              className="flex-1 md:flex-none flex items-center justify-center bg-nintendo-red text-white px-6 py-3 rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all"
            >
              <LogOut size={20} className="mr-2" /> 
              <span className="font-black uppercase tracking-tighter">ออก</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <section className="lg:col-span-2">
            <h2 className="text-4xl font-black text-gray-900 mb-8 flex items-center uppercase tracking-tighter">
               <div className="p-3 bg-nintendo-blue rounded-2xl border-4 border-gray-900 mr-4 text-white">
                <Award size={32} />
               </div>
               ความเชี่ยวชาญทักษะ
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border-[6px] border-gray-900 p-6 rounded-[2.5rem] shadow-[0_12px_0_rgba(0,0,0,1)] md:col-span-2 h-[400px]">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-4 text-center">ภาพรวมการพัฒนาทักษะ (Skill Radar)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="45%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#111827', fontSize: 14, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'dataMax + 2']} />
                    <Radar name="Skills" dataKey="A" stroke="#00C896" strokeWidth={4} fill="#00C896" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {skillList.map((skillItem) => {
                const skill = skills.find(s => s.skill_name === skillItem.name) || { level: 1, xp: 0 };
                const progress = skill.xp % 100;
                
                return (
                  <div key={skillItem.name} className="bg-white border-[6px] border-gray-900 p-8 rounded-[2.5rem] shadow-[0_12px_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[0_6px_0_rgba(0,0,0,1)] transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">{skillItem.label}</h3>
                      <span className="bg-nintendo-blue text-white px-4 py-1 border-4 border-gray-900 rounded-full text-sm font-black uppercase tracking-tighter">Lv.{skill.level}</span>
                    </div>
                    
                    <div className="relative w-full h-10 bg-gray-100 border-[6px] border-gray-900 rounded-2xl overflow-hidden mb-4 shadow-[inset_0_4px_0_rgba(0,0,0,0.1)]">
                      <div 
                        className="h-full bg-nintendo-green border-r-[6px] border-gray-900 transition-all duration-1000 relative"
                        style={{ width: `${progress}%` }}
                      >
                         <div className="absolute top-1 left-1 right-1 h-2 bg-white/30 rounded-full" />
                      </div>
                    </div>

                    <div className="flex justify-between text-xs font-black text-gray-400 uppercase tracking-widest">
                      <span>{skill.xp} XP รวม</span>
                      <span>Next: {100 - progress} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-12">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-4xl font-black text-gray-900 flex items-center uppercase tracking-tighter">
                  <div className="p-3 bg-nintendo-yellow rounded-2xl border-4 border-gray-900 mr-4 text-gray-900">
                    <BookOpen size={32} />
                  </div>
                  บันทึกการใช้จริง
                </h2>
                <button 
                  onClick={() => setIsJournalModalOpen(true)}
                  className="bg-gray-900 text-white px-6 py-3 rounded-2xl border-4 border-transparent shadow-[0_8px_0_rgba(0,0,0,0.2)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center"
                >
                  <Plus size={20} className="mr-2" />
                  <span className="font-black uppercase tracking-tighter">เพิ่มบันทึก</span>
                </button>
              </div>
              
              <div className="space-y-6">
                {journals.map((journal) => (
                  <div key={journal.id} className="bg-white border-[6px] border-gray-900 p-8 rounded-[2.5rem] shadow-[0_12px_0_rgba(0,0,0,1)]">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-1">{journal.title}</h3>
                        <p className="text-sm text-gray-400 font-bold uppercase">{new Date(journal.created_at).toLocaleDateString('th-TH')}</p>
                      </div>
                      <div className="bg-nintendo-pink text-white px-4 py-2 rounded-xl border-4 border-gray-900 font-black flex items-center">
                        <Target size={18} className="mr-2"/> ความสำเร็จ {journal.success_rate}%
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="bg-gray-100 p-4 rounded-2xl border-2 border-gray-200">
                        <span className="text-xs text-gray-500 font-black uppercase mb-1 block">สถานการณ์</span>
                        <p className="text-gray-800">{journal.situation_description}</p>
                      </div>
                      <div className="bg-gray-100 p-4 rounded-2xl border-2 border-gray-200">
                        <span className="text-xs text-gray-500 font-black uppercase mb-1 block">ผลลัพธ์ที่ได้</span>
                        <p className="text-gray-800">{journal.outcome}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {journals.length === 0 && (
                  <div className="bg-white border-4 border-dashed border-gray-300 p-12 rounded-[2.5rem] text-center">
                    <p className="text-gray-400 font-bold uppercase">ยังไม่มีบันทึกการนำไปใช้จริง</p>
                    <p className="text-gray-400 text-sm mt-2">ทดลองใช้ทักษะในชีวิตจริงแล้วกลับมาบันทึกผลลัพธ์ที่นี่!</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-4xl font-black text-gray-900 mb-8 flex items-center uppercase tracking-tighter">
               <div className="p-3 bg-nintendo-pink rounded-2xl border-4 border-gray-900 mr-4 text-white">
                <Calendar size={32} />
               </div>
               เซสชันล่าสุด
            </h2>
            <div className="space-y-6">
              {history.slice(0, 5).map((session) => (
                <div 
                  key={session.id} 
                  onClick={() => router.push(`/debrief?sessionId=${session.id}`)}
                  className="bg-white border-[6px] border-gray-900 p-6 rounded-[2.5rem] flex items-center justify-between shadow-[0_10px_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[0_6px_0_rgba(0,0,0,1)] cursor-pointer transition-all active:scale-95 group"
                >
                  <div className="flex-1 pr-4">
                    <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">{session.scenario_title}</h4>
                    <p className="text-sm text-gray-400 font-bold uppercase">{new Date(session.started_at).toLocaleDateString('th-TH')}</p>
                  </div>
                  <div className="text-right flex items-center">
                    <div className="text-3xl font-black text-nintendo-blue tracking-tighter">{session.outcome_score || 0}%</div>
                    <ChevronRight size={24} className="text-gray-300 ml-2 group-hover:text-gray-900 transition-colors" strokeWidth={3} />
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <div className="bg-white border-4 border-dashed border-gray-300 p-12 rounded-[2.5rem] text-center">
                  <p className="text-gray-400 font-bold uppercase">ยังไม่มีเซสชันที่เสร็จสมบูรณ์</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => router.push('/scenarios')}
              className="w-full mt-10 bg-nintendo-yellow text-gray-900 font-black py-5 rounded-[2.5rem] border-[6px] border-gray-900 shadow-[0_10px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all flex items-center justify-center space-x-3 uppercase tracking-tighter text-2xl"
            >
              เริ่มการฝึกฝนใหม่!
            </button>
          </section>
        </div>
      </div>

      {isJournalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-[6px] border-gray-900 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-[0_20px_0_rgba(0,0,0,1)] transform transition-all relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">เพิ่มบันทึกการเจรจาจริง</h2>
              <button onClick={() => setIsJournalModalOpen(false)} className="bg-gray-100 p-2 rounded-xl border-4 border-gray-900 hover:bg-gray-200 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleJournalSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-900 font-black uppercase mb-2">หัวข้อ/สถานการณ์หลัก</label>
                <input 
                  type="text" 
                  required
                  value={newJournal.title}
                  onChange={(e) => setNewJournal({...newJournal, title: e.target.value})}
                  className="w-full bg-gray-50 border-4 border-gray-900 rounded-2xl p-4 font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-nintendo-yellow/50"
                  placeholder="เช่น ต่อรองเงินเดือน, คุยกับลูกค้าหัวร้อน"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-900 font-black uppercase mb-2">รายละเอียดสถานการณ์</label>
                  <textarea 
                    required
                    value={newJournal.situation_description}
                    onChange={(e) => setNewJournal({...newJournal, situation_description: e.target.value})}
                    className="w-full bg-gray-50 border-4 border-gray-900 rounded-2xl p-4 font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-nintendo-yellow/50 h-32 resize-none"
                    placeholder="เล่าว่าเกิดอะไรขึ้น คุณใช้เทคนิคอะไรบ้าง..."
                  />
                </div>
                <div>
                  <label className="block text-gray-900 font-black uppercase mb-2">ผลลัพธ์ที่ได้</label>
                  <textarea 
                    required
                    value={newJournal.outcome}
                    onChange={(e) => setNewJournal({...newJournal, outcome: e.target.value})}
                    className="w-full bg-gray-50 border-4 border-gray-900 rounded-2xl p-4 font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-nintendo-yellow/50 h-32 resize-none"
                    placeholder="ผลสรุปเป็นอย่างไร ดีขึ้นหรือแย่ลง?"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-900 font-black uppercase mb-2">ระดับความสำเร็จ ({newJournal.success_rate}%)</label>
                <input 
                  type="range" 
                  min="0" max="100" step="5"
                  value={newJournal.success_rate}
                  onChange={(e) => setNewJournal({...newJournal, success_rate: parseInt(e.target.value)})}
                  className="w-full h-4 bg-gray-200 rounded-lg appearance-none cursor-pointer border-2 border-gray-900"
                />
                <div className="flex justify-between text-xs text-gray-500 font-bold mt-2">
                  <span>ล้มเหลว (0%)</span>
                  <span>พอใช้ (50%)</span>
                  <span>สำเร็จตามเป้า (100%)</span>
                </div>
              </div>

              <div className="pt-4 border-t-4 border-gray-100">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-nintendo-green text-white font-black py-4 rounded-2xl border-[6px] border-gray-900 shadow-[0_8px_0_rgba(0,0,0,1)] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all uppercase text-xl disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
