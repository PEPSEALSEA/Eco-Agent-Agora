'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Handshake, ShieldAlert, Lightbulb, X, Send } from 'lucide-react';

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
    icon: <Heart size={28} />,
    color: 'bg-pink-500',
    shadow: 'shadow-pink-500/40',
    description: 'บอกว่าเราเข้าใจความรู้สึกของเขา'
  },
  {
    id: 'trade',
    label: 'Offer Trade',
    thaiLabel: 'ยื่นข้อเสนอ',
    icon: <Handshake size={28} />,
    color: 'bg-amber-500',
    shadow: 'shadow-amber-500/40',
    description: 'เสนอการแลกเปลี่ยนที่ยุติธรรม'
  },
  {
    id: 'boundary',
    label: 'State Boundary',
    thaiLabel: 'บอกความต้องการ',
    icon: <ShieldAlert size={28} />,
    color: 'bg-red-500',
    shadow: 'shadow-red-500/40',
    description: 'บอกสิ่งที่เราต้องการอย่างชัดเจน'
  },
  {
    id: 'suggest',
    label: 'Suggest Idea',
    thaiLabel: 'เสนอไอเดีย',
    icon: <Lightbulb size={28} />,
    color: 'bg-cyan-500',
    shadow: 'shadow-cyan-500/40',
    description: 'เสนอวิธีแก้ปัญหาใหม่ๆ'
  }
];

type ActionBlockType = { id: string, thaiLabel: string, icon: React.ReactNode, color: string };
type TargetBlockType = { id: string, thaiLabel: string, icon: React.ReactNode, color: string };

const ACTIONS: ActionBlockType[] = [
  { id: 'understand', thaiLabel: 'ฉันเข้าใจ', icon: <Heart size={20}/>, color: 'bg-indigo-500' },
  { id: 'offer', thaiLabel: 'ฉันขอเสนอ', icon: <Handshake size={20}/>, color: 'bg-emerald-500' },
  { id: 'need', thaiLabel: 'ฉันต้องการ', icon: <ShieldAlert size={20}/>, color: 'bg-rose-500' },
  { id: 'idea', thaiLabel: 'ฉันมีไอเดีย', icon: <Lightbulb size={20}/>, color: 'bg-amber-500' },
];

const TARGETS: TargetBlockType[] = [
  { id: 'feelings', thaiLabel: 'ความรู้สึกของเธอ', icon: <Heart size={20}/>, color: 'bg-fuchsia-500' },
  { id: 'new_deal', thaiLabel: 'ข้อตกลงใหม่', icon: <Handshake size={20}/>, color: 'bg-teal-500' },
  { id: 'my_space', thaiLabel: 'พื้นที่ส่วนตัว', icon: <ShieldAlert size={20}/>, color: 'bg-orange-500' },
  { id: 'solution', thaiLabel: 'ทางออกด้วยกัน', icon: <Lightbulb size={20}/>, color: 'bg-blue-500' },
];

type StrategyBlocksProps = {
  onSelect: (strategy: Strategy) => void;
  disabled?: boolean;
  isKidMode?: boolean;
};

