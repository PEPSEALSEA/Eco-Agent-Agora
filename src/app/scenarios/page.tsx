'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Users, Briefcase, GraduationCap, User } from 'lucide-react';
import { gasFetch, gasPost, uuid, gasFetchWithSWR } from '@/lib/gas';
import Link from 'next/link';
import SyncStatus from '@/components/SyncStatus';
import { CartoonLoading } from '@/components/CartoonLoading';

type Scenario = {
  id: string;
  title: string;
  description: string;
  target_group: string;
  characters: any[];
  mode?: 'campaign' | 'freeplay';
  difficulty?: number;
};

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('กำลังเสกข้อมูลให้คุณ...');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'updated'>('idle');
  const [activeTab, setActiveTab] = useState<'campaign' | 'freeplay'>('campaign');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchScenarios = async () => {
      setSyncStatus('syncing');
      setLoadingMessage('กำลังตามหาภารกิจลับ...');
      try {
        const result = await gasFetchWithSWR('read', 'scenarios', {}, (freshData) => {
          setScenarios(Array.isArray(freshData) ? freshData : []);
          // Only show 'updated' toast if we were actually syncing
          setSyncStatus(prev => prev === 'syncing' ? 'updated' : 'idle');
        });

        if (result.data) {
          const sorted = (Array.isArray(result.data) ? result.data : []).sort((a: any, b: any) => (a.difficulty || 1) - (b.difficulty || 1));
          setScenarios(sorted);
          if (result.source === 'cache_fresh') {
            setSyncStatus('idle');
          } else if (result.source === 'cache_stale') {
            setSyncStatus('syncing');
          } else {
            setSyncStatus('updated');
          }
        }
      } catch (err) {
        console.error('Fetch scenarios error:', err);
        setSyncStatus('idle');
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
    setLoadingMessage('กำลังสร้างโลกใหม่...');
    const sampleScenarios = [
      {
        id: uuid(),
        title: "เส้นตายโครงการ",
        description: "สมาชิกในทีมทำงานล่าช้ากว่ากำหนด ซึ่งเสี่ยงต่อความล้มเหลวของทั้งโครงการ จงเจรจาเพื่อหาทางออกโดยไม่ทำให้ขวัญกำลังใจเสีย",
        target_group: "professional",
        characters: [
          { id: "char_alex", name: "อเล็กซ์ (นักพัฒนา)", role: "นักพัฒนาอาวุโสที่ทำงานหนักเกินไป", agenda: "ต้องการเวลาเพิ่มหรือลดภาระงาน", personality: "ระแวดระวังแต่มีความสามารถ" },
          { id: "char_sara", name: "ซาร่า (ผู้จัดการผลิตภัณฑ์)", role: "ผู้จัดการที่กำลังเครียด", agenda: "ต้องการให้โครงการเสร็จตรงเวลา", personality: "ตรงไปตรงมาและเน้นผลลัพธ์" }
        ],
        phase_rules: {
          phases: ["opening", "conflict", "negotiation", "resolution"],
          win_condition: "ทั้งสองฝ่ายตกลงร่วมกันได้",
          fail_condition: "turn > 20"
        },
        mode: 'campaign',
        difficulty: 1
      },
      {
        id: uuid(),
        title: "การต่อรองเงินเดือน",
        description: "คุณกำลังขอขึ้นเงินเดือน 20% หลังจากปีที่ประสบความสำเร็จ แต่บริษัทกำลังอยู่ในช่วง 'ปีที่ต้องประหยัด'",
        target_group: "professional",
        characters: [
          { id: "char_henderson", name: "คุณเฮนเดอร์สัน", role: "หัวหน้าแผนก", agenda: "พยายามลดค่าใช้จ่ายในขณะที่ยังรักษาบุคลากรเก่งๆ ไว้", personality: "เป็นกันเองแต่มักจะตอบว่า 'ไม่'" }
        ],
        phase_rules: {
          phases: ["rapport", "bargaining", "closing"],
          win_condition: "ได้รับการขึ้นเงินเดือนที่น่าพอใจ",
          fail_condition: "ความสัมพันธ์แย่ลงจนมองหน้ากันไม่ติด"
        },
        mode: 'campaign',
        difficulty: 2
      },
      {
        id: uuid(),
        title: "โครงการร่วมกับเกษตรกร (จำลองสถานการณ์กดดัน)",
        description: "บริษัทต้องการเช่าที่ดินทำโครงการ แต่เกษตรกรกังวลและมีวาระซ่อนเร้นที่ไม่ยอมบอกตรงๆ (ด่านวัดระดับความพร้อม)",
        target_group: "professional",
        characters: [
          { id: "char_boonsong", name: "ลุงบุญส่ง", role: "ผู้นำกลุ่มเกษตรกร", agenda: "มีข้อเสนอจากบริษัทอื่นที่ดีกว่าอยู่ในมือแล้ว", personality: "กดดัน, สร้างเงื่อนไขบีบบังคับ" },
          { id: "char_somjai", name: "ป้าสมใจ", role: "ตัวแทนกลุ่มแม่บ้าน", agenda: "ไม่พอใจที่บริษัทไม่เคยเหลียวแลชุมชน", personality: "ใช้อารมณ์, ต่อต้าน" }
        ],
        phase_rules: {
          phases: ["listening", "negotiation", "agreement"],
          win_condition: "เกษตรกรยอมรับเงื่อนไขและมีความสุข",
          fail_condition: "เกิดความขัดแย้งรุนแรงจนโครงการยุติ"
        },
        mode: 'campaign',
        difficulty: 3
      },
      {
        id: uuid(),
        title: "เล่นอิสระ: ต่อรองซื้อรถมือสอง",
        description: "คุณต้องการซื้อรถมือสองในราคาที่ถูกลง แต่เต็นท์รถมีเหตุผลร้อยแปดที่ลดราคาไม่ได้ โหมดเล่นอิสระที่คุณสามารถทดลองเทคนิคต่างๆ ได้",
        target_group: "professional",
        characters: [
          { id: "char_seller", name: "เฮียชัย", role: "เจ้าของเต็นท์รถ", agenda: "ขายให้ได้กำไรมากที่สุด", personality: "พูดเก่ง, หว่านล้อมเก่ง" }
        ],
        phase_rules: {
          phases: ["negotiation"],
          win_condition: "ได้ราคาที่ต้องการ",
          fail_condition: "ไม่ได้ซื้อ"
        },
        mode: 'freeplay'
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
    setLoadingMessage('กำลังจัดโต๊ะเจรจา...');
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

  return (
    <div className="min-h-screen cartoon-bg-blue p-4 sm:p-8 relative overflow-x-hidden">
      <CartoonLoading isOpen={loading || authLoading} message={loadingMessage} />
      <SyncStatus status={syncStatus} />

      <div className="max-w-6xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-16 space-y-6 md:space-y-0">
          <div className="bg-white border-[4px] md:border-[6px] border-gray-900 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-[0_8px_0_rgba(0,0,0,1)] md:shadow-[0_12px_0_rgba(0,0,0,1)] -rotate-1 w-full md:w-auto">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-2 uppercase tracking-tight md:tracking-normal leading-tight md:leading-normal">ภารกิจของคุณ</h1>
            <p className="text-gray-500 font-bold text-sm md:text-xl uppercase tracking-normal leading-relaxed">เลือกสถานการณ์เพื่อฝึกฝนทักษะการเจรจา</p>
          </div>
          
          <Link 
            href="/profile"
            prefetch={false}
            className="flex items-center space-x-4 bg-white border-4 border-gray-900 px-6 py-3 rounded-[2rem] hover:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 group self-end md:self-auto"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-nintendo-yellow border-4 border-gray-900 flex items-center justify-center text-gray-900">
              <User className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-black uppercase leading-tight mb-1">โปรไฟล์</p>
              <p className="text-base md:text-xl text-gray-900 font-black uppercase tracking-tight md:tracking-normal leading-tight md:leading-normal">{user?.name || user?.email?.split('@')[0]}</p>
            </div>
          </Link>
        </header>

        <div className="flex justify-center mb-12">
          <div className="bg-white border-[6px] border-gray-900 rounded-[2rem] p-2 flex shadow-[0_8px_0_rgba(0,0,0,1)]">
            <button
              onClick={() => setActiveTab('campaign')}
              className={`px-8 py-4 rounded-[1.5rem] font-black uppercase tracking-tighter text-lg transition-all ${
                activeTab === 'campaign' 
                  ? 'bg-nintendo-red text-white shadow-[0_4px_0_rgba(0,0,0,0.2)]' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              🏆 โหมดผ่านด่าน (Campaign)
            </button>
            <button
              onClick={() => setActiveTab('freeplay')}
              className={`px-8 py-4 rounded-[1.5rem] font-black uppercase tracking-tighter text-lg transition-all ${
                activeTab === 'freeplay' 
                  ? 'bg-nintendo-blue text-white shadow-[0_4px_0_rgba(0,0,0,0.2)]' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              🎮 โหมดเล่นอิสระ (Freeplay)
            </button>
          </div>
        </div>

        {activeTab === 'campaign' ? (
          <div className="relative py-10 max-w-3xl mx-auto flex flex-col items-center mt-10">
            {/* The winding path line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-4 md:w-6 bg-gray-900 rounded-full transform -translate-x-1/2 opacity-10"></div>

            {scenarios.filter(s => s.mode === 'campaign' || !s.mode).map((scenario, index) => {
              const isBoss = scenario.difficulty === 3;
              const isLeft = index % 2 === 0;
              
              return (
                <div key={scenario.id} className={`relative w-full flex justify-center mb-24 md:mb-32 ${isLeft ? 'pr-32 md:pr-48' : 'pl-32 md:pl-48'}`}>
                  {/* Connecting curve */}
                  <div className="absolute top-1/2 left-1/2 w-16 md:w-24 h-4 bg-gray-900 opacity-10 transform -translate-y-1/2" style={{ [isLeft ? 'right' : 'left']: '50%', transformOrigin: isLeft ? 'right center' : 'left center' }}></div>

                  <button 
                    onClick={() => setSelectedScenario(scenario)}
                    className={`relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full border-[6px] md:border-[8px] border-gray-900 flex items-center justify-center font-black text-4xl md:text-5xl shadow-[0_10px_0_rgba(0,0,0,1)] hover:translate-y-2 hover:shadow-[0_5px_0_rgba(0,0,0,1)] active:translate-y-4 active:shadow-none transition-all ${isBoss ? 'bg-nintendo-red text-white scale-110' : 'bg-nintendo-yellow text-gray-900'} group`}
                  >
                    {index + 1}
                    
                    {/* Star icon for boss */}
                    {isBoss && (
                      <div className="absolute -top-4 -right-4 w-12 h-12 bg-nintendo-yellow border-4 border-gray-900 rounded-full flex items-center justify-center text-xl animate-bounce">
                        ⭐
                      </div>
                    )}
                  </button>

                  {/* Floating label */}
                  <div className={`absolute top-1/2 -translate-y-1/2 ${isLeft ? 'left-1/2 ml-16 md:ml-24' : 'right-1/2 mr-16 md:mr-24'} w-48 md:w-64 text-${isLeft ? 'left' : 'right'}`}>
                    <h4 className={`font-black text-lg md:text-2xl text-gray-900 leading-tight bg-white px-4 py-2 rounded-2xl border-[4px] md:border-[6px] border-gray-900 inline-block shadow-[0_6px_0_rgba(0,0,0,1)] cursor-pointer hover:-translate-y-1 transition-all ${isLeft ? '-rotate-2' : 'rotate-2'}`} onClick={() => setSelectedScenario(scenario)}>
                       {scenario.title}
                    </h4>
                    {isBoss && <span className="block mt-3 text-nintendo-red font-black uppercase tracking-tighter text-sm md:text-base bg-white/80 inline-block px-2 py-1 rounded-lg border-2 border-nintendo-red ml-2">🔥 Final Exam</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {scenarios.filter(s => s.mode === 'freeplay').map((scenario, index) => {
              return (
              <div 
                key={scenario.id}
                className={`group bg-white border-[6px] border-gray-900 rounded-[3rem] overflow-hidden transition-all duration-300 shadow-[0_15px_0_rgba(0,0,0,1)] hover:translate-y-2 hover:shadow-[0_8px_0_rgba(0,0,0,1)] active:scale-95 cursor-pointer flex flex-col`}
                onClick={() => startSession(scenario.id)}
              >
                <div className="p-8 flex-1 flex flex-col relative">
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
                  <h3 className={`text-3xl font-black text-gray-900 mb-3 uppercase tracking-normal leading-relaxed`}>{scenario.title}</h3>
                  <p className="text-gray-500 font-bold mb-8 text-lg line-clamp-3 leading-relaxed">{scenario.description}</p>
                  
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
                      <span className="flex items-center text-gray-300 animate-pulse">
                        <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
                        รอสักครู่...
                      </span>
                    ) : (
                      <>
                        เริ่มภารกิจ <span className="opacity-0 group-hover:opacity-100 transition-all ml-2">→</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {scenarios.filter(s => (activeTab === 'campaign' ? (s.mode === 'campaign' || !s.mode) : s.mode === 'freeplay')).length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-white border-4 border-dashed border-gray-900 rounded-[3rem] max-w-3xl mx-auto">
            <h3 className="text-3xl font-black mb-2 uppercase">ยังไม่มีสถานการณ์เตรียมไว้</h3>
            <p className="text-gray-500 font-bold mb-8 uppercase">ดูเหมือนว่าสนามฝึกซ้อมจะว่างเปล่า</p>
            <button 
              onClick={seedScenarios}
              className="bg-nintendo-red hover:bg-red-600 text-white font-black px-8 py-3 rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 transition-all uppercase tracking-tighter"
            >
              สร้างสถานการณ์ตัวอย่าง
            </button>
          </div>
        )}
      </div>

      {/* Pop-up Modal for Campaign Level Selection */}
      {selectedScenario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-[8px] border-gray-900 rounded-[3rem] p-8 md:p-10 max-w-lg w-full shadow-[0_20px_0_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200 relative">
            
            {selectedScenario.difficulty === 3 && (
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-nintendo-red text-white font-black px-6 py-2 rounded-full border-4 border-gray-900 tracking-widest uppercase shadow-[0_4px_0_rgba(0,0,0,1)] whitespace-nowrap z-10">
                FINAL EXAM 🔥
              </div>
            )}

            <button 
              onClick={() => setSelectedScenario(null)} 
              className="absolute top-6 right-6 w-12 h-12 bg-gray-100 hover:bg-nintendo-pink hover:text-white border-4 border-gray-900 rounded-2xl flex items-center justify-center font-black text-xl transition-colors shadow-[0_4px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none z-10"
            >
              X
            </button>

            <div className="flex items-center mb-6 pt-4">
              <div className={`w-20 h-20 border-[6px] border-gray-900 rounded-[2rem] flex items-center justify-center text-4xl font-black mr-6 shadow-[0_6px_0_rgba(0,0,0,1)] -rotate-3 ${selectedScenario.difficulty === 3 ? 'bg-nintendo-red text-white' : 'bg-nintendo-yellow text-gray-900'}`}>
                {scenarios.filter(s => s.mode === 'campaign' || !s.mode).findIndex(s => s.id === selectedScenario.id) + 1}
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-gray-900 uppercase leading-tight">{selectedScenario.title}</h3>
            </div>
            
            <div className="bg-gray-50 border-4 border-gray-900 rounded-3xl p-6 mb-8">
              <p className="text-gray-700 font-bold text-lg leading-relaxed">{selectedScenario.description}</p>
              
              <div className="mt-6 flex flex-wrap gap-2">
                <span className={`px-4 py-2 border-2 border-gray-900 rounded-xl text-xs font-black uppercase tracking-tighter ${
                  selectedScenario.target_group === 'professional' ? 'bg-nintendo-blue/10 text-nintendo-blue' : 'bg-nintendo-green/10 text-nintendo-green'
                }`}>
                  {selectedScenario.target_group}
                </span>
                {selectedScenario.characters?.map((c: any, i: number) => (
                  <span key={i} className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-500 rounded-xl text-xs font-black uppercase tracking-tighter">
                    👤 {c.name}
                  </span>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => {
                const id = selectedScenario.id;
                setSelectedScenario(null);
                startSession(id);
              }}
              className="w-full bg-nintendo-blue text-white py-6 rounded-[2rem] border-[6px] border-gray-900 font-black text-3xl uppercase tracking-tighter shadow-[0_12px_0_rgba(0,0,0,1)] hover:translate-y-2 hover:shadow-[0_6px_0_rgba(0,0,0,1)] active:translate-y-4 active:shadow-none transition-all flex items-center justify-center group"
            >
              เริ่มลุยด่านนี้! <span className="inline-block ml-4 group-hover:translate-x-2 transition-transform">🚀</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
