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
       setTimeout(() => {
         setSelectedAction(null);
         setSelectedTarget(null);
       }, 500);
    }
  };

  const clearAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAction(null);
    setSelectedTarget(null);
  };

  const clearTarget = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTarget(null);
  };

  if (isKidMode) {
    const isComplete = selectedAction && selectedTarget;
    const isChoosingAction = !selectedAction;

    return (
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center select-none pointer-events-auto bg-black/60 p-6 rounded-[3rem] backdrop-blur-md shadow-2xl">
        
        {/* Step Indicator Header (Helps Focus) */}
        <div className="mb-6 bg-white/10 px-6 py-2 rounded-full font-bold text-cyan-300 tracking-wide text-sm sm:text-base border border-white/20">
          {!isComplete ? (isChoosingAction ? '1. เลือกการกระทำของคุณ' : '2. เลือกสิ่งที่คุณต้องการพูดถึง') : '3. พร้อมส่ง!'}
        </div>

        {/* Builder Slots Area */}
        <div className="w-full justify-center flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
          
          {/* Slot 1: Action */}
          <div className={`relative h-24 sm:h-28 w-full sm:w-1/2 rounded-[2rem] border-4 flex items-center justify-center transition-all duration-300
            ${selectedAction ? selectedAction.color + ' border-transparent shadow-[0_0_30px_rgba(255,255,255,0.3)] z-10' : 'border-dashed border-white/40 bg-white/5'}
            ${isChoosingAction && !isComplete ? 'ring-4 ring-cyan-400 ring-offset-4 ring-offset-slate-900 animate-pulse' : ''}
          `}>
            {selectedAction ? (
              <motion.div 
                initial={{ scale: 0.8 }} animate={{ scale: 1 }} 
                className="flex items-center justify-center text-white w-full h-full relative"
              >
                <div className="bg-black/20 p-3 rounded-full mr-3">{selectedAction.icon}</div>
                <span className="font-black text-xl sm:text-2xl tracking-wide">{selectedAction.thaiLabel}</span>
                <button onClick={clearAction} disabled={disabled} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-xl hover:bg-red-400 transition-transform hover:scale-110">
                  <X size={16} />
                </button>
              </motion.div>
            ) : (
              <span className="text-white/60 font-black text-lg sm:text-xl">+ การกระทำ</span>
            )}
          </div>

          {/* Slot 2: Target */}
          <div className={`relative h-24 sm:h-28 w-full sm:w-1/2 rounded-[2rem] border-4 flex items-center justify-center transition-all duration-300
            ${!selectedAction ? 'opacity-30 border-dashed border-white/10 bg-black/40' : selectedTarget ? selectedTarget.color + ' border-transparent shadow-[0_0_30px_rgba(255,255,255,0.3)] z-20' : 'border-dashed border-white/40 bg-white/10'}
            ${!isChoosingAction && !isComplete ? 'ring-4 ring-pink-400 ring-offset-4 ring-offset-slate-900 animate-pulse' : ''}
          `}>
            {selectedTarget ? (
              <motion.div 
                initial={{ scale: 0.8 }} animate={{ scale: 1 }} 
                className="flex items-center justify-center text-white w-full h-full relative"
              >
                <div className="bg-black/20 p-3 rounded-full mr-3">{selectedTarget.icon}</div>
                <span className="font-black text-xl sm:text-2xl tracking-wide">{selectedTarget.thaiLabel}</span>
                <button onClick={clearTarget} disabled={disabled} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-2 shadow-xl hover:bg-red-400 transition-transform hover:scale-110">
                  <X size={16} />
                </button>
              </motion.div>
            ) : (
              <span className="text-white/60 font-black text-lg sm:text-xl">+ เป้าหมาย</span>
            )}
          </div>
        </div>

        {/* Action / Target Palette OR Go Button */}
        <div className="w-full flex items-center justify-center min-h-[140px]">
          {isComplete ? (
            <motion.button
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={!disabled ? { scale: 1.05 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              onClick={handleSend}
              disabled={disabled}
              className={`flex items-center justify-center px-12 py-5 rounded-full font-black text-3xl sm:text-4xl border-b-8 shadow-[0_15px_40px_rgba(236,72,153,0.6)] transition-all
                ${disabled ? 'bg-gray-500 border-gray-700 text-gray-300 opacity-50 cursor-not-allowed' : 'bg-gradient-to-t from-pink-600 to-pink-400 border-pink-700 text-white hover:brightness-110 active:border-b-0 active:translate-y-2'}
              `}
            >
              ส่งเลย! <Send size={32} className="ml-4 drop-shadow-md" />
            </motion.button>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
              {isChoosingAction ? (
                // Show Actions
                ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => !disabled && setSelectedAction(action)}
                    disabled={disabled}
                    className={`${action.color} relative h-24 sm:h-32 rounded-3xl border-b-4 border-black/20 flex flex-col items-center justify-center text-white shadow-lg pointer-events-auto transition-transform hover:scale-[1.03] active:scale-95
                      ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:brightness-110'}
                    `}
                  >
                    <div className="bg-white/20 p-2 sm:p-3 rounded-full mb-2">{action.icon}</div>
                    <span className="font-extrabold text-[13px] sm:text-base text-center px-1 leading-tight">{action.thaiLabel}</span>
                  </button>
                ))
              ) : (
                // Show Targets
                TARGETS.map((target) => (
                  <button
                    key={target.id}
                    onClick={() => !disabled && setSelectedTarget(target)}
                    disabled={disabled}
                    className={`${target.color} relative h-24 sm:h-32 rounded-3xl border-b-4 border-black/20 flex flex-col items-center justify-center text-white shadow-lg pointer-events-auto transition-transform hover:scale-[1.03] active:scale-95
                      ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:brightness-110'}
                    `}
                  >
                    <div className="bg-white/20 p-2 sm:p-3 rounded-full mb-2">{target.icon}</div>
                    <span className="font-extrabold text-[13px] sm:text-base text-center px-1 leading-tight">{target.thaiLabel}</span>
                  </button>
                ))
              )}
            </div>
          )}
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


