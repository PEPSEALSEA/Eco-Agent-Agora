'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { User, Flame, Award, Calendar, ChevronRight, LogOut, Edit2, Globe, ArrowLeft } from 'lucide-react';
import { gasFetch } from '@/lib/gas';
import { CartoonLoading } from '@/components/CartoonLoading';
import Image from 'next/image';
import Link from 'next/link';

type Skill = {
  skill_name: string;
  level: number;
  xp: number;
};

const ADMIN_EMAILS = ['sealseapep@gmail.com'];

type Session = {
  id: string;
  started_at: string;
  outcome_score: number;
  scenario_title: string;
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [history, setHistory] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('กำลังเรียกดูข้อมูลตัวตนของคุณ...');

  useEffect(() => {
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

        setUserData(profile);
        setSkills(skillData || []);
        setHistory(sessionHistory || []);
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
    { name: 'opening_conversation', label: 'การเริ่มบทสนทนา' }, 
    { name: 'handling_pushback', label: 'การจัดการแรงต้าน' }, 
    { name: 'finding_common_ground', label: 'การหาจุดร่วม' }, 
    { name: 'empathy_expression', label: 'การแสดงความเห็นอกเห็นใจ' }, 
    { name: 'logical_argument', label: 'การใช้ตรรกะและเหตุผล' }
  ];

  return (
    <div className="min-h-screen bg-nintendo-blue/10 bg-[radial-gradient(#0087e5_1px,transparent_1px)] [background-size:20px_20px] p-8">
      <CartoonLoading isOpen={loading} message={loadingMessage} />
      
      <div className="max-w-6xl mx-auto">
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
    </div>
  );
}
