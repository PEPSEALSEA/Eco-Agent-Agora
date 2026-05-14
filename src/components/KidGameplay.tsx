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
      <div className="mb-10 flex space-x-4 bg-black/40 p-2 rounded-full border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,1)]">
        {VIBES.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedVibe(v.id)}
            disabled={disabled}
            className={`flex items-center px-6 py-2 rounded-full font-black text-sm uppercase transition-all
              ${selectedVibe === v.id 
                ? `${v.color} text-gray-900 translate-y-1 shadow-none` 
                : 'bg-white/10 text-white hover:bg-white/20 shadow-[0_4px_0_rgba(0,0,0,1)]'
              }
            `}
          >
            <span className="mr-2">{v.icon}</span>
            {v.label}
          </button>
        ))}
      </div>

      {/* Card Deck Area */}
      <div className="relative flex items-center justify-center h-80 w-full perspective-1000">
        <AnimatePresence>
          {decisions.map((d, i) => {
            const visual = KID_TYPE_MAP[d.type] || KID_TYPE_MAP.default;
            const isHovered = hoveredCard === d.id;
            
            // Calculate rotation and position based on index
            const count = decisions.length;
            const mid = (count - 1) / 2;
            const rot = (i - mid) * 15;
            const xOffset = (i - mid) * 120;
            const yOffset = Math.abs(i - mid) * 15;

            return (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, y: 100, rotate: 0 }}
                animate={{ 
                  opacity: 1, 
                  y: isHovered ? -40 : yOffset, 
                  x: xOffset,
                  rotate: isHovered ? 0 : rot,
                  scale: isHovered ? 1.15 : 1,
                  zIndex: isHovered ? 50 : i
                }}
                exit={{ opacity: 0, scale: 0.5, y: -200 }}
                onHoverStart={() => setHoveredCard(d.id)}
                onHoverEnd={() => setHoveredCard(null)}
                onClick={() => handlePick(d)}
                className={`absolute w-44 h-64 rounded-[2.5rem] border-8 border-gray-900 cursor-pointer overflow-hidden flex flex-col items-center justify-between p-6 shadow-[0_15px_0_rgba(0,0,0,1)] transition-colors
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

                <div className="flex-1 flex items-center justify-center mt-4">
                  <p className={`font-black text-xl text-center leading-tight uppercase tracking-tighter
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

      {/* Guide Text */}
      <motion.p 
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="mt-12 text-gray-500 font-black text-lg uppercase tracking-widest"
      >
        เลือกคำพูดที่คุณต้องการส่ง!
      </motion.p>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>
    </div>
  );
};
