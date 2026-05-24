'use client';

import { motion } from 'framer-motion';

const ORBIT_NODES = [
  { angle: 0, label: 'AI' },
  { angle: 72, label: 'คุณ' },
  { angle: 144, label: 'คู่เจรจา' },
  { angle: 216, label: 'กลาง' },
  { angle: 288, label: 'ผลลัพธ์' },
];

export function NegotiationOrb() {
  return (
    <motion.div
      className="relative w-[min(72vw,22rem)] h-[min(72vw,22rem)] sm:w-96 sm:h-96 flex items-center justify-center landing-float"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-60"
        style={{
          background:
            'radial-gradient(circle, rgba(45, 212, 191, 0.35) 0%, rgba(212, 168, 83, 0.12) 45%, transparent 70%)',
        }}
      />

      {/* Outer orbit ring */}
      <div className="absolute inset-0 landing-orbit-slow">
        <svg viewBox="0 0 320 320" className="w-full h-full" aria-hidden>
          <circle
            cx="160"
            cy="160"
            r="148"
            fill="none"
            stroke="url(#orbitGradient)"
            strokeWidth="1.5"
            strokeDasharray="8 14"
            opacity="0.55"
          />
          <defs>
            <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="50%" stopColor="#d4a853" />
              <stop offset="100%" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Counter-rotating inner ring */}
      <div className="absolute inset-[12%] landing-orbit-reverse landing-pulse-ring">
        <svg viewBox="0 0 240 240" className="w-full h-full" aria-hidden>
          <circle
            cx="120"
            cy="120"
            r="108"
            fill="none"
            stroke="rgba(247, 242, 234, 0.2)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Orbiting agent nodes */}
      {ORBIT_NODES.map((node, i) => (
        <motion.div
          key={node.label}
          className="absolute left-1/2 top-1/2 w-3 h-3 -ml-1.5 -mt-1.5"
          style={{
            transform: `rotate(${node.angle}deg) translateY(calc(-1 * min(36vw, 11rem)))`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
        >
          <div
            className="w-3 h-3 rounded-full border border-agora-cream/40 shadow-[0_0_12px_rgba(45,212,191,0.8)]"
            style={{
              background: i % 2 === 0 ? '#2dd4bf' : '#d4a853',
            }}
          />
        </motion.div>
      ))}

      {/* Core icon — dialogue circle */}
      <div className="relative z-10 w-[58%] h-[58%] rounded-full border border-agora-cream/25 bg-agora-forest/80 backdrop-blur-md shadow-[0_0_60px_rgba(45,212,191,0.25),inset_0_0_40px_rgba(0,0,0,0.35)] flex items-center justify-center">
        <svg
          viewBox="0 0 120 120"
          className="w-[70%] h-[70%] text-agora-cream"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Negotiation circle icon"
        >
          <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
          <circle cx="60" cy="60" r="34" stroke="#2dd4bf" strokeWidth="2" opacity="0.7" />
          <path
            d="M38 52c0-12 10-22 22-22s22 10 22 22-10 22-22 22c-4 0-8-1-11-3l-14 6 4-14c-2-3-3-7-3-11z"
            fill="rgba(247,242,234,0.12)"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M82 68c0 10-8 18-18 18-3 0-6-1-8-2l-10 4 3-10"
            fill="rgba(212,168,83,0.15)"
            stroke="#d4a853"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="48" cy="50" r="3" fill="#2dd4bf" />
          <circle cx="72" cy="50" r="3" fill="#d4a853" />
          <circle cx="60" cy="60" r="4" fill="currentColor" opacity="0.9" />
          <path
            d="M52 60h16M60 52v16"
            stroke="#2dd4bf"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>

        <motion.div
          className="absolute inset-2 rounded-full border border-agora-teal/30"
          animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.75, 0.4] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}
