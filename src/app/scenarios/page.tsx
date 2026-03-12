'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Users, Briefcase, GraduationCap, User } from 'lucide-react';
import Link from 'next/link';

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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if auth is NO LONGER loading AND there is no user
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchScenarios = async () => {
      const { data, error } = await supabase.from('scenarios').select('*');
      if (error) console.error(error);
      else setScenarios(data || []);
      setLoading(false);
    };

    if (user) {
      fetchScenarios();
    }
  }, [user, authLoading, router]);

  const seedScenarios = async () => {
    setLoading(true);
    const sampleScenarios = [
      {
        title: "The Project Deadline",
        description: "A team member is behind on their deliverables, risking the whole project. Negotiate a way forward without ruining morale.",
        target_group: "professional",
        characters: [
          { name: "Alex (The Developer)", role: "Overworked senior dev", agenda: "Needs more time or fewer tasks", personality: "Defensive but competent" },
          { name: "Sarah (Product Manager)", role: "Stressed PM", agenda: "Wants the project done on time", personality: "Direct and results-oriented" }
        ]
      },
      {
        title: "Salary Negotiation",
        description: "You're asking for a 20% raise after a successful year. The company is having a 'lean year'.",
        target_group: "professional",
        characters: [
          { name: "Mr. Henderson", role: "Department Head", agenda: "Minimize costs while keeping talent", personality: "Friendly but says 'no' a lot" }
        ]
      }
    ];

    const { error } = await supabase.from('scenarios').insert(sampleScenarios);
    if (error) {
      console.error(error);
      alert('Failed to seed: ' + error.message);
    } else {
      const { data } = await supabase.from('scenarios').select('*');
      setScenarios(data || []);
    }
    setLoading(false);
  };

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
      alert('Failed to start session: ' + error.message + '\n\nPlease ensure you have run the database setup SQL and checked your RLS policies.');
      setLoading(false);
      return;
    }

    router.push(`/negotiate?sessionId=${data.id}`);
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
          <Link 
            href="/profile"
            className="flex items-center space-x-3 bg-white/5 border border-white/10 px-4 py-2 rounded-xl hover:bg-white/10 transition-all cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-xs font-bold ring-2 ring-transparent group-hover:ring-cyan-500/50 transition-all">
              <User size={14} />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-gray-400 leading-none mb-1">Your Profile</p>
              <p className="text-sm text-cyan-400 font-medium leading-none">{user?.email?.split('@')[0]}</p>
            </div>
          </Link>
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
                    {scenario.target_group?.toUpperCase() || 'GENERAL'}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">{scenario.title}</h3>
                <p className="text-gray-400 mb-6 text-sm line-clamp-3">{scenario.description}</p>
                
                <div className="flex -space-x-2 mb-6">
                  {scenario.characters?.map((char: any, i: number) => (
                    <div 
                      key={i} 
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 border-2 border-slate-950 flex items-center justify-center text-[10px] font-bold"
                      title={char.name}
                    >
                      {char.name.charAt(0)}
                    </div>
                  ))}
                  <div className="pl-4 text-xs text-gray-500 flex items-center">
                    {scenario.characters?.length || 0} Characters
                  </div>
                </div>

                <div className="flex items-center text-cyan-400 font-semibold group-hover:gap-2 transition-all">
                  Start Negotiation <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </div>
            </div>
          ))}

          {scenarios.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-white/5 border border-dashed border-white/10 rounded-3xl">
              <h3 className="text-2xl font-bold mb-2">No Scenarios Prepared</h3>
              <p className="text-gray-400 mb-8">It looks like the training grounds are empty.</p>
              <button 
                onClick={seedScenarios}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
              >
                Seed Sample Scenarios
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
