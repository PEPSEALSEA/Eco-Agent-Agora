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
        y: [0, -25, 0], 
        scale: [1.15, 1.25, 1.15],
        rotate: [0, 2, -2, 0],
        opacity: 1 
      } : { y: 0, opacity: 0.7, scale: 1 }}
      transition={isTalking ? { 
        duration: 2, 
        repeat: Infinity, 
        ease: "easeInOut" 
      } : { duration: 0.5 }}
      className={`flex flex-col items-center origin-bottom transition-all duration-700 ${isTalking ? 'z-20' : 'z-10'}`}
    >
      <div className={`w-44 sm:w-64 h-72 sm:h-88 rounded-[4rem] flex flex-col items-center justify-center shadow-2xl relative border-[8px] transition-all duration-500 overflow-visible
        ${isTalking ? 'bg-white border-gray-900 shadow-[0_25px_0_rgba(0,0,0,1)]' : 'bg-slate-800/40 border-white/10 grayscale-[20%]'}
      `}>
          {/* Mood Expression Emoji (Kid Mode Feature) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mood}
              initial={{ scale: 0, opacity: 0, y: 20, rotate: -20 }}
              animate={{ scale: 1.5, opacity: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-12 -right-8 text-8xl z-30 drop-shadow-[0_10px_0_rgba(0,0,0,0.2)] filter saturate-150"
            >
              {MOOD_EMOJIS[mood]}
            </motion.div>
          </AnimatePresence>

          {/* Character Art */}
          <div className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-[3.8rem]">
            {imageUrl ? (
              <motion.img 
                src={imageUrl} 
                alt={name}
                className={`w-full h-full object-contain object-bottom transition-all duration-500 ${isTalking ? 'scale-110' : 'scale-100'}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              />
            ) : (
              <span className={`text-9xl sm:text-[11rem] font-black tracking-tighter mix-blend-overlay opacity-20 select-none ${isTalking ? 'text-gray-900 opacity-40' : ''}`}>
                {name.charAt(0)}
              </span>
            )}
            
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
          </div>

          <div className={`absolute bottom-8 left-0 w-full px-4 py-3 border-y-[6px] border-gray-900 z-10 transition-all ${isTalking ? 'bg-nintendo-yellow opacity-100 translate-y-0' : 'bg-black/60 opacity-80 translate-y-2'}`}>
            <span className={`text-2xl font-black block text-center uppercase tracking-tighter ${isTalking ? 'text-gray-900' : 'text-white'}`}>
              {name}
            </span>
          </div>

          {/* Trust Bar (Game health bar style) */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[90%] h-8 bg-gray-900 rounded-full border-4 border-gray-900 p-1 shadow-2xl z-20 overflow-hidden">
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
