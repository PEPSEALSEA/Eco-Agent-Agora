'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, User as UserIcon, Triangle } from 'lucide-react';

type DialogueBoxProps = {
  sender: 'user' | 'ai';
  characterName?: string;
  content: string;
  isTyping: boolean;
  onTypingComplete?: () => void;
  isLastMessage: boolean;
  isKidMode?: boolean;
};

const splitIntoSentences = (text: string) => {
  return text.split('\n').filter(s => s.trim().length > 0);
};

export const DialogueBox = ({ sender, characterName, content, isTyping, onTypingComplete, isLastMessage, isKidMode }: DialogueBoxProps) => {
  const sentences = splitIntoSentences(content);
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setParagraphIndex(0);
    setDisplayedText('');
  }, [content]);

  const currentSentence = sentences[paragraphIndex] || '';

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText(currentSentence.slice(0, i + 1));
      i++;
      if (i >= currentSentence.length) {
        clearInterval(interval);
        if (paragraphIndex === sentences.length - 1 && onTypingComplete) {
          onTypingComplete();
        }
      }
    }, isKidMode ? 5 : 15); // Faster typing speed for kids
    
    return () => clearInterval(interval);
  }, [paragraphIndex, currentSentence, sentences.length, onTypingComplete, isKidMode]);

  const hasMoreParagraphs = paragraphIndex < sentences.length - 1;
  const isFinishedTyping = displayedText.length === currentSentence.length;

  const handleBoxClick = (e: React.MouseEvent) => {
    if (hasMoreParagraphs) {
      e.stopPropagation(); // Prevent page from navigating to next character message
      if (!isFinishedTyping) {
        // Fast forward typing
        setDisplayedText(currentSentence);
      } else {
        // Next paragraph
        setParagraphIndex(p => p + 1);
      }
    } else {
      if (!isFinishedTyping) {
        e.stopPropagation();
        setDisplayedText(currentSentence);
        if (onTypingComplete) onTypingComplete();
      }
      // If it is finished and no more paras, event bubbles up to page
    }
  };

  const isAiSpeaking = sender === 'ai';

  return (
    <>
      {/* Invisible overlay to catch clicks if there are more paragraphs to show */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={handleBoxClick}
        style={{ display: (hasMoreParagraphs || !isFinishedTyping) ? 'block' : 'none' }}
      ></div>

      <div 
        className={`w-full max-w-4xl mx-auto z-50 text-left cursor-pointer relative transition-all duration-300 ${isKidMode ? 'mb-10 hover:scale-[1.02]' : 'hover:-translate-y-1'}`}
        onClick={handleBoxClick}
      >
        {/* Kid Mode Comic Speech Bubble Tail */}
        {isKidMode && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-8 h-10 bg-white border-r-4 border-b-4 border-gray-900 z-10 skew-x-[20deg]" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 0)' }}></div>
        )}

        {/* Floating Name Badge */}
        {!isKidMode && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center absolute -top-5 left-8 z-10"
          >
            <div className="bg-slate-100 text-slate-900 px-6 py-1.5 rounded-full font-black text-[18px] shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center tracking-wide border-b-4 border-slate-300">
              {isAiSpeaking ? (
                <><Bot size={20} className="mr-2 text-indigo-600" /> {characterName}</>
              ) : (
                <><UserIcon size={20} className="mr-2 text-blue-600" /> คุณ</>
              )}
            </div>
          </motion.div>
        )}

        {/* Dialogue Box Base */}
        <motion.div 
          initial={{ opacity: 0, scale: isKidMode ? 0.8 : 0.95, y: isKidMode ? 40 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={isKidMode ? { type: "spring", stiffness: 400, damping: 20 } : { type: "spring", stiffness: 150, damping: 20 }}
          className={
            isKidMode 
              ? `relative w-full bg-white border-4 border-gray-900 p-8 pb-12 pt-10 rounded-3xl shadow-[0_15px_0_rgba(17,24,39,1)] min-h-[160px] flex flex-col justify-center text-center`
              : `w-full bg-slate-900/85 backdrop-blur-xl border-t-2 border-x-2 border-b-4 p-8 pt-10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,1)] min-h-[160px] flex flex-col justify-between ${
                  isAiSpeaking ? 'border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.15)]' : 'border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.15)]'
                }`
          }
        >
          {/* Main Text Container */}
          <div className={`mx-auto w-full ${isKidMode ? 'max-w-[40ch]' : 'max-w-[70ch]'}`}>
            <p className={
              isKidMode 
                ? "text-3xl leading-[1.6] text-gray-900 font-black tracking-tight drop-shadow-sm" 
                : "text-[21px] leading-[1.7] text-gray-100 font-sans tracking-wide"
            }>
              {displayedText}
              {isFinishedTyping && (
                <motion.span 
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className={`inline-block ml-1 -mb-1 w-3 ${isKidMode ? 'h-8 bg-pink-500 rounded-full' : 'h-5 bg-cyan-400'}`}
                />
              )}
            </p>
          </div>

          {/* Next Indicator */}
          {isFinishedTyping && (
            <motion.div 
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`absolute flex items-center font-bold ${
                isKidMode 
                  ? 'bottom-4 right-8 text-pink-500 text-lg space-x-2 opacity-100' 
                  : 'bottom-4 right-8 text-cyan-400 text-sm space-x-2 opacity-80'
              }`}
            >
              <span>{hasMoreParagraphs ? 'อ่านต่อ' : (!isLastMessage ? 'แตะจอ!' : '')}</span>
              {(hasMoreParagraphs || !isLastMessage) && <Triangle fill="currentColor" stroke="none" size={isKidMode ? 16 : 12} className="rotate-180" />}
            </motion.div>
          )}
        </motion.div>
      </div>
    </>
  );
};
