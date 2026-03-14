'use client';

import React from 'react';
import { motion } from 'framer-motion';

type CharacterAvatarProps = {
  name: string;
  mood: 'open' | 'neutral' | 'resistant';
  isTalking: boolean;
};

export const CharacterAvatar = ({ name, mood, isTalking }: CharacterAvatarProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={isTalking ? { y: [0, -15, 0], opacity: 1 } : { y: 0, opacity: 0.7 }}
      transition={isTalking ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.5 }}
      className={`flex flex-col items-center origin-bottom transition-all duration-700 ${isTalking ? 'scale-[1.15] z-20' : 'scale-100 z-10'}`}
    >
      <div className={`w-40 sm:w-56 h-64 sm:h-80 rounded-t-full rounded-b-none flex flex-col items-center justify-center shadow-2xl relative border-t-4 border-x-4 transition-colors duration-500 overflow-hidden
        ${isTalking ? 'bg-gradient-to-b from-purple-500/90 to-indigo-900/90 border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.4)]' : 'bg-gradient-to-b from-slate-700/60 to-slate-900/90 border-white/10 grayscale-[30%]'}
      `}>
          {/* Mock Character Art via Typography for now */}
          <span className="text-8xl sm:text-[9rem] font-black tracking-tighter mix-blend-overlay opacity-30 absolute top-10">
            {name.charAt(0)}
          </span>
          <span className="text-6xl font-black text-white relative z-10 drop-shadow-xl inline-block mt-4">
            {name.charAt(0)}
          </span>

          {/* Mood Indicator */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex space-x-1">
             <div className={`w-2 h-2 rounded-full transition-all ${mood === 'resistant' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]' : 'bg-white/20'}`}></div>
             <div className={`w-2 h-2 rounded-full transition-all ${mood === 'neutral' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,1)]' : 'bg-white/20'}`}></div>
             <div className={`w-2 h-2 rounded-full transition-all ${mood === 'open' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,1)]' : 'bg-white/20'}`}></div>
          </div>
      </div>
    </motion.div>
  );
};
