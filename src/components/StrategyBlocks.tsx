'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Handshake, ShieldAlert, Lightbulb } from 'lucide-react';

export type Strategy = {
  id: string;
  label: string;
  thaiLabel: string;
  icon: React.ReactNode;
  color: string;
  shadow: string;
  description: string;
};

const STRATEGIES: Strategy[] = [
  {
    id: 'empathize',
    label: 'Empathize',
    thaiLabel: 'เข้าใจเขา',
    icon: <Heart size={36} />,
    color: 'bg-pink-500',
    shadow: 'shadow-pink-500/40',
    description: 'บอกว่าเราเข้าใจความรู้สึกของเขา'
  },
  {
    id: 'trade',
    label: 'Offer Trade',
    thaiLabel: 'ยื่นข้อเสนอ',
    icon: <Handshake size={36} />,
    color: 'bg-amber-500',
    shadow: 'shadow-amber-500/40',
    description: 'เสนอการแลกเปลี่ยนที่ยุติธรรม'
  },
  {
    id: 'boundary',
    label: 'State Boundary',
    thaiLabel: 'บอกความต้องการ',
    icon: <ShieldAlert size={36} />,
    color: 'bg-red-500',
    shadow: 'shadow-red-500/40',
    description: 'บอกสิ่งที่เราต้องการอย่างชัดเจน'
  },
  {
    id: 'suggest',
    label: 'Suggest Idea',
    thaiLabel: 'เสนอไอเดีย',
    icon: <Lightbulb size={36} />,
    color: 'bg-cyan-500',
    shadow: 'shadow-cyan-500/40',
    description: 'เสนอวิธีแก้ปัญหาใหม่ๆ'
  }
];

type StrategyBlocksProps = {
  onSelect: (strategy: Strategy) => void;
  disabled?: boolean;
  isKidMode?: boolean;
};

export const StrategyBlocks = ({ onSelect, disabled, isKidMode }: StrategyBlocksProps) => {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 w-full max-w-3xl mx-auto px-2 ${isKidMode ? 'mt-4' : ''}`}>
      {STRATEGIES.map((strategy, index) => {
        
        // --- Kid Mode Styling ---
        if (isKidMode) {
          return (
            <motion.button
              key={strategy.id}
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                delay: index * 0.1, 
                type: 'spring', 
                stiffness: 300, 
                damping: 15 
              }}
              whileHover={!disabled ? { 
                scale: 1.15,
                rotate: index % 2 === 0 ? 5 : -5,
                y: -10 
              } : {}}
              whileTap={!disabled ? { scale: 0.9, rotate: 0 } : {}}
              onClick={() => !disabled && onSelect(strategy)}
              disabled={disabled}
              className={`relative flex flex-col items-center justify-center aspect-square rounded-full border-4 border-white/20 transition-all duration-300 pointer-events-auto
                ${strategy.color} ${strategy.shadow} shadow-2xl
                ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-white hover:z-20'}
              `}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/25 rounded-full flex items-center justify-center text-white mb-2 shadow-inner border border-white/30 backdrop-blur-sm">
                {strategy.icon}
              </div>
              <span className="font-extrabold text-white text-xl sm:text-2xl tracking-tight drop-shadow-md">
                {strategy.thaiLabel}
              </span>
            </motion.button>
          );
        }

        // --- Pro Mode Styling ---
        return (
          <motion.button
            key={strategy.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={!disabled ? { scale: 1.05, y: -5 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
            onClick={() => !disabled && onSelect(strategy)}
            disabled={disabled}
            className={`relative group flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 border-white/10 transition-all duration-300 pointer-events-auto
              ${strategy.color} ${strategy.shadow} shadow-lg
              ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer hover:border-white/40'}
            `}
          >
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-3 group-hover:bg-white/30 transition-colors">
              <div className="scale-75 origin-center leading-none flex items-center justify-center">
                {strategy.icon}
              </div>
            </div>
            <span className="font-bold text-white text-lg tracking-tight mb-1">
              {strategy.thaiLabel}
            </span>
            <span className="text-[10px] text-white/70 font-medium uppercase tracking-widest">
              {strategy.label}
            </span>
            
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 px-3 py-1.5 rounded-lg text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 shadow-xl">
              {strategy.description}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};

