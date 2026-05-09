'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { getAssetPath } from '@/lib/gas';

interface CartoonLoadingProps {
  isOpen: boolean;
  message: string;
  progress?: number; // 0 to 100
}

export const CartoonLoading = ({ isOpen, message, progress }: CartoonLoadingProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
        >
          <motion.div
            initial={{ scale: 0.5, y: 100, rotate: -10 }}
            animate={{ scale: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.5, y: 100, rotate: 10 }}
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-full max-w-md bg-white border-[8px] border-gray-900 rounded-[3.5rem] shadow-[0_24px_0_rgba(0,0,0,1)] p-10 flex flex-col items-center relative overflow-hidden"
          >
            {/* Top Stripe Decorative */}
            <div className="absolute top-0 left-0 w-full h-5 bg-nintendo-red" />
            <div className="absolute top-5 left-0 w-full h-2 bg-gray-900/10" />
            
            {/* Mascot Container - Bouncing Mascot */}
            <motion.div
              className="relative w-44 h-44 mb-8 mt-4 drop-shadow-[0_15px_15px_rgba(0,0,0,0.2)]"
            >
              <Image 
                src={getAssetPath("/characters/loading.gif")} 
                alt="Loading Mascot" 
                fill 
                className="object-contain"
                priority
                unoptimized={true}
              />
            </motion.div>

            {/* Status Message */}
            <motion.div 
              animate={{ rotate: [-1, 1, -1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-gray-100 border-4 border-gray-900 px-8 py-4 rounded-[2rem] mb-8 relative shadow-[inset_0_4px_0_rgba(0,0,0,0.05)]"
            >
              {/* Little speech bubble arrow */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-gray-100 border-l-4 border-t-4 border-gray-900 rotate-45" />
              
              <h2 className="text-3xl font-black text-gray-900 text-center leading-relaxed tracking-normal uppercase italic">
                {message}
              </h2>
            </motion.div>

            {/* Loading Bar Container */}
            <div className="w-full space-y-3">
              <div className="flex justify-between items-end px-2">
                <span className="font-black text-gray-900 text-sm uppercase tracking-normal">Loading...</span>
                {progress !== undefined && (
                  <span className="font-black text-nintendo-blue text-xl">{Math.round(progress)}%</span>
                )}
              </div>
              
              <div className="w-full bg-gray-200 border-[6px] border-gray-900 h-12 rounded-[1.5rem] overflow-hidden relative shadow-[inset_0_6px_0_rgba(0,0,0,0.15)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress ?? 100}%` }}
                  transition={progress !== undefined ? { type: "spring", damping: 20 } : {}}
                  className={`h-full ${progress !== undefined ? 'bg-nintendo-green' : 'bg-nintendo-yellow'} border-r-[6px] border-gray-900 relative transition-all duration-500`}
                >
                  {/* Stripes Pattern */}
                  <motion.div 
                    animate={{ backgroundPositionX: ['0px', '40px'] }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="absolute inset-0 opacity-30" 
                    style={{ 
                      backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)',
                      backgroundSize: '40px 40px'
                    }} 
                  />
                  
                  {/* Glossy Top Highlight */}
                  <div className="absolute top-2 left-2 right-2 h-3 bg-white/40 rounded-full" />
                  
                  {/* Indeterminate Animation if no progress provided */}
                  {progress === undefined && (
                     <motion.div 
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                     />
                  )}
                </motion.div>
              </div>
            </div>

            {/* Pulsing Text */}
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mt-8 flex items-center space-x-2"
            >
              <div className="w-2 h-2 bg-nintendo-pink rounded-full" />
              <p className="text-gray-400 font-black text-xs uppercase tracking-normal leading-relaxed">
                Please wait a moment
              </p>
              <div className="w-2 h-2 bg-nintendo-pink rounded-full" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
