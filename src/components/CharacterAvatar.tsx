'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type CharacterAvatarProps = {
  name: string;
  mood: 'open' | 'neutral' | 'resistant';
  isTalking: boolean;
  imageUrl?: string;
};

const MOOD_EMOJIS = {
  open: '😊',
  neutral: '😐',
  resistant: '😠'
};

export const CharacterAvatar = ({ name, mood, isTalking, imageUrl }: CharacterAvatarProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={isTalking ? { 
        y: [0, -15, 0], 
        scale: [1.15, 1.2, 1.15],
        rotate: [0, 1, -1, 0],
        opacity: 1 
      } : { y: 0, opacity: 0.7, scale: 1 }}
      transition={isTalking ? { 
        duration: 2, 
        repeat: Infinity, 
        ease: "easeInOut" 
      } : { duration: 0.5 }}
      className={`flex flex-col items-center origin-bottom transition-all duration-700 ${isTalking ? 'z-20' : 'z-10'}`}
    >
      <div className={`w-44 sm:w-64 h-72 sm:h-88 rounded-[3rem] flex flex-col items-center justify-center shadow-2xl relative border-4 transition-all duration-500 overflow-visible
        ${isTalking ? 'bg-gradient-to-b from-purple-500/40 to-indigo-900/60 border-cyan-400 shadow-[0_0_50px_rgba(34,211,238,0.3)]' : 'bg-gradient-to-b from-slate-800/40 to-slate-900/60 border-white/10 grayscale-[20%]'}
      `}>
          {/* Mood Expression Emoji (Kid Mode Feature) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mood}
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1.2, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-6 -right-4 text-6xl z-30 drop-shadow-2xl filter saturate-150"
            >
              {MOOD_EMOJIS[mood]}
            </motion.div>
          </AnimatePresence>

          {/* Character Art */}
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-[2.8rem]">
            {imageUrl ? (
              <motion.img 
                src={imageUrl} 
                alt={name}
                className={`w-full h-full object-contain object-bottom transition-all duration-500 ${isTalking ? 'scale-110' : 'scale-100'}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              />
            ) : (
              <span className="text-9xl sm:text-[11rem] font-black tracking-tighter mix-blend-overlay opacity-20 select-none">
                {name.charAt(0)}
              </span>
            )}
            
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
          </div>

          <div className={`absolute bottom-8 left-0 w-full px-4 py-2 bg-black/60 backdrop-blur-md border-y border-white/10 z-10 transition-all ${isTalking ? 'opacity-100 translate-y-0' : 'opacity-80 translate-y-2'}`}>
            <span className="text-xl font-black text-white block text-center drop-shadow-lg tracking-tight">
              {name}
            </span>
          </div>

          {/* Trust Bar (Game health bar style) */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[85%] h-5 bg-slate-900/90 rounded-full border-2 border-white/20 p-1 shadow-2xl z-20 overflow-hidden">
             <motion.div 
               animate={{ 
                 width: mood === 'open' ? '100%' : mood === 'neutral' ? '60%' : '30%',
                 backgroundColor: mood === 'open' ? '#22c55e' : mood === 'neutral' ? '#eab308' : '#ef4444'
               }}
               className="h-full rounded-full relative shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]"
             >
                {/* Visual pulse for the bar */}
                <motion.div 
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-white/20 rounded-full"
                />
             </motion.div>
          </div>
      </div>
    </motion.div>
  );
};
