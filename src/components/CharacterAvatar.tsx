'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type CharacterAvatarProps = {
  name: string;
  mood: 'open' | 'neutral' | 'resistant';
  isTalking: boolean;
};

const MOOD_EMOJIS = {
  open: '😊',
  neutral: '😐',
  resistant: '😠'
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
          {/* Mood Expression Emoji (Kid Mode Feature) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mood}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-12 text-6xl z-20"
            >
              {MOOD_EMOJIS[mood]}
            </motion.div>
          </AnimatePresence>

          {/* Mock Character Art via Typography */}
          <span className="text-8xl sm:text-[9rem] font-black tracking-tighter mix-blend-overlay opacity-20 absolute top-10">
            {name.charAt(0)}
          </span>
          <span className="text-4xl font-black text-white/50 absolute bottom-10 z-10 drop-shadow-xl inline-block">
            {name}
          </span>

          {/* Trust Bar (Health bar style) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-3 bg-black/40 rounded-full border border-white/10 p-0.5 overflow-hidden">
             <motion.div 
               animate={{ 
                 width: mood === 'open' ? '100%' : mood === 'neutral' ? '60%' : '30%',
                 backgroundColor: mood === 'open' ? '#22c55e' : mood === 'neutral' ? '#eab308' : '#ef4444'
               }}
               className="h-full rounded-full"
             />
          </div>
      </div>
    </motion.div>
  );
};
