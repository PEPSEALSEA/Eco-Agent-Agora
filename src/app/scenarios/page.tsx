'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Users, Briefcase, GraduationCap, User } from 'lucide-react';
import { gasFetch, gasPost, uuid } from '@/lib/gas';
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
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchScenarios = async () => {
      try {
        const data = await gasFetch('read', 'scenarios');
        if (data.error) throw new Error(data.error);
        setScenarios(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch scenarios error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchScenarios();
    }
  }, [user, authLoading, router]);

  const seedScenarios = async () => {
    setLoading(true);
    const sampleScenarios = [
      {
        id: uuid(),
        title: "The Project Deadline",
        description: "A team member is behind on their deliverables, risking the whole project. Negotiate a way forward without ruining morale.",
        target_group: "professional",
        characters: [
          { name: "Alex (The Developer)", role: "Overworked senior dev", agenda: "Needs more time or fewer tasks", personality: "Defensive but competent" },
          { name: "Sarah (Product Manager)", role: "Stressed PM", agenda: "Wants the project done on time", personality: "Direct and results-oriented" }
        ]
      },
      {
        id: uuid(),
        title: "Salary Negotiation",
        description: "You're asking for a 20% raise after a successful year. The company is having a 'lean year'.",
        target_group: "professional",
        characters: [
          { name: "Mr. Henderson", role: "Department Head", agenda: "Minimize costs while keeping talent", personality: "Friendly but says 'no' a lot" }
        ]
      }
    ];

    try {
      for (const s of sampleScenarios) {
        await gasPost('create', 'scenarios', s);
      }
      const data = await gasFetch('read', 'scenarios');
      setScenarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Seed error:', err);
      alert('Failed to seed scenarios');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (scenarioId: string) => {
    if (loading || authLoading || !user) return;
    
    setLoading(true);
    const sessionId = uuid();
    
    try {
      const sessionData = {
        id: sessionId,
        user_id: user.id,
        scenario_id: scenarioId,
        status: 'ongoing',
        started_at: new Date().toISOString()
      };

      const result = await gasPost('create', 'sessions', sessionData);
      
      if (result.error) throw new Error(result.error);

      router.push(`/negotiate?sessionId=${sessionId}`);
    } catch (err: any) {
      console.error('Session start error:', err);
      alert('Error starting session: ' + err.message);
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
              <p className="text-xl text-gray-900 font-black uppercase tracking-tighter leading-none">{user?.name || user?.email?.split('@')[0]}</p>
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
                      {char.name?.charAt(0) || '?'}
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
            <div className="col-span-full py-20 text-center bg-white border-4 border-dashed border-gray-900 rounded-[3rem]">
              <h3 className="text-3xl font-black mb-2 uppercase">No Scenarios Prepared</h3>
              <p className="text-gray-500 font-bold mb-8 uppercase">It looks like the training grounds are empty.</p>
              <button 
                onClick={seedScenarios}
                className="bg-nintendo-red hover:bg-red-600 text-white font-black px-8 py-3 rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 transition-all uppercase tracking-tighter"
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
