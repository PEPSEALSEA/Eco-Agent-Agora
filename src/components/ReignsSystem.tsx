'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Strategy } from './StrategyBlocks';
import { Heart, Handshake, ShieldAlert, Lightbulb, ChevronLeft, ChevronRight, MessageSquare, Sparkles } from 'lucide-react';

type ReignsSystemProps = {
  onSelect: (strategy: Strategy) => void;
  dynamicDecisions?: {
    left: any;
    right: any;
  } | null;
  disabled?: boolean;
};

const TYPE_MAP: Record<string, { icon: React.ReactNode, color: string, shadow: string }> = {
  empathy: { icon: <Heart size={24} />, color: 'bg-nintendo-red', shadow: 'chunky-shadow-red' },
  logic: { icon: <Lightbulb size={24} />, color: 'bg-nintendo-blue', shadow: 'chunky-shadow-blue' },
  trade: { icon: <Handshake size={24} />, color: 'bg-nintendo-green', shadow: 'chunky-shadow-green' },
  boundary: { icon: <ShieldAlert size={24} />, color: 'bg-nintendo-yellow', shadow: 'chunky-shadow-yellow' },
  ask: { icon: <MessageSquare size={24} />, color: 'bg-purple-500', shadow: 'chunky-shadow-purple' },
  apology: { icon: <Heart size={24} />, color: 'bg-pink-500', shadow: 'chunky-shadow-pink' },
  default: { icon: <Sparkles size={24} />, color: 'bg-gray-800', shadow: 'chunky-shadow-gray' }
};

const DEFAULT_DECISIONS = {
  left: {
      id: 'empathize_feelings',
      label: 'Empathize Feelings',
      thaiLabel: 'เข้าใจความรู้สึก',
      type: 'empathy',
      description: 'ฉันเข้าใจความรู้สึกของเธอ'
    },
    right: {
      id: 'suggest_solution',
      label: 'Suggest Solution',
      thaiLabel: 'เสนอทางออก',
      type: 'logic',
      description: 'เรามาหาทางออกด้วยกันไหม'
    }
};

export const ReignsSystem = ({ onSelect, dynamicDecisions, disabled }: ReignsSystemProps) => {
  const currentDecision = dynamicDecisions || DEFAULT_DECISIONS;
  // We use a counter just to force AnimatePresence re-render when decisions change
  const [version, setVersion] = useState(0);

  // Sync version with dynamicDecisions changes
  React.useEffect(() => {
    setVersion(v => v + 1);
  }, [dynamicDecisions]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  const leftOpacity = useTransform(x, [-150, -50], [1, 0]);
  const rightOpacity = useTransform(x, [50, 150], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    if (disabled) return;

    if (info.offset.x < -100) {
      const leftChoice = currentDecision.left;
      const visual = TYPE_MAP[leftChoice.type] || TYPE_MAP.default;
      onSelect({ ...leftChoice, ...visual } as Strategy);
    } else if (info.offset.x > 100) {
      const rightChoice = currentDecision.right;
      const visual = TYPE_MAP[rightChoice.type] || TYPE_MAP.default;
      onSelect({ ...rightChoice, ...visual } as Strategy);
    }
  };

  return (
    <div className="relative w-full max-w-sm aspect-[3/4] flex items-center justify-center pointer-events-auto">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={version}
          style={{ x, rotate, opacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.05 }}
          className={`w-full h-full bg-white rounded-[3rem] border-8 border-gray-900 shadow-[0_20px_0_rgba(0,0,0,1)] flex flex-col items-center justify-center p-8 cursor-grab active:cursor-grabbing relative overflow-hidden`}
        >
          {/* Nintendo Style Design Elements */}
          <div className="absolute top-0 left-0 w-full h-4 bg-nintendo-red" />
          <div className="absolute bottom-0 left-0 w-full h-4 bg-nintendo-blue" />
          
          {/* Card Content */}
          <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-gray-900 flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
             <div className="text-gray-900 animate-bounce-subtle">
                <Sparkles size={48} className="text-nintendo-yellow" fill="currentColor" />
             </div>
          </div>
          
          <h3 className="text-3xl font-black text-gray-900 text-center uppercase tracking-tighter leading-none mb-4">
            เลือกท่าทาง<br/>ของคุณ!
          </h3>
          
          <p className="text-gray-500 font-bold text-center text-sm">
            ปัดซ้ายหรือขวาเพื่อตัดสินใจ
          </p>

          {/* Swipe Indicators */}
          <motion.div 
            style={{ opacity: leftOpacity }}
            className={`absolute left-4 top-1/2 -translate-y-1/2 ${(TYPE_MAP[currentDecision.left.type] || TYPE_MAP.default).color} text-white p-4 rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,0.3)] flex flex-col items-center min-w-[120px]`}
          >
            <div className="mb-2">{(TYPE_MAP[currentDecision.left.type] || TYPE_MAP.default).icon}</div>
            <span className="font-black text-lg whitespace-nowrap">{currentDecision.left.thaiLabel}</span>
          </motion.div>

          <motion.div 
            style={{ opacity: rightOpacity }}
            className={`absolute right-4 top-1/2 -translate-y-1/2 ${(TYPE_MAP[currentDecision.right.type] || TYPE_MAP.default).color} text-white p-4 rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,0.3)] flex flex-col items-center min-w-[120px]`}
          >
             <div className="mb-2">{(TYPE_MAP[currentDecision.right.type] || TYPE_MAP.default).icon}</div>
             <span className="font-black text-lg whitespace-nowrap">{currentDecision.right.thaiLabel}</span>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Background visual cues */}
      <div className="absolute -left-12 top-1/2 -translate-y-1/2 text-nintendo-red/20 pointer-events-none">
        <ChevronLeft size={100} strokeWidth={4} />
      </div>
      <div className="absolute -right-12 top-1/2 -translate-y-1/2 text-nintendo-blue/20 pointer-events-none">
        <ChevronRight size={100} strokeWidth={4} />
      </div>
    </div>
  );
};
