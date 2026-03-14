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
      animate={isTalking ? { y: [0, -10, 0] } : { y: 0 }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      className={`flex flex-col items-center transition-all duration-500 ${isTalking ? 'scale-125 z-30 transform' : 'scale-100 opacity-60 z-10'}`}
    >
      <div className={`w-32 h-40 rounded-3xl flex items-center justify-center text-5xl font-bold shadow-2xl relative border-2 transition-colors duration-500
        ${isTalking ? 'bg-gradient-to-b from-purple-500 to-indigo-600 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]' : 'bg-gradient-to-br from-slate-700 to-slate-800 border-white/10 grayscale-[50%]'}
      `}>
          {name.charAt(0)}
          <div className={`absolute -bottom-3 right-2 w-6 h-6 rounded-full border-4 border-slate-900 transition-all ${
            mood === 'open' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,1)]' :
            mood === 'resistant' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,1)]' :
            'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,1)]'
          }`}></div>
      </div>
      <span className={`mt-4 font-bold transition-all ${isTalking ? 'text-cyan-400 text-lg drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-gray-500'}`}>{name}</span>
    </motion.div>
  );
};
