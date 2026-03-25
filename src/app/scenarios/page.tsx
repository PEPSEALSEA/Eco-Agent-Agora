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
    if (loading || authLoading) return;
    
    setLoading(true);
    
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([
          { user_id: user.id, scenario_id: scenarioId, status: 'ongoing' }
        ])
        .select()
        .single();

      if (error) {
        console.error('Session start error:', error);
        
        if (error.code === '23503') {
           // Foreign key violation means public.users record is missing
           alert('Your profile is still being set up. Please wait a few seconds and try again!');
        } else if (error.code === '42501') {
           // RLS error
           alert('Database permission error. Please make sure you have run the updated SQL in your Supabase dashboard!');
        } else {
           alert('Error starting session: ' + error.message);
        }
        setLoading(false);
        return;
      }

      router.push(`/negotiate?sessionId=${data.id}`);
    } catch (err: any) {
      console.error('Catch error:', err);
      alert('An unexpected error occurred: ' + err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nintendo-blue/10 bg-[radial-gradient(#0087e5_1px,transparent_1px)] [background-size:20px_20px] p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-16">
          <div className="bg-white border-[6px] border-gray-900 p-8 rounded-[3rem] shadow-[0_12px_0_rgba(0,0,0,1)] -rotate-1">
            <h1 className="text-6xl font-black text-gray-900 mb-2 uppercase tracking-tighter">Choose Your Mission!</h1>
            <p className="text-gray-500 font-bold text-xl uppercase tracking-tighter">Select a situation to practice your negotiation skills.</p>
          </div>
          <Link 
            href="/profile"
            className="flex items-center space-x-4 bg-white border-4 border-gray-900 px-6 py-3 rounded-[2rem] hover:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-nintendo-yellow border-4 border-gray-900 flex items-center justify-center text-gray-900">
              <User size={24} strokeWidth={3} />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-400 font-black uppercase leading-none mb-1">Trainer</p>
              <p className="text-xl text-gray-900 font-black uppercase tracking-tighter leading-none">{user?.email?.split('@')[0]}</p>
            </div>
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {scenarios.map((scenario) => (
            <div 
              key={scenario.id}
              className="group bg-white border-[6px] border-gray-900 rounded-[3rem] overflow-hidden transition-all duration-300 shadow-[0_15px_0_rgba(0,0,0,1)] hover:translate-y-2 hover:shadow-[0_8px_0_rgba(0,0,0,1)] active:scale-95 cursor-pointer flex flex-col"
              onClick={() => startSession(scenario.id)}
            >
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-2xl border-4 border-gray-900 text-white shadow-[0_6px_0_rgba(0,0,0,0.1)] ${scenario.target_group === 'professional' ? 'bg-nintendo-blue' : 'bg-nintendo-green'}`}>
                    {scenario.target_group === 'professional' ? <Briefcase size={32} /> : <GraduationCap size={32} />}
                  </div>
                  <span className={`px-4 py-2 border-4 border-gray-900 rounded-full text-sm font-black uppercase tracking-tighter ${
                    scenario.target_group === 'professional' ? 'bg-nintendo-pink text-white' : 'bg-nintendo-yellow text-gray-900'
                  }`}>
                    {scenario.target_group?.toUpperCase() || 'GENERAL'}
                  </span>
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tighter leading-none">{scenario.title}</h3>
                <p className="text-gray-500 font-bold mb-8 text-lg line-clamp-3 leading-tight">{scenario.description}</p>
                
                <div className="flex -space-x-4 mb-8">
                  {scenario.characters?.map((char: any, i: number) => (
                    <div 
                      key={i} 
                      className="w-12 h-12 rounded-2xl bg-white border-4 border-gray-900 flex items-center justify-center text-lg font-black text-gray-900 shadow-lg rotate-3 odd:-rotate-3"
                      title={char.name}
                    >
                      {char.name.charAt(0)}
                    </div>
                  ))}
                </div>

                <div className="mt-auto flex items-center text-2xl font-black text-nintendo-red uppercase tracking-tighter group-hover:gap-4 transition-all">
                  {loading ? (
                    <span className="flex items-center text-gray-400">
                      <div className="animate-spin rounded-full h-6 w-6 border-4 border-gray-400 border-t-transparent mr-3"></div>
                      LOADING...
                    </span>
                  ) : (
                    <>
                      START MISSION <span className="opacity-0 group-hover:opacity-100 transition-all">→</span>
                    </>
                  )}
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
