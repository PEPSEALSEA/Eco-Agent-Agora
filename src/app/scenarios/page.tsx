'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { 
  Lock, Unlock, Star, Play, Gift, ShieldAlert, Zap, Trophy, 
  HelpCircle, User, Compass, Bookmark, 
  ChevronRight, X, ArrowLeft, RefreshCw, CheckSquare, Coffee
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

// Opponent details & notebook styling details
const getLandmarkInfo = (difficulty: number, index: number) => {
  const landmarks = [
    {
      icon: "🏢",
      title: "สมรภูมิตึกทีมพัฒนา",
      bg: "bg-[#2563eb]/10 text-[#2563eb]",
      avatar: "👨‍💻",
      reward: "การ์ด 'คุยเร่งด่วน' +150 XP",
      characterDetails: "อเล็กซ์: โปรแกรมเมอร์จอมบ่น, ซาร่า: PM ผู้เร่งรีบ",
      landmarkName: "แผนกไอทีอาละวาด",
      sealColor: "bg-rose-600 hover:bg-rose-700",
      sealShadow: "shadow-rose-950/50"
    },
    {
      icon: "💰",
      title: "ห้องเจรจาเงินเดือนแสน",
      bg: "bg-[#d97706]/10 text-[#d97706]",
      avatar: "👔",
      reward: "การ์ด 'ตรรกะทองคำ' +250 XP",
      characterDetails: "คุณเฮนเดอร์สัน: เจ้าของธุรกิจจอมประหยัด พูดสุภาพแต่ใจแข็ง",
      landmarkName: "ห้องเจรจาเงินล้าน",
      sealColor: "bg-amber-600 hover:bg-amber-700",
      sealShadow: "shadow-amber-950/50"
    },
    {
      icon: "🌾",
      title: "ฟาร์มผักลุงบุญส่ง",
      bg: "bg-[#059669]/10 text-[#059669]",
      avatar: "👨‍🌾",
      reward: "เหรียญผู้เจรจาชุมชน +350 XP",
      characterDetails: "ลุงบุญส่ง: หัวหน้ากลุ่มเกษตรกร, ป้าสมใจ: แกนนำกลุ่มแม่บ้าน",
      landmarkName: "ป่าชุมชนลุงบุญส่ง",
      sealColor: "bg-emerald-600 hover:bg-emerald-700",
      sealShadow: "shadow-emerald-950/50"
    }
  ];
  
  return landmarks[(difficulty - 1) % landmarks.length] || {
    icon: "🗺️",
    title: `ด่านลับที่ ${index + 1}`,
    bg: "bg-purple-500/10 text-purple-600",
    avatar: "🕵️",
    reward: "XP พิเศษและโบนัสทักษะ",
    characterDetails: "คู่เจรจาลึกลับที่มีเป้าหมายและแผนการลับคาดเดาได้ยาก",
    landmarkName: `สมรภูมิลับที่ ${index + 1}`,
    sealColor: "bg-purple-600 hover:bg-purple-700",
    sealShadow: "shadow-purple-950/50"
  };
};

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('กำลังเปิดสมุดบันทึกนักเจรจา...');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'updated'>('idle');
  const [activeTab, setActiveTab] = useState<'campaign' | 'freeplay'>('campaign');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [shakingNodeId, setShakingNodeId] = useState<string | null>(null);
  const [showLockedAlert, setShowLockedAlert] = useState<string | null>(null);
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const fetchAllData = async () => {
    setSyncStatus('syncing');
    setError(null);
    const cacheKey = 'gas-swr-read_all';
    
    // 1. Try to load cached data for instant render
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

    // 2. Fetch fresh data in background from backend GAS
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
        setError(allData?.error || 'ไม่สามารถติดต่อเซิร์ฟเวอร์ระบบเจรจาได้');
        setSyncStatus('idle');
      }
    } catch (err: any) {
      console.error('Fetch all data error:', err);
      setError(err.message || 'ระบบขัดข้องในการเชื่อมโยงข้อมูล');
      setSyncStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  // Custom Local Storage SWR Cache implementation
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchAllData();
    }
  }, [user, authLoading, router]);

  const seedScenarios = async () => {
    setLoading(true);
    setLoadingMessage('กำลังบันทึกหน้ากระดาษเจรจาใหม่...');
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
        description: "คุณต้องการซื้อรถมือสองในราคาที่ถูกลง แต่เต็นท์รถมีเหตุผลร้อยแปดที่ลดราคาไม่ได้ โหมดเล่นอิสระที่คุณสามารถทดลองเทคนิคเจรจาต่างๆ ได้",
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
    setLoadingMessage('กำลังรังสรรค์โต๊ะเจรจาของคุณ...');
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

  // Calculates level validation and star achievements dynamically
  const getScenarioStatus = (scenario: Scenario, index: number) => {
    const scenarioSessions = sessions.filter(s => s.scenario_id === scenario.id);
    const completedSessions = scenarioSessions.filter(s => s.outcome_score !== undefined);
    
    const maxScore = completedSessions.length > 0 
      ? Math.max(...completedSessions.map(s => s.outcome_score || 0)) 
      : 0;
    
    const isCleared = completedSessions.length > 0;
    
    let stars = 0;
    if (maxScore >= 85) stars = 3;
    else if (maxScore >= 65) stars = 2;
    else if (maxScore >= 40) stars = 1;

    // Sequential Branching Logic:
    let isUnlocked = false;
    if (index === 0) {
      isUnlocked = true;
    } else {
      // Node is unlocked if the PREVIOUS node is cleared
      const prevScenario = campaignScenarios[index - 1];
      const prevSessions = sessions.filter(s => s.scenario_id === prevScenario?.id);
      const prevCleared = prevSessions.some(s => s.outcome_score !== undefined);
      isUnlocked = prevCleared;
    }

    return { isCleared, isUnlocked, stars, maxScore };
  };

  const handleNodeClick = (scenario: Scenario, index: number) => {
    const { isUnlocked } = getScenarioStatus(scenario, index);
    
    if (!isUnlocked) {
      setShakingNodeId(scenario.id);
      setShowLockedAlert(`ช้าก่อน! ต้องพิชิตด่านที่ 1 "${campaignScenarios[0]?.title || 'ด่านแรก'}" เพื่อปลดล็อกเส้นทางแยกเจรจา! 🔒`);
      
      setTimeout(() => {
        setShakingNodeId(null);
      }, 500);
      return;
    }
    
    setSelectedScenario(scenario);
    setShowLockedAlert(null);
  };

  return (
    <div className="min-h-screen bg-[#1e1510] text-[#2b221a] p-4 sm:p-8 relative overflow-x-hidden">
      <CartoonLoading isOpen={loading || authLoading} message={loadingMessage} />
      <SyncStatus status={syncStatus} />

      {/* Floating Sketches & Coffee Cup Rings in Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        {/* Dynamic Sketched Clouds */}
        <motion.div 
          animate={{ x: ['-20%', '120%'] }}
          transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
          className="absolute top-12 left-0 text-7xl font-sans"
        >
          ☁️
        </motion.div>
        <motion.div 
          animate={{ x: ['120%', '-20%'] }}
          transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
          className="absolute top-[40%] right-0 text-8xl"
        >
          ☁️
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Top Header - Neubrutalist Wooden Board */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 space-y-6 md:space-y-0">
          <div className="bg-[#fffdf9] border-[6px] border-[#2b221a] p-6 rounded-[2rem] shadow-[0_8px_0_#2b221a] -rotate-1 w-full md:w-auto relative overflow-hidden">
            {/* Coffee stain on header */}
            <div className="absolute -top-6 -right-6 w-16 h-16 border-2 border-amber-800 border-opacity-10 rounded-full"></div>
            
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-1 uppercase tracking-tight flex items-center gap-2">
              <Compass className="text-[#d97706] w-8 h-8 animate-spin [animation-duration:15s]" strokeWidth={3} />
              สมุดเจรจาพเนจร (Explorer's Journal)
            </h1>
            <p className="text-gray-500 font-bold text-xs md:text-sm uppercase tracking-wide">
              บันทึกเส้นทางการเจรจาลับและวิเคราะห์คู่ต่อสู้ เพื่อการเจรจาระดับอัจฉริยะ!
            </p>
          </div>
          
          <Link 
            href="/profile"
            prefetch={false}
            className="flex items-center space-x-4 bg-[#fffdf9] border-[4px] border-[#2b221a] px-6 py-2.5 rounded-[2rem] hover:translate-y-1 transition-all shadow-[0_6px_0_#2b221a] active:shadow-none active:translate-y-2 group self-end md:self-auto"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-400 border-4 border-[#2b221a] flex items-center justify-center text-gray-900">
              <User className="w-5 h-5" strokeWidth={3} />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-black uppercase mb-0.5">นักเดินสาร</p>
              <p className="text-base text-gray-900 font-black uppercase tracking-tight leading-tight">
                {user?.name || user?.email?.split('@')[0]}
              </p>
            </div>
          </Link>
        </header>

        {/* Warning Toast Alerts */}
        <AnimatePresence>
          {showLockedAlert && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-rose-50 border-[5px] border-[#2b221a] text-rose-700 px-6 py-4 rounded-2xl font-black text-center shadow-[0_6px_0_#2b221a] mb-8 flex items-center justify-center gap-3 relative z-30 rotate-1"
            >
              <ShieldAlert size={22} className="animate-bounce" />
              <span>{showLockedAlert}</span>
              <button 
                onClick={() => setShowLockedAlert(null)} 
                className="absolute right-4 text-rose-700 hover:text-rose-950 text-xl font-black"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode Selector - Controller Deck */}
        <div className="flex justify-center mb-12">
          <div className="bg-[#382619] border-[5px] border-[#1d120a] rounded-[2rem] p-2.5 flex shadow-[0_10px_0_#1d120a] relative">
            <div className="absolute -top-3.5 left-8 px-3 bg-[#e60012] text-white text-[9px] font-black border-2 border-black rounded uppercase tracking-wider">
              JOURNAL TABS
            </div>
            <button
              onClick={() => {
                setActiveTab('campaign');
                setShowLockedAlert(null);
              }}
              className={`flex items-center px-6 md:px-8 py-3 rounded-xl font-black uppercase tracking-tight text-xs md:text-sm transition-all ${
                activeTab === 'campaign' 
                  ? 'bg-amber-400 text-gray-900 shadow-[0_5px_0_#2b221a] -translate-y-0.5' 
                  : 'text-amber-100/60 hover:text-amber-50 hover:bg-[#4a3424]'
              }`}
            >
              <span className="mr-1.5 text-lg">🗺️</span> แผนที่หลัก (CAMPAIGN JOURNAL)
            </button>
            <button
              onClick={() => {
                setActiveTab('freeplay');
                setShowLockedAlert(null);
              }}
              className={`flex items-center px-6 md:px-8 py-3 rounded-xl font-black uppercase tracking-tight text-xs md:text-sm transition-all ${
                activeTab === 'freeplay' 
                  ? 'bg-amber-400 text-gray-900 shadow-[0_5px_0_#2b221a] -translate-y-0.5' 
                  : 'text-amber-100/60 hover:text-amber-50 hover:bg-[#4a3424]'
              }`}
            >
              <span className="mr-1.5 text-lg">👾</span> ตู้ประลองเสรี (FREEPLAY ARCADES)
            </button>
          </div>
        </div>

        {/* CAMPAIGN MAP OVERHAUL: TRAVELER'S OPEN NOTEBOOK */}
        {activeTab === 'campaign' ? (
          <div className="relative w-full bg-[#f6ead9] border-[8px] border-[#2b221a] rounded-[3rem] shadow-[0_20px_0_rgba(0,0,0,0.5)] p-4 sm:p-10 mb-12 min-h-[750px]">
            
            {/* Realistic Spiral Wire Binder (For Desktop Screens) */}
            <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 w-16 -translate-x-1/2 flex-col justify-around py-10 pointer-events-none z-30">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="relative w-full h-8 flex items-center justify-center">
                  {/* Left Punched Hole */}
                  <div className="absolute left-1.5 w-4 h-4 bg-[#2b221a] rounded-full shadow-[inset_0_4px_6px_rgba(0,0,0,1)] border-[0.5px] border-[#4a3a2c]/30"></div>
                  
                  {/* Right Punched Hole */}
                  <div className="absolute right-1.5 w-4 h-4 bg-[#2b221a] rounded-full shadow-[inset_0_4px_6px_rgba(0,0,0,1)] border-[0.5px] border-[#4a3a2c]/30"></div>
                  
                  {/* Metallic Wire Coil */}
                  <div className="absolute w-[44px] h-3 bg-gradient-to-b from-gray-400 via-white to-gray-500 border border-gray-800 rounded-full shadow-[0_5px_5px_rgba(0,0,0,0.5)] rotate-[-12deg]"></div>
                </div>
              ))}
            </div>

            {/* Split Page Layout: Left Page is Sketch Map, Right Page is Dossier Briefing */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 relative z-10">
              
              {/* LEFT PAGE: ORGANIC SKETCHED BRANCHING QUEST MAP */}
              <div className="bg-[#fcfaf4] border-[4px] border-[#382b21] rounded-[2rem] p-6 shadow-[0_8px_16px_rgba(0,0,0,0.05)] relative overflow-hidden -rotate-1 min-h-[600px] flex flex-col justify-center">
                
                {/* Vintage Coffee Ring Stains */}
                <div className="absolute top-12 left-10 w-24 h-24 border-[3px] border-amber-800 border-opacity-[0.05] rounded-full pointer-events-none"></div>
                <div className="absolute bottom-16 right-12 w-16 h-16 border-[2px] border-amber-800 border-opacity-[0.04] rounded-full pointer-events-none"></div>
                
                {/* Hand-drawn ink header */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center pointer-events-none select-none">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                    PAGE 04 // BRANCHING quest TREE
                  </span>
                  <span className="text-xl rotate-12">🧭</span>
                </div>

                <div className="relative w-full h-[520px] mt-8 overflow-y-auto overflow-x-hidden border-y-2 border-dashed border-[#2b221a]/20 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-amber-800/30 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent" id="campaign-map-container">
                  <div className="relative w-full" style={{ height: `${Math.max(520, campaignScenarios.length * 160 + 100)}px` }}>
                    
                    {/* Dynamic Curvy Ink Connections (SVG Drawing Branching Paths) */}
                    {campaignScenarios.length > 0 && (
                      <svg viewBox={`0 0 1000 ${Math.max(520, campaignScenarios.length * 160 + 100)}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-0">
                        {campaignScenarios.map((_, i) => {
                          if (i === 0) return null;
                          const currTop = 80 + i * 160;
                          const prevTop = 80 + (i - 1) * 160;
                          
                          const currLeft = i % 2 === 1 ? "28%" : "72%";
                          const prevLeft = (i - 1) === 0 ? "50%" : ((i - 1) % 2 === 1 ? "28%" : "72%");
                          
                          const currX = currLeft === "28%" ? 280 : 720;
                          const prevX = prevLeft === "50%" ? 500 : prevLeft === "28%" ? 280 : 720;

                          return (
                            <g key={`path-${i}`}>
                              <path
                                d={`M ${prevX} ${prevTop} C ${prevX} ${prevTop + 80}, ${currX} ${currTop - 80}, ${currX} ${currTop}`}
                                fill="transparent"
                                stroke="#2b221a"
                                strokeWidth="10"
                                strokeLinecap="round"
                                className="opacity-20"
                              />
                              <path
                                d={`M ${prevX} ${prevTop} C ${prevX} ${prevTop + 80}, ${currX} ${currTop - 80}, ${currX} ${currTop}`}
                                fill="transparent"
                                stroke="#b45309"
                                strokeWidth="4"
                                strokeDasharray="10, 10"
                                strokeLinecap="round"
                              />
                            </g>
                          );
                        })}
                      </svg>
                    )}

                    {/* Level Nodes */}
                    {campaignScenarios.map((scenario, index) => {
                      const { isCleared, isUnlocked, stars, maxScore } = getScenarioStatus(scenario, index);
                      const isBoss = scenario.difficulty === 3;
                      const landmark = getLandmarkInfo(scenario.difficulty || 1, index);
                      
                      const top = `${80 + index * 160}px`;
                      const left = index === 0 ? "50%" : (index % 2 === 1 ? "28%" : "72%");

                      return (
                        <div 
                          key={scenario.id} 
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                          style={{ left, top }}
                        >
                          {/* Node Label Flags */}
                          <div className="absolute -bottom-14 w-28 text-center pointer-events-none select-none">
                            <div className="bg-[#fffdfa] border-2 border-[#2b221a] px-2 py-0.5 rounded shadow-[0_2px_0_#2b221a] text-[10px] font-black truncate rotate-1">
                              {landmark.landmarkName}
                            </div>
                          </div>

                          {/* Interactive Node Wrapper */}
                          <motion.div
                            animate={shakingNodeId === scenario.id ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
                            transition={{ duration: 0.4 }}
                            className="relative"
                          >
                            {/* Stars Banner (Gold stars stamped on paper) */}
                            <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 flex space-x-0.5 bg-gray-900/90 border border-black px-1.5 py-0.5 rounded-full shadow-[0_1.5px_0_#000] z-20">
                              {[1, 2, 3].map((s) => (
                                <Star 
                                  key={s} 
                                  size={9} 
                                  className={s <= stars ? "text-amber-400 fill-amber-400 animate-pulse" : "text-gray-600"} 
                                  strokeWidth={2.5}
                                />
                              ))}
                            </div>

                            {/* Node Stamp Button (Wooden Seal stamp aesthetic) */}
                            <button
                              onClick={() => handleNodeClick(scenario, index)}
                              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[5px] border-[#2b221a] flex flex-col items-center justify-center font-black transition-all duration-300 group
                                ${!isUnlocked 
                                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-dashed' 
                                  : isBoss 
                                    ? `${landmark.sealColor} text-white shadow-[0_6px_0_#2b221a] hover:scale-105 active:scale-95 active:shadow-[0_2px_0_#2b221a]` 
                                    : `${landmark.sealColor} text-white shadow-[0_6px_0_#2b221a] hover:scale-105 active:scale-95 active:shadow-[0_2px_0_#2b221a]`
                                }
                              `}
                              style={{ 
                                borderRadius: isUnlocked 
                                  ? '45% 55% 48% 52% / 52% 48% 55% 45%' // Hand-pressed organic shape for unlocked seals
                                  : '50%'
                              }}
                            >
                              {/* Glow ring for uncleared active level */}
                              {isUnlocked && !isCleared && (
                                <div className="absolute -inset-1.5 rounded-full border-[3px] border-dashed border-amber-400 animate-spin [animation-duration:10s] pointer-events-none"></div>
                              )}

                              {!isUnlocked ? (
                                <Lock size={22} className="text-gray-400" strokeWidth={3} />
                              ) : (
                                <div className="flex flex-col items-center leading-none">
                                  <span className="text-3xl font-black drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">
                                    {index + 1}
                                  </span>
                                  <span className="text-[7px] uppercase font-black tracking-widest opacity-80 mt-0.5">
                                    {index === 0 ? "START" : isBoss ? "BOSS LEVEL" : `STAGE ${index + 1}`}
                                  </span>
                                </div>
                              )}

                            {/* Stamped Cleared mark */}
                            {isCleared && (
                              <div className="absolute -bottom-1 -right-1 bg-emerald-600 border-2 border-black rounded-full p-0.5 text-white shadow-[0_1.5px_0_#000] rotate-12">
                                <span className="text-[8px] font-black leading-none px-1">PASSED</span>
                              </div>
                            )}
                          </button>
                        </motion.div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>

              {/* RIGHT PAGE: BRIEF DOSSIER OVERLAY (EXPLORER BRIEFING SHEET) */}
              <div className="bg-[#fcfaf4] border-[4px] border-[#382b21] rounded-[2rem] p-6 shadow-[0_8px_16px_rgba(0,0,0,0.05)] relative overflow-hidden rotate-1 min-h-[600px] flex flex-col justify-between">
                
                {/* Paper notebook binding detail */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-center pointer-events-none select-none">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">
                    SECTION // DOSSIER BRIEFING
                  </span>
                  <span className="text-xl">📜</span>
                </div>

                <AnimatePresence mode="wait">
                  {selectedScenario ? (
                    <motion.div
                      key={selectedScenario.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex-1 flex flex-col justify-between mt-8 h-full relative"
                    >
                      {(() => {
                        const selectedIndex = campaignScenarios.findIndex(s => s.id === selectedScenario.id);
                        const displayIndex = selectedIndex >= 0 ? selectedIndex : 0;
                        const activeLandmark = getLandmarkInfo(selectedScenario.difficulty || 1, displayIndex);
                        return (
                          <>
                            {/* Green Masking Tape sticker at top */}
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#cedf9f]/90 border-2 border-black/30 px-6 py-1 rounded text-[10px] font-black uppercase tracking-wider rotate-[-2deg] shadow-sm pointer-events-none select-none z-20">
                              📁 ACTIVE CASE Brief
                            </div>

                      <div className="space-y-6 pt-2">
                        {/* Title of Level */}
                        <div>
                          <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                            {selectedScenario.title}
                          </h2>
                          <div className="flex gap-2 mt-2">
                            <span className="bg-[#f59e0b]/10 text-[#d97706] border border-[#d97706]/40 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                              ระดับความยาก: {selectedScenario.difficulty === 3 ? "ยากระดับบอส" : selectedScenario.difficulty === 2 ? "ระดับกลาง" : "เริ่มต้น"}
                            </span>
                            <span className="bg-sky-50 text-sky-700 border border-sky-300/40 px-2 py-0.5 rounded text-[10px] font-black uppercase">
                              กลุ่ม: {selectedScenario.target_group}
                            </span>
                          </div>
                        </div>

                        {/* Briefing text (Torn paper element) */}
                        <div className="bg-[#fdfcf7] border-2 border-[#2b221a] p-4 rounded-xl shadow-inner relative">
                          {/* Sketchy binder corner design */}
                          <div className="absolute top-0 right-0 w-4 h-4 border-b-2 border-l-2 border-[#2b221a] opacity-40"></div>
                          
                          <p className="text-gray-700 font-bold text-xs sm:text-sm leading-relaxed">
                            {selectedScenario.description}
                          </p>
                        </div>

                        {/* Polaroid Snapshot of Opponent with Paperclip detail */}
                        <div>
                          <h3 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-1">
                            <span>👤</span> คู่เจรจาประจำภารกิจ (Character Dossier)
                          </h3>
                          
                          <div className="relative flex bg-[#fff] border-2 border-[#2b221a] p-3 rounded-xl shadow-[0_4px_8px_rgba(0,0,0,0.06)] rotate-1 group">
                            {/* Steel Paper Clip holding the Polaroid */}
                            <div className="absolute -top-3.5 left-6 w-[18px] h-11 bg-gradient-to-b from-gray-300 via-gray-100 to-gray-500 border-2 border-black rounded-full z-20 rotate-[-10deg]"></div>
                            
                            <div className="w-14 h-14 bg-gray-100 border-2 border-gray-300 rounded-lg flex items-center justify-center text-4xl mr-4 pointer-events-none select-none">
                              {activeLandmark.avatar}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              {selectedScenario.characters?.map((c: any, i: number) => (
                                <div key={i} className="mb-1.5 last:mb-0">
                                  <h4 className="font-black text-xs text-gray-900 truncate">
                                    {c.name}
                                  </h4>
                                  <p className="text-gray-500 font-bold text-[9px] leading-tight line-clamp-1">
                                    <strong className="text-gray-700">บทบาท:</strong> {c.role} | 
                                    <strong className="text-gray-700"> ท่าที:</strong> {c.personality}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Phase Outline Checklist */}
                        <div>
                          <h3 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-1">
                            <span>📋</span> ลำดับขั้นตอนการคุย (Target Phases)
                          </h3>
                          <div className="grid grid-cols-2 gap-2 bg-[#fdfcf7] p-3 rounded-xl border-2 border-dashed border-[#2b221a]/30">
                            {selectedScenario.phase_rules?.phases?.map((p: string, i: number) => (
                              <div key={p} className="flex items-center gap-1.5">
                                <CheckSquare size={13} className="text-[#059669]" strokeWidth={3} />
                                <span className="text-[10px] font-black text-gray-700 uppercase">
                                  {p === 'opening' || p === 'rapport' ? ' R-1 // ทักทายสมานฉันท์' :
                                   p === 'conflict' || p === 'listening' ? ' R-2 // รับมือประเด็นร้อน' :
                                   p === 'negotiation' || p === 'bargaining' ? ' R-3 // แลกเปลี่ยนยื่นคำขอ' : ' R-4 // ปิดจ๊อบสำเร็จ'}
                                </span>
                              </div>
                            )) || <span className="text-[10px] text-gray-400 font-bold">คุยสดโดยไม่แบ่งเฟส</span>}
                          </div>
                        </div>

                        {/* Yellow Masking Tape: Rewards */}
                        <div className="bg-amber-300 border-2 border-black rounded-lg px-4 py-2 rotate-[-1deg] shadow-sm relative">
                          <div className="absolute top-0 right-3 text-xs">🎁</div>
                          <h4 className="text-[10px] font-black text-amber-950 uppercase tracking-widest leading-none mb-1">
                            ของรางวัลผู้สำเร็จคดี (REWARDS BRIEF)
                          </h4>
                          <p className="text-[10px] text-amber-900 font-black leading-tight">
                            • {activeLandmark.reward} <br />
                            • คะแนนทักษะเจรจาสากลสำหรับปลดล็อกยศถัดไป
                          </p>
                        </div>
                      </div>

                      {/* Validation Stamp Button (STAMP & START) */}
                      <button 
                        onClick={() => {
                          const id = selectedScenario.id;
                          setSelectedScenario(null);
                          startSession(id);
                        }}
                        className="w-full mt-6 bg-[#b45309] text-white py-3.5 rounded-xl border-[4px] border-[#2b221a] font-black text-lg sm:text-xl uppercase tracking-wider shadow-[0_5px_0_#2b221a] hover:translate-y-0.5 hover:shadow-[0_3px_0_#2b221a] active:translate-y-1.5 active:shadow-none transition-all flex items-center justify-center gap-2 group"
                      >
                        <span>ปั๊มตราและประทับลุย ✉️</span> 
                      </button>
                          </>
                        );
                      })()}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="no-dossier"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 flex flex-col justify-center items-center text-center p-6 h-full mt-8"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#f3ebd3] border-2 border-[#2b221a] flex items-center justify-center text-3xl mb-4 animate-bounce">
                        ✒️
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">วิเคราะห์แผนการรบ!</h3>
                      <p className="text-gray-500 font-bold text-xs sm:text-sm leading-relaxed max-w-[28ch]">
                        โปรดปักหมุดเลือกด่าน wax seal บนหน้ากระดาษฝั่งซ้าย เพื่อดึงข้อมูลแฟ้มลับ อัตราผลตอบแทน และข้อมูลคู่ต่อสู้ออกมากางวิเคราะห์!
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

            </div>

          </div>
        ) : (
          
          /* FREEPLAY ARCADE CARDS (LOOSE POLAROID & MEMO Grid) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
            {freeplayScenarios.map((scenario, index) => {
              const landmark = getLandmarkInfo(scenario.difficulty || 1, index);
              
              return (
                <motion.div 
                  key={scenario.id}
                  whileHover={{ rotate: 1.5, y: -4 }}
                  className="bg-white border-[5px] border-[#2b221a] p-4 rounded-3xl shadow-[0_8px_0_#2b221a] hover:shadow-[0_12px_0_#2b221a] transition-all cursor-pointer flex flex-col relative overflow-hidden"
                  onClick={() => startSession(scenario.id)}
                >
                  {/* Sticky Tape at top */}
                  <div className="absolute top-0.5 left-1/3 right-1/3 h-5 bg-amber-200/60 border-x-2 border-b-2 border-black/30 rounded-b-md shadow-inner pointer-events-none z-10"></div>

                  <div className="flex-1 flex flex-col justify-between pt-4">
                    {/* Upper content */}
                    <div>
                      {/* Badge header */}
                      <div className="flex justify-between items-center mb-4">
                        <span className="bg-[#baebd6] border-2 border-[#2b221a] text-[#047857] px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                          {scenario.target_group?.toUpperCase() || 'GENERAL'}
                        </span>
                        <span className="text-lg">👾</span>
                      </div>

                      {/* Polaroid sketch image */}
                      <div className="bg-[#fbf9f4] border-2 border-[#2b221a] rounded-2xl p-3 mb-4 shadow-inner text-center font-black relative overflow-hidden">
                        <div className="text-4xl filter drop-shadow-[0_2px_0_#000]">{landmark.avatar}</div>
                        <div className="text-[8px] text-gray-400 font-mono mt-1">OPPONENT CAPTURE // 01</div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-black text-gray-900 leading-tight mb-2">
                        {scenario.title}
                      </h3>
                      {/* Description */}
                      <p className="text-gray-500 font-bold text-xs leading-relaxed line-clamp-3">
                        {scenario.description}
                      </p>
                    </div>

                    {/* Dashboard bottom button */}
                    <div className="mt-6 pt-3 border-t-2 border-dashed border-[#2b221a]/20 flex justify-between items-center">
                      <div className="flex -space-x-2.5">
                        {scenario.characters?.map((char: any, i: number) => (
                          <div 
                            key={i} 
                            className="w-7 h-7 rounded-lg bg-[#fffdf8] border-2 border-black flex items-center justify-center text-[10px] font-black text-gray-900 rotate-6"
                          >
                            {char.name?.charAt(0) || '?'}
                          </div>
                        ))}
                      </div>

                      <span className="bg-[#b45309] text-white border-2 border-black rounded-lg px-2.5 py-1 text-[10px] font-black uppercase flex items-center gap-1 group-hover:bg-[#d97706] transition-colors">
                        เริ่มประลอง <Play size={10} className="fill-current" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Error message block */}
        {error && (
          <div className="col-span-full py-12 text-center bg-rose-50 border-[6px] border-[#2b221a] rounded-[3rem] max-w-3xl mx-auto shadow-[0_10px_0_#2b221a] p-8 mb-8 rotate-1">
            <ShieldAlert size={56} className="mx-auto text-rose-700 mb-4 animate-bounce" />
            <h3 className="text-2xl font-black mb-2 text-rose-950">เกิดข้อผิดพลาดในการดึงข้อมูล</h3>
            <p className="text-rose-700 font-bold mb-6 text-sm">
              {error}
            </p>
            <button 
              onClick={fetchAllData}
              className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-black px-6 py-3.5 rounded-xl border-[4px] border-[#2b221a] shadow-[0_6px_0_#2b221a] active:shadow-none active:translate-y-1.5 active:translate-x-0.5 transition-all text-lg"
            >
              ลองโหลดข้อมูลใหม่อีกครั้ง 🔄
            </button>
          </div>
        )}

        {/* If no scenarios match tab */}
        {((activeTab === 'campaign' && campaignScenarios.length === 0) || 
          (activeTab === 'freeplay' && freeplayScenarios.length === 0)) && !loading && !error && (
          <div className="col-span-full py-16 text-center bg-white border-[6px] border-[#2b221a] rounded-[3rem] max-w-3xl mx-auto shadow-[0_10px_0_#2b221a] p-8">
            <HelpCircle size={56} className="mx-auto text-[#b45309] mb-4 animate-bounce" />
            <h3 className="text-2xl font-black mb-2 text-gray-900">สมุดเดินสารว่างเปล่า</h3>
            <p className="text-gray-500 font-bold mb-6 text-sm">
              ยังไม่มีแผ่นกระดาษด่านทดสอบความสามารถลงบันทึกในบทนี้
            </p>
            <button 
              onClick={seedScenarios}
              className="bg-[#b45309] hover:bg-[#d97706] text-white font-black px-6 py-3.5 rounded-xl border-[4px] border-[#2b221a] shadow-[0_6px_0_#2b221a] active:shadow-none active:translate-y-1.5 active:translate-x-0.5 transition-all text-lg"
            >
              เขียนบันทึกด่านทดสอบตัวอย่างทันที!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
