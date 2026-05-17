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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {scenarios.filter(s => (activeTab === 'campaign' ? (s.mode === 'campaign' || !s.mode) : s.mode === 'freeplay')).map((scenario, index) => {
            const isBossStage = scenario.difficulty === 3 && activeTab === 'campaign';
            const isFreeplay = activeTab === 'freeplay';
            return (
            <div 
              key={scenario.id}
              className={`group bg-white border-[6px] ${isBossStage ? 'border-nintendo-red' : 'border-gray-900'} rounded-[3rem] overflow-hidden transition-all duration-300 shadow-[0_15px_0_rgba(0,0,0,1)] hover:translate-y-2 hover:shadow-[0_8px_0_rgba(0,0,0,1)] active:scale-95 cursor-pointer flex flex-col`}
              onClick={() => startSession(scenario.id)}
            >
              <div className="p-8 flex-1 flex flex-col relative">
                {isBossStage && <div className="absolute top-0 right-0 bg-nintendo-red text-white font-black text-xs px-4 py-1 rounded-bl-xl border-l-4 border-b-4 border-nintendo-red">FINAL EXAM</div>}
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-2xl border-4 border-gray-900 text-white shadow-[0_6px_0_rgba(0,0,0,0.1)] ${isBossStage ? 'bg-nintendo-red' : scenario.target_group === 'professional' ? 'bg-nintendo-blue' : 'bg-nintendo-green'}`}>
                    {scenario.target_group === 'professional' ? <Briefcase size={32} /> : <GraduationCap size={32} />}
                  </div>
                  <span className={`px-4 py-2 border-4 border-gray-900 rounded-full text-sm font-black uppercase tracking-tighter ${
                    isBossStage ? 'bg-nintendo-red text-white' : scenario.target_group === 'professional' ? 'bg-nintendo-pink text-white' : 'bg-nintendo-yellow text-gray-900'
                  }`}>
                    {isFreeplay ? (scenario.target_group?.toUpperCase() || 'GENERAL') : `ด่านที่ ${scenario.difficulty || index + 1}`}
                  </span>
                </div>
                <h3 className={`text-3xl font-black ${isBossStage ? 'text-nintendo-red' : 'text-gray-900'} mb-3 uppercase tracking-normal leading-relaxed`}>{scenario.title}</h3>
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

          {scenarios.filter(s => (activeTab === 'campaign' ? (s.mode === 'campaign' || !s.mode) : s.mode === 'freeplay')).length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-white border-4 border-dashed border-gray-900 rounded-[3rem]">
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
      </div>
    </div>
  );
}
