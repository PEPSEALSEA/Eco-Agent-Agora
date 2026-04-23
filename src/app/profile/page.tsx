'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { User, Flame, Award, Calendar, ChevronRight, LogOut } from 'lucide-react';
import { gasFetch } from '@/lib/gas';

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

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">กำลังโหลดโปรไฟล์...</div>;

  const skillList = [
    { name: 'opening_conversation', label: 'การเริ่มบทสนทนา' }, 
    { name: 'handling_pushback', label: 'การจัดการแรงต้าน' }, 
    { name: 'finding_common_ground', label: 'การหาจุดร่วม' }, 
    { name: 'empathy_expression', label: 'การแสดงความเห็นอกเห็นใจ' }, 
    { name: 'logical_argument', label: 'การใช้ตรรกะและเหตุผล' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-start mb-12">
          <div className="flex items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center mr-6 shadow-xl shadow-cyan-500/10 overflow-hidden">
              {user?.picture ? (
                <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={40} />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user?.name || user?.email?.split('@')[0]}</h1>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              <div className="flex mt-2 space-x-4">
                 <div className="flex items-center text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full border border-orange-400/20">
                   <Flame size={14} className="mr-1" />
                   <span className="text-xs font-bold">ต่อเนื่อง {userData?.streak_count || 0} วัน</span>
                 </div>
                 <div className="flex items-center text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">
                   <Award size={14} className="mr-1" />
                   <span className="text-xs font-bold">ระดับ {Math.floor(skills.reduce((acc, s) => acc + s.level, 0) / 5) || 1}</span>
                 </div>
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            {user && ADMIN_EMAILS.includes(user.email) && (
              <button 
                onClick={() => router.push('/admin/scenarios')}
                className="flex items-center text-gray-400 hover:text-cyan-400 transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10"
              >
                <Edit2 size={18} className="mr-2" /> จัดการสถานการณ์
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="flex items-center text-gray-400 hover:text-red-400 transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10"
            >
              <LogOut size={18} className="mr-2" /> ออกจากระบบ
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-6 flex items-center">
               <Award size={20} className="mr-2 text-cyan-400" /> ความเชี่ยวชาญทักษะ
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skillList.map((skillItem) => {
                const skill = skills.find(s => s.skill_name === skillItem.name) || { level: 1, xp: 0 };
                const progress = skill.xp % 100;
                
                return (
                  <div key={skillItem.name} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-sm font-bold">{skillItem.label}</h3>
                      <span className="text-xs font-bold text-cyan-400">Lv.{skill.level}</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{skill.xp} XP รวม</span>
                      <span>เลเวลถัดไป: {100 - progress} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-6 flex items-center">
               <Calendar size={20} className="mr-2 text-purple-400" /> เซสชันล่าสุด
            </h2>
            <div className="space-y-4">
              {history.slice(0, 5).map((session) => (
                <div 
                  key={session.id} 
                  onClick={() => router.push(`/debrief?sessionId=${session.id}`)}
                  className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:border-cyan-500/50 cursor-pointer transition-all"
                >
                  <div>
                    <h4 className="text-sm font-bold">{session.scenario_title}</h4>
                    <p className="text-[10px] text-gray-400">{new Date(session.started_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold text-sm">{session.outcome_score || 0}%</div>
                    <ChevronRight size={14} className="text-gray-600 inline ml-2" />
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">ยังไม่มีเซสชันที่เสร็จสมบูรณ์</p>
              )}
            </div>
            <button 
              onClick={() => router.push('/scenarios')}
              className="w-full mt-6 py-3 border border-dashed border-white/20 rounded-xl text-sm text-gray-400 hover:text-white hover:border-white/40 transition-all"
            >
              เริ่มการฝึกฝนใหม่
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
