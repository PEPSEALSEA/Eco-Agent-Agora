'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  Users, Briefcase, GraduationCap, User, Lock, Unlock, Star, 
  Play, Gift, Skull, Award, Sparkles, ChevronRight, X, 
  ArrowLeft, RefreshCw, CheckCircle2, ShieldAlert, Zap, Trophy, HelpCircle
} from 'lucide-react';
import { gasFetch, gasPost, uuid } from '@/lib/gas';
import Link from 'next/link';
import SyncStatus from '@/components/SyncStatus';
import { CartoonLoading } from '@/components/CartoonLoading';
import { motion, AnimatePresence } from 'framer-motion';

type Scenario = {
  id: string;
  title: string;
  description: string;
  target_group: string;
  characters: any[];
  mode?: 'campaign' | 'freeplay';
  difficulty?: number;
  phase_rules?: any;
};

// Opponent details & landmark mapper
const getLandmarkInfo = (difficulty: number, index: number) => {
  const landmarks = [
    {
      icon: "🏢",
      title: "สมรภูมิตึกทีมพัฒนา",
      bg: "bg-teal-400",
      border: "border-teal-600",
      shadow: "shadow-teal-800",
      avatar: "👨‍💻",
      reward: "การ์ดเจรจาเร่งด่วน +150 XP",
      characterDetails: "อเล็กซ์: โปรแกรมเมอร์อาวุโสจอมบ่น, ซาร่า: ผู้จัดการผลิตภัณฑ์ผู้เคร่งครัดเรื่องเวลา"
    },
    {
      icon: "💰",
      title: "ห้องนิรภัยเจรจาแสนล้าน",
      bg: "bg-amber-400",
      border: "border-amber-600",
      shadow: "shadow-amber-800",
      avatar: "👔",
      reward: "การ์ดตรรกะทองคำ +250 XP",
      characterDetails: "คุณเฮนเดอร์สัน: เจ้าของธุรกิจจอมประหยัด พูดจาสุภาพแต่อ่อนข้อให้ยากมาก"
    },
    {
      icon: "🌾",
      title: "หมู่บ้านป่าชุมชนลุงบุญส่ง",
      bg: "bg-emerald-400",
      border: "border-emerald-600",
      shadow: "shadow-emerald-800",
      avatar: "👨‍🌾",
      reward: "เหรียญเกียรติยศผู้เจรจาสมดุล +350 XP",
      characterDetails: "ลุงบุญส่ง: หัวหน้าชุมชนเจ้าถิ่น อารมณ์ร้อนเด็ดขาด, ป้าสมใจ: แกนนำกลุ่มแม่บ้านพลังเยอะ"
    }
  ];
  
  return landmarks[(difficulty - 1) % landmarks.length] || {
    icon: "🗺️",
    title: `ด่านลับที่ ${index + 1}`,
    bg: "bg-purple-400",
    border: "border-purple-600",
    shadow: "shadow-purple-800",
    avatar: "🕵️",
    reward: "XP พิเศษและโบนัสทักษะการโน้มน้าว",
    characterDetails: "คู่เจรจาลึกลับที่มีเป้าหมายและแผนการรับมือที่คุณคาดไม่ถึง"
  };
};

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('กำลังเสกข้อมูลให้คุณ...');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'updated'>('idle');
  const [activeTab, setActiveTab] = useState<'campaign' | 'freeplay'>('campaign');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [shakingNodeId, setShakingNodeId] = useState<string | null>(null);
  const [showLockedAlert, setShowLockedAlert] = useState<string | null>(null);
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Load from local storage SWR cache immediately, then fetch fresh in background
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchAllData = async () => {
      setSyncStatus('syncing');
      setLoadingMessage('กำลังตามหาประวัติการเจรจาของคุณ...');
      
      const cacheKey = 'gas-swr-read_all';
      
      // 1. Try to load cached data for SWR
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed?.data) {
              const sorted = (Array.isArray(parsed.data.scenarios) ? parsed.data.scenarios : [])
                .sort((a: any, b: any) => (a.difficulty || 1) - (b.difficulty || 1));
              setScenarios(sorted);
              setSessions(Array.isArray(parsed.data.sessions) ? parsed.data.sessions : []);
              setLoading(false);
            }
          } catch (e) {
            console.error('Local cache parse error', e);
          }
        }
      }

      // 2. Fetch fresh data from backend
      try {
        const allData = await gasFetch('read_all');
        if (allData && !allData.error) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(cacheKey, JSON.stringify({
              data: allData,
              timestamp: Date.now()
            }));
          }
          const sorted = (Array.isArray(allData.scenarios) ? allData.scenarios : [])
            .sort((a: any, b: any) => (a.difficulty || 1) - (b.difficulty || 1));
          setScenarios(sorted);
          setSessions(Array.isArray(allData.sessions) ? allData.sessions : []);
          setSyncStatus('updated');
        } else {
          setSyncStatus('idle');
        }
      } catch (err) {
        console.error('Fetch all data error:', err);
        setSyncStatus('idle');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAllData();
    }
  }, [user, authLoading, router]);

  const seedScenarios = async () => {
    setLoading(true);
    setLoadingMessage('กำลังสร้างโลกการเจรจาใหม่...');
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
        description: "คุณกำลังขอขึ้นเงินเดือน 20% หลังจากปีที่ประสบความสำเร็จ แต่บริษัทกำลังอยู่ในช่วง 'ปีที่ต้องประหยัดงบ'",
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
        description: "บริษัทต้องการเช่าที่ดินทำโครงการ แต่เกษตรกรกังวลและมีวาระซ่อนเร้นที่ไม่ยอมบอกตรงๆ (ด่านวัดระดับความพร้อมเจรจาขั้นสูงสุด)",
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
        description: "คุณต้องการซื้อรถมือสองในราคาที่ถูกลง แต่เต็นท์รถมีเหตุผลร้อยแปดที่ลดราคาไม่ได้ โหมดเล่นอิสระที่คุณสามารถทดลองเทคนิคเจรจาต่างๆ ได้อย่างไร้ขีดจำกัด",
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
      const data = await gasFetch('read_all');
      if (data && !data.error) {
        setScenarios(Array.isArray(data.scenarios) ? data.scenarios : []);
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      }
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
    setLoadingMessage('กำลังจัดโต๊ะเจรจาลับ...');
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

      // Invalidate the cache to ensure fresh state on return
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gas-swr-read_all');
      }

      router.push(`/negotiate?sessionId=${sessionId}`);
    } catch (err: any) {
      console.error('Session start error:', err);
      alert('Error starting session: ' + err.message);
      setLoading(false);
    }
  };

  const campaignScenarios = scenarios.filter(s => s.mode === 'campaign' || !s.mode);
  const freeplayScenarios = scenarios.filter(s => s.mode === 'freeplay');

  // Calculates locked/unlocked and star rating for a scenario based on index
  const getScenarioStatus = (scenario: Scenario, index: number) => {
    const scenarioSessions = sessions.filter(s => s.scenario_id === scenario.id);
    const completedSessions = scenarioSessions.filter(s => s.outcome_score !== undefined);
    
    const maxScore = completedSessions.length > 0 
      ? Math.max(...completedSessions.map(s => s.outcome_score || 0)) 
      : 0;
    
    const isCleared = completedSessions.length > 0;
    
    // Star Rating mapping:
    let stars = 0;
    if (maxScore >= 85) stars = 3;
    else if (maxScore >= 65) stars = 2;
    else if (maxScore >= 40) stars = 1;

    // Lock/Unlock system: Level 1 is always unlocked. Others are unlocked if the previous one has been completed.
    let isUnlocked = false;
    if (index === 0) {
      isUnlocked = true;
    } else {
      const prevScenario = campaignScenarios[index - 1];
      const prevSessions = sessions.filter(s => s.scenario_id === prevScenario.id);
      const prevCleared = prevSessions.length > 0;
      isUnlocked = prevCleared;
    }

    return { isCleared, isUnlocked, stars, maxScore };
  };

  const handleNodeClick = (scenario: Scenario, index: number) => {
    const { isUnlocked } = getScenarioStatus(scenario, index);
    
    if (!isUnlocked) {
      setShakingNodeId(scenario.id);
      setShowLockedAlert(`ช้าก่อน! ต้องผ่านด่านที่ ${index} "${campaignScenarios[index-1]?.title}" ก่อนนะจ๊ะ! 🔒`);
      
      setTimeout(() => {
        setShakingNodeId(null);
      }, 500);
      return;
    }
    
    setSelectedScenario(scenario);
    setShowLockedAlert(null);
  };

  // Define column percentages for a vertical winding path (e.g. Left, Center, Right, Center)
  const colPercents = [22, 50, 78, 50];

  return (
    <div className="min-h-screen cartoon-bg-blue p-4 sm:p-8 relative overflow-x-hidden">
      <CartoonLoading isOpen={loading || authLoading} message={loadingMessage} />
      <SyncStatus status={syncStatus} />

      {/* Floating Decorative Clouds (Framer Motion Loops) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ x: ['-20%', '120%'] }}
          transition={{ repeat: Infinity, duration: 45, ease: 'linear' }}
          className="absolute top-16 left-0 text-7xl opacity-20 filter drop-shadow-[0_4px_0_#000]"
        >
          ☁️
        </motion.div>
        <motion.div 
          animate={{ x: ['120%', '-20%'] }}
          transition={{ repeat: Infinity, duration: 55, ease: 'linear' }}
          className="absolute top-[400px] right-0 text-8xl opacity-15 filter drop-shadow-[0_4px_0_#000]"
        >
          ☁️
        </motion.div>
        <motion.div 
          animate={{ x: ['-30%', '110%'] }}
          transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
          className="absolute bottom-32 left-0 text-6xl opacity-25 filter drop-shadow-[0_4px_0_#000]"
        >
          ☁️
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 space-y-6 md:space-y-0">
          <div className="bg-white border-[6px] border-gray-900 p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_10px_0_rgba(0,0,0,1)] -rotate-1 w-full md:w-auto">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-2 uppercase tracking-tight leading-tight flex items-center gap-3">
              <Trophy className="text-nintendo-yellow w-10 h-10 filter drop-shadow-[0_2px_0_#000]" strokeWidth={3} />
              สมรภูมิเจรจาลับ
            </h1>
            <p className="text-gray-500 font-bold text-sm md:text-lg uppercase tracking-normal leading-relaxed">
              ฝึกทักษะการเจรจาระดับมือโปรเพื่อพิชิตภารกิจและก้าวขึ้นเป็นสุดยอดนักคุย!
            </p>
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
              <p className="text-[10px] text-gray-400 font-black uppercase leading-tight mb-1">นักเจรจา</p>
              <p className="text-base md:text-xl text-gray-900 font-black uppercase tracking-tight leading-tight">
                {user?.name || user?.email?.split('@')[0]}
              </p>
            </div>
          </Link>
        </header>

        {/* Locked Popup Alert */}
        <AnimatePresence>
          {showLockedAlert && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="bg-nintendo-red text-white border-4 border-gray-900 px-6 py-4 rounded-2xl font-black text-center shadow-[0_6px_0_#000] mb-8 flex items-center justify-center gap-3 relative z-30"
            >
              <ShieldAlert size={24} className="animate-bounce" />
              <span>{showLockedAlert}</span>
              <button 
                onClick={() => setShowLockedAlert(null)} 
                className="absolute right-4 text-white hover:text-gray-200 text-lg font-black"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modes Navigation - Styled like a Retro Handheld Console Controller */}
        <div className="flex justify-center mb-16">
          <div className="bg-gray-800 border-[6px] border-black rounded-[2.5rem] p-3 flex shadow-[0_12px_0_#000] relative">
            <div className="absolute -top-3 left-10 px-3 bg-nintendo-red text-white text-[10px] font-black border-2 border-black rounded-md rotate-[-3deg] uppercase tracking-wider">
              Mode Selection
            </div>
            <button
              onClick={() => {
                setActiveTab('campaign');
                setShowLockedAlert(null);
              }}
              className={`flex items-center px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black uppercase tracking-tighter text-sm md:text-lg transition-all ${
                activeTab === 'campaign' 
                  ? 'bg-nintendo-pink text-white shadow-[0_6px_0_#000] -translate-y-1' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <span className="mr-2 text-xl">🏆</span> แผนกผ่านด่าน (CAMPAIGN)
            </button>
            <button
              onClick={() => {
                setActiveTab('freeplay');
                setShowLockedAlert(null);
              }}
              className={`flex items-center px-6 md:px-8 py-3 md:py-4 rounded-2xl font-black uppercase tracking-tighter text-sm md:text-lg transition-all ${
                activeTab === 'freeplay' 
                  ? 'bg-nintendo-blue text-white shadow-[0_6px_0_#000] -translate-y-1' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              <span className="mr-2 text-xl">🎮</span> ด่านเล่นอิสระ (FREEPLAY)
            </button>
          </div>
        </div>

        {/* CAMPAIGN MODE (VERTICAL WINDING MAP REDESIGN) */}
        {activeTab === 'campaign' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            
            {/* The Winding Map Board (7 Columns on Desktop) */}
            <div className="lg:col-span-8 bg-white border-[6px] border-gray-900 rounded-[3rem] shadow-[0_15px_0_rgba(0,0,0,1)] overflow-hidden relative p-6 sm:p-12 min-h-[700px] flex flex-col justify-center">
              
              {/* Radial Dot Pattern overlay */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,black_3px,transparent_4px)] bg-[size:32px_32px] pointer-events-none"></div>
              
              <div className="relative w-full z-10" style={{ minHeight: `${campaignScenarios.length * 200}px` }}>
                
                {/* SVG Connecting Path */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  {campaignScenarios.map((scenario, index) => {
                    if (index === campaignScenarios.length - 1) return null;
                    
                    const x1 = colPercents[index % colPercents.length];
                    const x2 = colPercents[(index + 1) % colPercents.length];
                    const y1 = index * 200 + 100;
                    const y2 = (index + 1) * 200 + 100;
                    const cpY1 = y1 + 70;
                    const cpY2 = y2 - 70;
                    
                    return (
                      <g key={`winding-path-${scenario.id}`}>
                        {/* Shadow Outline Line */}
                        <path
                          d={`M ${x1}% ${y1} C ${x1}% ${cpY1}, ${x2}% ${cpY2}, ${x2}% ${y2}`}
                          fill="transparent"
                          stroke="black"
                          strokeWidth="16"
                          strokeLinecap="round"
                        />
                        {/* Core Dashed Glowing Road */}
                        <path
                          d={`M ${x1}% ${y1} C ${x1}% ${cpY1}, ${x2}% ${cpY2}, ${x2}% ${y2}`}
                          fill="transparent"
                          stroke="#f8cc00"
                          strokeWidth="8"
                          strokeDasharray="16, 12"
                          strokeLinecap="round"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Level Nodes */}
                {campaignScenarios.map((scenario, index) => {
                  const { isCleared, isUnlocked, stars, maxScore } = getScenarioStatus(scenario, index);
                  const isBoss = scenario.difficulty === 3;
                  const colX = colPercents[index % colPercents.length];
                  const rowY = index * 200 + 100;
                  const landmark = getLandmarkInfo(scenario.difficulty || 1, index);
                  
                  return (
                    <div 
                      key={scenario.id} 
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-transform"
                      style={{ left: `${colX}%`, top: `${rowY}px` }}
                    >
                      {/* Landmark Visual Indicator Under/Beside Node */}
                      <div className="absolute -bottom-16 w-28 text-center pointer-events-none select-none">
                        <div className="text-gray-900 font-black text-xs px-2 py-0.5 bg-white border-2 border-black rounded-lg shadow-[0_2px_0_#000] truncate">
                          {landmark.title}
                        </div>
                      </div>

                      {/* Level Node Box */}
                      <motion.div
                        animate={shakingNodeId === scenario.id ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        className="relative"
                      >
                        {/* Node Star rating (Under node) */}
                        <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 flex space-x-1 z-20 bg-gray-900 border-2 border-black px-2 py-0.5 rounded-full shadow-[0_2px_0_#000]">
                          {[1, 2, 3].map((s) => (
                            <Star 
                              key={s} 
                              size={12} 
                              className={s <= stars ? "text-nintendo-yellow fill-nintendo-yellow animate-pulse" : "text-gray-600"} 
                              strokeWidth={3}
                            />
                          ))}
                        </div>

                        {/* Node Main Button */}
                        <button
                          onClick={() => handleNodeClick(scenario, index)}
                          className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-[6px] border-black flex flex-col items-center justify-center font-black transition-all duration-300 group
                            ${!isUnlocked 
                              ? 'bg-gray-400 text-gray-700 cursor-not-allowed shadow-[0_6px_0_#1a1a1a]' 
                              : isBoss 
                                ? 'bg-gradient-to-br from-nintendo-red to-rose-600 text-white shadow-[0_8px_0_#000] hover:scale-110 hover:-translate-y-1 active:scale-95 active:shadow-[0_4px_0_#000]' 
                                : 'bg-gradient-to-br from-nintendo-yellow to-amber-500 text-gray-900 shadow-[0_8px_0_#000] hover:scale-110 hover:-translate-y-1 active:scale-95 active:shadow-[0_4px_0_#000]'
                            }
                          `}
                        >
                          {/* Pulsing Active Highlight */}
                          {isUnlocked && !isCleared && (
                            <div className="absolute -inset-2 rounded-full border-4 border-dashed border-nintendo-pink animate-spin [animation-duration:8s] pointer-events-none"></div>
                          )}

                          {/* Node Icon/Number */}
                          {!isUnlocked ? (
                            <Lock size={32} className="text-gray-700" strokeWidth={3} />
                          ) : (
                            <div className="flex flex-col items-center">
                              <span className="text-4xl drop-shadow-[0_3px_0_rgba(0,0,0,0.3)]">{index + 1}</span>
                              <span className="text-[10px] uppercase font-black tracking-widest opacity-80 leading-none mt-1">
                                {isBoss ? "BOSS 🔥" : "START"}
                              </span>
                            </div>
                          )}

                          {/* Cleared Checkmark Badge */}
                          {isCleared && (
                            <div className="absolute -bottom-1 -right-1 bg-nintendo-green border-4 border-black rounded-full p-1 text-white shadow-[0_2px_0_#000] rotate-12">
                              <CheckCircle2 size={16} strokeWidth={4} />
                            </div>
                          )}
                        </button>
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Campaign Sidebar Drawer/Details (4 Columns on Desktop) */}
            <div className="lg:col-span-4 space-y-6">
              
              <AnimatePresence mode="wait">
                {selectedScenario ? (
                  <motion.div
                    key={selectedScenario.id}
                    initial={{ opacity: 0, x: 50, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 50, scale: 0.95 }}
                    className="bg-white border-[6px] border-gray-900 rounded-[2.5rem] p-6 shadow-[0_12px_0_rgba(0,0,0,1)] relative overflow-hidden"
                  >
                    {/* Top banner tag */}
                    <div className="absolute top-0 left-0 right-0 h-4 bg-nintendo-pink"></div>
                    
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-nintendo-yellow text-gray-900 border-2 border-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight">
                          ด่านที่ {campaignScenarios.findIndex(s => s.id === selectedScenario.id) + 1}
                        </span>
                        {selectedScenario.difficulty === 3 && (
                          <span className="bg-nintendo-red text-white border-2 border-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                            FINAL BOSS 🔥
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => setSelectedScenario(null)}
                        className="p-1 bg-gray-100 hover:bg-red-100 border-2 border-black rounded-lg transition-all"
                      >
                        <X size={16} strokeWidth={3} />
                      </button>
                    </div>

                    <h2 className="text-3xl font-black text-gray-900 mb-4 uppercase tracking-tighter leading-tight">
                      {selectedScenario.title}
                    </h2>
                    
                    <div className="bg-gray-50 border-4 border-gray-900 rounded-2xl p-4 mb-6">
                      <p className="text-gray-700 font-bold text-sm leading-relaxed mb-4">
                        {selectedScenario.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                        <span>เป้าหมายหลัก:</span>
                        <span className="text-nintendo-blue">ผ่านด่านและทำคะแนน &gt; 40%</span>
                      </div>
                    </div>

                    {/* Opponent Profile Panel */}
                    <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                      🕵️ ข้อมูลฝ่ายเจรจา (Opponent)
                    </h3>
                    <div className="bg-sky-50 border-4 border-gray-900 rounded-2xl p-4 mb-6 relative overflow-hidden">
                      <div className="absolute right-3 top-3 text-5xl opacity-20 select-none">
                        {getLandmarkInfo(selectedScenario.difficulty || 1, 0).avatar}
                      </div>
                      
                      <div className="space-y-3 relative z-10">
                        {selectedScenario.characters?.map((c: any, i: number) => (
                          <div key={i} className="border-b-2 border-dashed border-sky-200 pb-2 last:border-b-0 last:pb-0">
                            <h4 className="font-black text-base text-gray-900 flex items-center gap-1.5">
                              <span className="text-sm">👤</span> {c.name}
                            </h4>
                            <p className="text-gray-500 font-bold text-xs leading-relaxed mt-0.5">
                              <strong className="text-gray-600">บุคลิก:</strong> {c.personality || 'ไม่ระบุ'} <br />
                              <strong className="text-gray-600">ความต้องการลับ:</strong> {c.agenda || 'มีวาระซ่อนเร้น'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Win / Phase Roadmap */}
                    <h3 className="text-lg font-black text-gray-900 mb-3 flex items-center gap-2">
                      🗺️ เส้นทางความก้าวหน้า (Phases)
                    </h3>
                    <div className="grid grid-cols-4 gap-1 border-4 border-gray-900 p-2 rounded-2xl bg-gray-100 mb-6">
                      {selectedScenario.phase_rules?.phases?.map((p: string, i: number) => (
                        <div 
                          key={p} 
                          className="bg-white border-2 border-black p-1 rounded-lg text-center flex flex-col justify-center items-center shadow-[0_2px_0_#000] rotate-1 group hover:scale-105 transition-transform"
                        >
                          <span className="text-[10px] text-gray-400 font-black leading-none mb-0.5">P-{i+1}</span>
                          <span className="text-[10px] font-black text-gray-900 uppercase truncate w-full">
                            {p === 'opening' || p === 'rapport' ? '🤝 คุยสนุก' :
                             p === 'conflict' || p === 'listening' ? '🔥 เผชิญหน้า' :
                             p === 'negotiation' || p === 'bargaining' ? '⚖️ แลกเปลี่ยน' : '🏁 บทสรุป'}
                          </span>
                        </div>
                      )) || (
                        <div className="col-span-4 text-center py-2 font-bold text-xs text-gray-400">
                          ไม่มีข้อมูลเฟสแบบเฉพาะเจาะจง
                        </div>
                      )}
                    </div>

                    {/* Rewards Chest Section */}
                    <div className="border-4 border-dashed border-nintendo-green bg-emerald-50 rounded-2xl p-4 mb-6">
                      <h4 className="font-black text-sm text-nintendo-green flex items-center gap-1.5 mb-2">
                        <Gift size={16} /> ของรางวัลการผ่านด่าน (Rewards)
                      </h4>
                      <p className="text-xs text-gray-600 font-bold leading-relaxed">
                        • {getLandmarkInfo(selectedScenario.difficulty || 1, 0).reward} <br />
                        • โบนัสสิทธิ์ในการแต่งตัวโปรไฟล์เจรจาลับ
                      </p>
                    </div>

                    {/* Action Button */}
                    <button 
                      onClick={() => {
                        const id = selectedScenario.id;
                        setSelectedScenario(null);
                        startSession(id);
                      }}
                      className="w-full bg-nintendo-blue text-white py-4 rounded-2xl border-[6px] border-gray-900 font-black text-2xl uppercase tracking-tighter shadow-[0_8px_0_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[0_4px_0_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all flex items-center justify-center gap-2 group"
                    >
                      <span>เริ่มการเจรจาลับ!</span> 
                      <Play size={20} className="fill-current group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-selection"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-gray-100 border-[6px] border-dashed border-gray-900 rounded-[2.5rem] p-8 text-center flex flex-col justify-center items-center h-full min-h-[300px]"
                  >
                    <div className="text-5xl mb-4 animate-bounce">👉</div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">เลือกด่านรบเจรจา!</h3>
                    <p className="text-gray-500 font-bold text-sm leading-relaxed max-w-[25ch]">
                      คลิกปุ่มตัวเลขบนแผนผังผจญภัย เพื่อวิเคราะห์ภารกิจ ตรวจสอบคู่เจรจา และโชว์ของรางวัลก่อนเริ่มสู้!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          
          /* FREEPLAY MODE (RETRO ARCADE CABINET SELECTION) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
            {freeplayScenarios.map((scenario, index) => {
              return (
                <div 
                  key={scenario.id}
                  className="group bg-gray-900 border-[6px] border-black rounded-[3rem] overflow-hidden transition-all duration-300 shadow-[0_15px_0_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[0_22px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-[0_8px_0_rgba(0,0,0,1)] cursor-pointer flex flex-col relative"
                  onClick={() => startSession(scenario.id)}
                >
                  {/* Neon Header Marquee */}
                  <div className="bg-nintendo-blue border-b-[6px] border-black py-2 px-4 flex justify-between items-center">
                    <span className="font-black text-xs text-white uppercase tracking-widest">
                      🕹️ FREEPLAY CABINET
                    </span>
                    <span className="bg-white border-2 border-black rounded px-1.5 py-0.5 text-[8px] font-black text-gray-900 animate-pulse">
                      INSERT COIN
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col relative bg-gray-800">
                    {/* Screen Outer Border */}
                    <div className="bg-black border-[4px] border-gray-900 p-4 rounded-2xl mb-6 shadow-inner flex-1 flex flex-col justify-between">
                      <div>
                        {/* Target Badge & Icon */}
                        <div className="flex justify-between items-center mb-4">
                          <span className="bg-nintendo-pink border-2 border-black text-white px-2 py-0.5 rounded text-[10px] font-black tracking-widest">
                            {scenario.target_group?.toUpperCase() || 'GENERAL'}
                          </span>
                          <span className="text-xl">👾</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-black text-nintendo-yellow group-hover:text-white transition-colors mb-2 uppercase tracking-wide leading-tight">
                          {scenario.title}
                        </h3>
                        {/* Description */}
                        <p className="text-gray-400 font-bold text-xs leading-relaxed line-clamp-4">
                          {scenario.description}
                        </p>
                      </div>

                      {/* Character Faces */}
                      <div className="mt-6 flex -space-x-3">
                        {scenario.characters?.map((char: any, i: number) => (
                          <div 
                            key={i} 
                            className="w-9 h-9 rounded-xl bg-white border-2 border-black flex items-center justify-center text-xs font-black text-gray-900 shadow-md transform rotate-6 odd:-rotate-6"
                            title={char.name}
                          >
                            {char.name?.charAt(0) || '?'}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Joystick Dashboard Area (Cabinet Base) */}
                    <div className="bg-gray-900 border-[4px] border-black p-3 rounded-2xl flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        {/* Joystick drawing */}
                        <div className="w-5 h-5 rounded-full bg-nintendo-red border-2 border-black relative">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/60 absolute top-0.5 left-0.5"></div>
                        </div>
                        <span className="text-[8px] text-gray-400 font-black tracking-widest">1P START</span>
                      </div>
                      
                      <div className="flex gap-1.5">
                        {/* Action buttons */}
                        <div className="w-3.5 h-3.5 rounded-full bg-nintendo-yellow border-2 border-black shadow"></div>
                        <div className="w-3.5 h-3.5 rounded-full bg-nintendo-green border-2 border-black shadow"></div>
                        <div className="w-3.5 h-3.5 rounded-full bg-nintendo-pink border-2 border-black shadow"></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* If no scenarios match */}
        {((activeTab === 'campaign' && campaignScenarios.length === 0) || 
          (activeTab === 'freeplay' && freeplayScenarios.length === 0)) && !loading && (
          <div className="col-span-full py-20 text-center bg-white border-[6px] border-gray-900 rounded-[3rem] max-w-3xl mx-auto shadow-[0_10px_0_#000]">
            <HelpCircle size={64} className="mx-auto text-nintendo-red mb-4 animate-bounce" />
            <h3 className="text-3xl font-black mb-2 uppercase text-gray-900">ยังไม่มีสถานการณ์เจรจา</h3>
            <p className="text-gray-500 font-bold mb-8 uppercase text-sm">
              ดูเหมือนว่าสมรภูมินี้จะยังไม่มีด่านให้ทดสอบความสามารถ
            </p>
            <button 
              onClick={seedScenarios}
              className="bg-nintendo-red hover:bg-red-600 text-white font-black px-8 py-4 rounded-2xl border-[6px] border-gray-900 shadow-[0_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 transition-all uppercase tracking-tighter text-xl"
            >
              สร้างด่านเจรจาตัวอย่างทันที!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
