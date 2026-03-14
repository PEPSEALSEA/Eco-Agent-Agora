import React, { useEffect } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Bot, User as UserIcon } from 'lucide-react';

const sentenceVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

type DialogueBoxProps = {
  sender: 'user' | 'ai';
  characterName?: string;
  content: string;
  isTyping: boolean;
  onTypingComplete?: () => void;
  isLastMessage: boolean;
};

// Simple utility to split text into sequence of paragraphs/sentences
const splitIntoSentences = (text: string) => {
  return text.split('\n').filter(s => s.trim().length > 0);
};

export const DialogueBox = ({ sender, characterName, content, isTyping, onTypingComplete, isLastMessage }: DialogueBoxProps) => {
  const sentences = splitIntoSentences(content);
  const controls = useAnimationControls();

  useEffect(() => {
    if (isTyping) {
      controls.start('visible').then(() => {
        if (onTypingComplete) onTypingComplete();
      });
    } else {
      controls.set('visible');
    }
  }, [isTyping, controls, onTypingComplete]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full mt-6 bg-slate-900/90 backdrop-blur-xl border-2 border-white/20 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-20"
    >
      <div className="absolute top-0 left-1/2 -mt-3 w-6 h-6 bg-slate-900 border-l-2 border-t-2 border-white/20 transform rotate-45 -translate-x-1/2"></div>
      <div className="flex flex-col min-h-[100px]">
        {sender === 'ai' ? (
            <span className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider flex items-center">
              <Bot size={16} className="mr-2" /> {characterName}
            </span>
        ) : (
            <span className="text-sm font-bold text-blue-400 mb-3 uppercase tracking-wider flex items-center">
              <UserIcon size={16} className="mr-2" /> คุณ
            </span>
        )}
        
        {/* Animated Sequence Text */}
        <motion.div
           initial="hidden"
           animate={controls}
           transition={{ staggerChildren: 0.8 }}
        >
          {sentences.map((text, i) => (
            <motion.p 
              key={i} 
              variants={sentenceVariants}
              className="text-xl leading-relaxed whitespace-pre-wrap text-white font-serif mb-4 last:mb-0"
            >
              {text}
            </motion.p>
          ))}
        </motion.div>
        
        {/* Click to continue indicator */}
        {!isTyping && !isLastMessage && (
          <div className="absolute bottom-4 right-6 text-cyan-400 animate-bounce flex items-center text-xs font-bold">
            <span>คลิกเพื่อดำเนินการต่อ</span>
            <div className="ml-2 w-0 h-0 border-l-[6px] border-l-transparent border-t-[8px] border-t-cyan-400 border-r-[6px] border-r-transparent"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
