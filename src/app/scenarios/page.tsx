'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Users, Briefcase, GraduationCap } from 'lucide-react';

type Scenario = {
  id: string;
  title: string;
  description: string;
  target_group: string;
  characters: any[];
};

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchScenarios = async () => {
      const { data, error } = await supabase.from('scenarios').select('*');
      if (error) console.error(error);
      else setScenarios(data || []);
      setLoading(false);
    };

    fetchScenarios();
  }, []);

  const startSession = async (scenarioId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert([
        { user_id: user.id, scenario_id: scenarioId, status: 'ongoing' }
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      return;
    }

    router.push(`/negotiate/${data.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Choose Your Scenario</h1>
            <p className="text-gray-400">Select a situation to practice your negotiation skills.</p>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm text-cyan-400">
            {user?.email}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {scenarios.map((scenario) => (
            <div 
              key={scenario.id}
              className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 hover:border-cyan-500/50 transition-all duration-300 transform hover:-translate-y-2 cursor-pointer"
              onClick={() => startSession(scenario.id)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400 group-hover:bg-cyan-500/30 transition-colors">
                    {scenario.target_group === 'professional' ? <Briefcase size={24} /> : <GraduationCap size={24} />}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    scenario.target_group === 'professional' ? 'bg-purple-500/20 text-purple-300' : 'bg-green-500/20 text-green-300'
                  }`}>
                    {scenario.target_group.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{scenario.title}</h3>
                <p className="text-gray-400 mb-6 text-sm line-clamp-3">{scenario.description}</p>
                
                <div className="flex -space-x-2 mb-6">
                  {scenario.characters.map((char, i) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold"
                      title={char.name}
                    >
                      {char.name.charAt(0)}
                    </div>
                  ))}
                  <div className="pl-4 text-xs text-gray-500 flex items-center">
                    {scenario.characters.length} Characters
                  </div>
                </div>

                <div className="flex items-center text-cyan-400 font-semibold group-hover:gap-2 transition-all">
                  Start Negotiation <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