export const StrategyBlocks = ({ onSelect, disabled, isKidMode }: StrategyBlocksProps) => {
  const [selectedAction, setSelectedAction] = useState<ActionBlockType | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<TargetBlockType | null>(null);

  const handleSend = () => {
    if (selectedAction && selectedTarget && !disabled) {
       onSelect({
         id: `custom_${selectedAction.id}_${selectedTarget.id}`,
         label: `${selectedAction.id} ${selectedTarget.id}`,
         thaiLabel: `${selectedAction.thaiLabel} ${selectedTarget.thaiLabel}`,
         icon: selectedAction.icon,
         color: selectedAction.color,
         shadow: `shadow-${selectedAction.color.split('-')[1]}-500/40`,
         description: 'Custom Built Strategy'
       });
       // Auto reset after slightly delay so exit animation plays
       setTimeout(() => {
         setSelectedAction(null);
         setSelectedTarget(null);
       }, 500);
    }
  };

  const clearAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAction(null);
    setSelectedTarget(null); // Clearing action clears sequence
  };

  const clearTarget = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTarget(null);
  };

  if (isKidMode) {
    const isComplete = selectedAction && selectedTarget;

    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center select-none pointer-events-auto">
        
        {/* Builder Area (The Slots) */}
        <div className="bg-slate-900/60 backdrop-blur-xl border-4 border-white/20 p-6 rounded-[2.5rem] w-full shadow-2xl flex flex-col items-center">
          <div className="flex items-center justify-center space-x-1 sm:space-x-3 w-full">
            
            {/* Slot 1: Action */}
            <div className={`relative h-20 sm:h-24 w-1/2 rounded-l-[2rem] rounded-r-xl border-dashed border-4 flex items-center justify-center transition-all duration-300
              ${selectedAction ? selectedAction.color + ' border-transparent shadow-lg scale-105 z-10' : 'border-white/20 bg-black/40'}
            `}>
              <AnimatePresence mode="popLayout">
                {selectedAction ? (
                  <motion.div 
                    initial={{ scale: 0, rotate: -10 }} 
                    animate={{ scale: 1, rotate: 0 }} 
                    exit={{ scale: 0 }} 
                    className="flex flex-col sm:flex-row items-center justify-center text-white w-full h-full relative"
                  >
                    <div className="bg-black/20 p-2 rounded-full sm:mr-3 mb-1 sm:mb-0">{selectedAction.icon}</div>
                    <span className="font-black text-sm sm:text-xl tracking-wide leading-tight text-center">{selectedAction.thaiLabel}</span>
                    <button onClick={clearAction} disabled={disabled} className="absolute -top-3 -left-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-400">
                      <X size={14} />
                    </button>
                    {/* Visual Puzzle Tab matching Slot 2 indent */}
                    <div className={`absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-8 sm:w-6 sm:h-12 rounded-r-full z-20 ${selectedAction.color}`}></div>
                  </motion.div>
                ) : (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/40 font-bold text-center text-xs sm:text-lg">เลือกคำกริยา</motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Slot 2: Target (Only visible/active if Action chosen) */}
            <div className={`relative h-20 sm:h-24 w-1/2 rounded-r-[2rem] rounded-l-xl border-dashed border-4 flex items-center justify-center transition-all duration-300
              ${!selectedAction ? 'opacity-30 border-white/10 bg-black/40' : selectedTarget ? selectedTarget.color + ' border-transparent shadow-lg scale-105 z-20' : 'border-white/30 bg-black/40 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]'}
            `}>
              <AnimatePresence mode="popLayout">
                {selectedTarget ? (
                  <motion.div 
                    initial={{ scale: 0, rotate: 10, x: -20 }} 
                    animate={{ scale: 1, rotate: 0, x: 0 }} 
                    exit={{ scale: 0 }} 
                    className="flex flex-col sm:flex-row items-center justify-center text-white w-full h-full relative pl-4"
                  >
                     {/* Visual Puzzle Indent to match Slot 1 tab */}
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-8 sm:w-6 sm:h-12 rounded-r-full bg-slate-900/60 backdrop-blur-xl"></div>
                    
                    <div className="bg-black/20 p-2 rounded-full sm:mr-3 mb-1 sm:mb-0 z-10">{selectedTarget.icon}</div>
                    <span className="font-black text-sm sm:text-lg tracking-wide leading-tight text-center z-10">{selectedTarget.thaiLabel}</span>
                    <button onClick={clearTarget} disabled={disabled} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-400 z-30">
                      <X size={14} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/40 font-bold text-center pl-4 text-xs sm:text-lg">เรื่องอะไร?</motion.span>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>

        {/* Go Button or Blocks Palette */}
        <div className="mt-6 w-full h-40 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {isComplete ? (
              // The "GO!" Button
              <motion.button
                key="go-button"
                initial={{ scale: 0, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                whileHover={!disabled ? { scale: 1.1, rotate: 2 } : {}}
                whileTap={!disabled ? { scale: 0.9, rotate: -2 } : {}}
                onClick={handleSend}
                disabled={disabled}
                className={`flex items-center justify-center px-12 py-5 rounded-full font-black text-3xl sm:text-5xl border-b-8 shadow-[0_20px_50px_rgba(236,72,153,0.5)] transition-all
                  ${disabled ? 'bg-gray-500 border-gray-700 text-gray-300 opacity-50 cursor-not-allowed' : 'bg-gradient-to-t from-pink-600 to-pink-400 border-pink-700 text-white hover:brightness-110 active:border-b-0 active:translate-y-2'}
                `}
              >
                ส่งเลย! <Send size={36} className="ml-4 drop-shadow-md" />
              </motion.button>
            ) : (
              // The Block Palette
              <motion.div 
                key={!selectedAction ? "actions-palette" : "targets-palette"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-4 gap-2 sm:gap-4 w-full"
              >
                {!selectedAction ? (
                  // Show Actions
                  ACTIONS.map((action, i) => (
                    <motion.button
                      key={action.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.05, type: 'spring' }}
                      whileHover={!disabled ? { scale: 1.05, y: -5 } : {}}
                      whileTap={!disabled ? { scale: 0.95 } : {}}
                      onClick={() => !disabled && setSelectedAction(action)}
                      disabled={disabled}
                      className={`${action.color} relative h-28 sm:h-32 rounded-3xl border-b-4 border-black/20 flex flex-col items-center justify-center text-white shadow-lg pointer-events-auto
                        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:brightness-110'}
                      `}
                    >
                      <div className="bg-white/20 p-3 rounded-full mb-2">{action.icon}</div>
                      <span className="font-bold text-[11px] sm:text-sm text-center px-1 leading-tight">{action.thaiLabel}</span>
                      {/* Sub-tab icon piece */}
                      <div className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-8 rounded-r-full ${action.color} border-y-2 border-r-2 border-white/20`}></div>
                    </motion.button>
                  ))
                ) : (
                  // Show Targets
                  TARGETS.map((target, i) => (
                    <motion.button
                      key={target.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.05, type: 'spring' }}
                      whileHover={!disabled ? { scale: 1.05, y: -5 } : {}}
                      whileTap={!disabled ? { scale: 0.95 } : {}}
                      onClick={() => !disabled && setSelectedTarget(target)}
                      disabled={disabled}
                      className={`${target.color} relative h-28 sm:h-32 rounded-3xl border-b-4 border-black/20 flex flex-col items-center justify-center text-white shadow-lg pointer-events-auto
                        ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:brightness-110'}
                      `}
                    >
                      <div className="bg-white/20 p-3 rounded-full mb-2">{target.icon}</div>
                      <span className="font-bold text-[11px] sm:text-[13px] text-center px-1 leading-tight">{target.thaiLabel}</span>
                    </motion.button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // --- Pro Mode Styling ---
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
      {STRATEGIES.map((strategy, index) => (
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
      ))}
    </div>
  );
};


