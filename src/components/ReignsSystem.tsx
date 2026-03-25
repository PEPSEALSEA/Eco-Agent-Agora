'use client';

import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Strategy } from './StrategyBlocks';
import { Heart, Handshake, ShieldAlert, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';

type ReignsSystemProps = {
  onSelect: (strategy: Strategy) => void;
  disabled?: boolean;
};

const SAMPLE_DECISIONS = [
  {
    left: {
      id: 'empathize_feelings',
      label: 'Empathize Feelings',
      thaiLabel: 'เข้าใจความรู้สึก',
      icon: <Heart size={24} />,
      color: 'bg-nintendo-red',
      shadow: 'chunky-shadow-red',
      description: 'ฉันเข้าใจความรู้สึกของเธอ'
    },
    right: {
      id: 'suggest_solution',
      label: 'Suggest Solution',
      thaiLabel: 'เสนอทางออก',
      icon: <Lightbulb size={24} />,
      color: 'bg-nintendo-blue',
      shadow: 'chunky-shadow-blue',
      description: 'เรามาหาทางออกด้วยกันไหม'
    }
  },
  {
      left: {
        id: 'boundary_space',
        label: 'State Boundary',
        thaiLabel: 'บอกความต้องการ',
        icon: <ShieldAlert size={24} />,
        color: 'bg-nintendo-yellow',
        shadow: 'chunky-shadow-yellow',
        description: 'ฉันต้องการพื้นที่ส่วนตัว'
      },
      right: {
        id: 'trade_deal',
        label: 'Offer Trade',
        thaiLabel: 'ยื่นข้อเสนอใหม่',
        icon: <Handshake size={24} />,
        color: 'bg-nintendo-green',
        shadow: 'chunky-shadow-green',
        description: 'เรามาแลกเปลี่ยนกันดีไหม'
      }
    }
];

export const ReignsSystem = ({ onSelect, disabled }: ReignsSystemProps) => {
  const [decisionIndex, setDecisionIndex] = useState(0);
  const currentDecision = SAMPLE_DECISIONS[decisionIndex];

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  
  const leftOpacity = useTransform(x, [-150, -50], [1, 0]);
  const rightOpacity = useTransform(x, [50, 150], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    if (disabled) return;

    if (info.offset.x < -100) {
      onSelect(currentDecision.left as Strategy);
      // Cycle to next decision for next turn
      setDecisionIndex((prev) => (prev + 1) % SAMPLE_DECISIONS.length);
    } else if (info.offset.x > 100) {
      onSelect(currentDecision.right as Strategy);
      setDecisionIndex((prev) => (prev + 1) % SAMPLE_DECISIONS.length);
    }
  };

  return (
    <div className="relative w-full max-w-sm aspect-[3/4] flex items-center justify-center pointer-events-auto">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={decisionIndex}
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
          <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-gray-900 flex items-center justify-center mb-6 shadow-inner">
             <div className="text-gray-900 animate-bounce">
                <Heart size={48} fill="#e60012" stroke="none" />
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
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-nintendo-red text-white p-4 rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,0.3)] flex flex-col items-center"
          >
            <div className="mb-2">{currentDecision.left.icon}</div>
            <span className="font-black text-lg whitespace-nowrap">{currentDecision.left.thaiLabel}</span>
          </motion.div>

          <motion.div 
            style={{ opacity: rightOpacity }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-nintendo-blue text-white p-4 rounded-2xl border-4 border-gray-900 shadow-[0_8px_0_rgba(0,0,0,0.3)] flex flex-col items-center"
          >
             <div className="mb-2">{currentDecision.right.icon}</div>
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
