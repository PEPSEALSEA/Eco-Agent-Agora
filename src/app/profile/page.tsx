'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { User, Flame, Award, Calendar, ChevronRight, LogOut, ChevronUp } from 'lucide-react';

type Skill = {
  skill_name: string;
  level: number;
  xp: number;
};

type Session = {
  id: string;
  started_at: string;
  outcome_score: number;
  scenarios: { title: string };
};

export default function ProfilePage() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [history, setHistory] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch user specific data
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const { data: skillData } = await supabase
        .from('skill_progress')
        .select('*')
        .eq('user_id', user.id);

      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*, scenarios(title)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      setUserData(userProfile);
      setSkills(skillData || []);
      setHistory(sessionData || []);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading profile...</div>;

  const skillList = [
    'opening_conversation', 
    'handling_pushback', 
    'finding_common_ground', 
    'empathy_expression', 
    'logical_argument'
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-start mb-12">
          <div className="flex items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-2xl flex items-center justify-center mr-6 shadow-xl shadow-cyan-500/10">
              <User size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user?.email?.split('@')[0]}</h1>
              <p className="text-gray-400 text-sm">{user?.email}</p>
              <div className="flex mt-2 space-x-4">
                 <div className="flex items-center text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full border border-orange-400/20">
                   <Flame size={14} className="mr-1" />
                   <span className="text-xs font-bold">{userData?.streak_count || 0} Day Streak</span>
                 </div>
                 <div className="flex items-center text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20">
                   <Award size={14} className="mr-1" />
                   <span className="text-xs font-bold">Level {Math.floor(skills.reduce((acc, s) => acc + s.level, 0) / 5) || 1}</span>
                 </div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center text-gray-400 hover:text-red-400 transition-colors bg-white/5 px-4 py-2 rounded-lg border border-white/10"
          >
            <LogOut size={18} className="mr-2" /> Logout
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Skill Tree */}
          <section className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-6 flex items-center">
               <Award size={20} className="mr-2 text-cyan-400" /> Skill Mastery
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skillList.map((skillName) => {
                const skill = skills.find(s => s.skill_name === skillName) || { level: 1, xp: 0 };
                const progress = skill.xp % 100;
                
                return (
                  <div key={skillName} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-sm font-bold capitalize">{skillName.replace(/_/g, ' ')}</h3>
                      <span className="text-xs font-bold text-cyan-400">Lv.{skill.level}</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500">
                      <span>{skill.xp} XP total</span>
                      <span>Next Level: {100 - progress} XP</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Activity History */}
          <section>
            <h2 className="text-xl font-bold mb-6 flex items-center">
               <Calendar size={20} className="mr-2 text-purple-400" /> Recent Sessions
            </h2>
            <div className="space-y-4">
              {history.slice(0, 5).map((session) => (
                <div 
                  key={session.id} 
                  onClick={() => router.push(`/debrief/${session.id}`)}
                  className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between hover:border-cyan-500/50 cursor-pointer transition-all"
                >
                  <div>
                    <h4 className="text-sm font-bold">{session.scenarios.title}</h4>
                    <p className="text-[10px] text-gray-400">{new Date(session.started_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold text-sm">{session.outcome_score || 0}%</div>
                    <ChevronRight size={14} className="text-gray-600 inline ml-2" />
                  </div>
                </div>
              ))}
              {history.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">No sessions completed yet.</p>
              )}
            </div>
            <button 
              onClick={() => router.push('/scenarios')}
              className="w-full mt-6 py-3 border border-dashed border-white/20 rounded-xl text-sm text-gray-400 hover:text-white hover:border-white/40 transition-all"
            >
              Start New Practice
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
