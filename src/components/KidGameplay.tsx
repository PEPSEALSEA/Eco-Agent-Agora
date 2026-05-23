'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Handshake, Lightbulb, MessageCircle, Sparkles, Smile, Frown, Zap } from 'lucide-react';
import { Strategy } from './StrategyBlocks';

type KidGameplayProps = {
  onSelect: (strategy: Strategy, audioResult?: any) => void;
  dynamicDecisions?: {
    left: any;
    right: any;
    center?: any;
  } | null;
  disabled?: boolean;
};

const KID_TYPE_MAP: Record<string, { icon: React.ReactNode, color: string, glow: string, label: string }> = {
  empathy: { icon: <Heart size={32} />, color: 'bg-nintendo-red', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.5)]', label: 'เห็นอกเห็นใจ' },
  logic: { icon: <Lightbulb size={32} />, color: 'bg-nintendo-blue', glow: 'shadow-[0_0_30px_rgba(59,130,246,0.5)]', label: 'ใช้เหตุผล' },
  trade: { icon: <Handshake size={32} />, color: 'bg-nintendo-green', glow: 'shadow-[0_0_30px_rgba(34,197,94,0.5)]', label: 'ยื่นข้อเสนอ' },
  ask: { icon: <MessageCircle size={32} />, color: 'bg-purple-500', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.5)]', label: 'ลองถามดู' },
  apology: { icon: <Heart size={32} />, color: 'bg-pink-500', glow: 'shadow-[0_0_30px_rgba(236,72,153,0.5)]', label: 'ขอโทษนะ' },
  default: { icon: <Sparkles size={32} />, color: 'bg-nintendo-yellow', glow: 'shadow-[0_0_30px_rgba(248,204,0,0.5)]', label: 'พิเศษ!' }
};

const VIBES = [
  { id: 'Happy', icon: <Smile size={20} />, label: 'ร่าเริง', color: 'bg-yellow-400' },
  { id: 'Calm', icon: <Zap size={20} className="rotate-90" />, label: 'ใจเย็น', color: 'bg-blue-400' },
  { id: 'Serious', icon: <Frown size={20} />, label: 'จริงจัง', color: 'bg-red-400' },
];

export const KidGameplay = ({ onSelect, dynamicDecisions, disabled }: KidGameplayProps) => {
  const [selectedVibe, setSelectedVibe] = useState('Happy');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const decisions = dynamicDecisions ? [
    { ...dynamicDecisions.left, pos: 'left' },
    { ...dynamicDecisions.right, pos: 'right' },
    ...(dynamicDecisions.center ? [{ ...dynamicDecisions.center, pos: 'center' }] : [])
  ] : [
    { id: 'empathize', thaiLabel: 'เข้าใจเธอนะ', type: 'empathy', pos: 'left' },
    { id: 'ask', thaiLabel: 'ทำไมล่ะ?', type: 'ask', pos: 'center' },
    { id: 'suggest', thaiLabel: 'ลองแบบนี้ไหม', type: 'logic', pos: 'right' }
  ];

  const handlePick = (decision: any) => {
    if (disabled) return;
    const visual = KID_TYPE_MAP[decision.type] || KID_TYPE_MAP.default;
    
    // Pass vibe as part of the meta info
    onSelect(
      { ...decision, ...visual } as Strategy, 
      { vibe: selectedVibe, intensity: 0.7, text: decision.thaiLabel }
    );
  };

  return (
    <div className="w-full max-w-2xl flex flex-col items-center pointer-events-auto">
      
      {/* Vibe Selector (Mood Aura) */}
      <div className="mb-10 flex flex-wrap justify-center gap-2 sm:gap-3 bg-white p-2 sm:p-2.5 rounded-full border-[3px] border-gray-900 shadow-[0_6px_0_#2b221a]">
        {VIBES.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVibe(v.id)}
            disabled={disabled}
            className={`flex items-center px-5 sm:px-6 py-2 rounded-full font-black text-sm uppercase transition-all border-2 border-gray-900
              ${selectedVibe === v.id 
                ? `${v.color} text-gray-900 translate-y-0.5 shadow-none` 
                : 'bg-kids-cream text-gray-900 hover:bg-kids-cream-deep shadow-[0_3px_0_#2b221a]'
              }
            `}
          >
            <span className="mr-2">{v.icon}</span>
            {v.label}
          </button>
        ))}
      </div>

      {/* Card Deck Area — flex fan with controlled overlap */}
      <div className="relative w-full max-w-3xl mx-auto isolate min-h-[17.5rem] sm:min-h-[18.5rem] py-4 px-2 sm:px-4">
        <div className="flex items-end justify-center w-full">
          <AnimatePresence>
            {decisions.map((d, i) => {
              const visual = KID_TYPE_MAP[d.type] || KID_TYPE_MAP.default;
              const isHovered = hoveredCard === d.id;

              const count = decisions.length;
              const mid = (count - 1) / 2;
              const offsetFromCenter = i - mid;
              const rot = offsetFromCenter * 7;
              const lift = Math.abs(offsetFromCenter) * 6;
              const stackZ = 10 + i;

              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 80, rotate: 0 }}
                  animate={{
                    opacity: 1,
                    y: isHovered ? -28 : lift,
                    rotate: isHovered ? 0 : rot,
                    scale: isHovered ? 1.06 : 1,
                    zIndex: isHovered ? 30 : stackZ,
                  }}
                  exit={{ opacity: 0, scale: 0.5, y: -120 }}
                  onHoverStart={() => setHoveredCard(d.id)}
                  onHoverEnd={() => setHoveredCard(null)}
                  onClick={() => handlePick(d)}
                  style={{ marginLeft: i === 0 ? 0 : '-2.25rem' }}
                  className={`relative flex-shrink-0 w-[9.25rem] sm:w-40 h-60 sm:h-64 rounded-[2.5rem] border-8 border-gray-900 cursor-pointer overflow-hidden flex flex-col items-center justify-between p-4 sm:p-6 shadow-[0_15px_0_rgba(0,0,0,1)] transition-colors
                    ${isHovered ? visual.color : 'bg-white'}
                  `}
                >
                {/* Nintendo Stripe */}
                <div className={`absolute top-0 left-0 w-full h-3 ${isHovered ? 'bg-white/30' : visual.color}`} />
                
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border-4 border-gray-900 shadow-[0_6px_0_rgba(0,0,0,1)]
                  ${isHovered ? 'bg-white text-gray-900' : `${visual.color} text-white`}
                `}>
                  {visual.icon}
                </div>

                <div className="flex-1 flex items-center justify-center mt-2 min-h-0 px-1">
                  <p className={`font-black text-sm sm:text-base text-center leading-snug line-clamp-3
                    ${isHovered ? 'text-white' : 'text-gray-900'}
                  `}>
                    {d.thaiLabel}
                  </p>
                </div>

                <div className={`w-full py-2 rounded-xl font-black text-[10px] text-center border-2 border-gray-900
                  ${isHovered ? 'bg-black/20 text-white' : 'bg-gray-100 text-gray-400'}
                `}>
                  {visual.label}
                </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Guide Text */}
      <motion.p 
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mt-6 text-gray-700 font-black text-sm sm:text-base uppercase tracking-widest"
      >
        เลือกคำพูดที่คุณต้องการส่ง!
      </motion.p>
    </div>
  );
};
