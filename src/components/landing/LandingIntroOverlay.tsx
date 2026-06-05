'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { getAssetPath } from '@/lib/gas';

type LandingIntroOverlayProps = {
  show: boolean;
  variant: 'login' | 'main';
  onComplete: () => void;
};

const VARIANT_COPY = {
  login: {
    title: 'WongJraJa',
    subtitle: 'วงเจรจา',
    hint: 'เตรียมตัวเข้าสู่วงเจรจา...',
  },
  main: {
    title: 'WongJraJa',
    subtitle: 'สมุดภารกิจนักเจรจา',
    hint: 'กำลังเปิดสมุดบันทึกนักเจรจา...',
  },
} as const;

const FADE_EASE = [0.45, 0, 0.55, 1] as const;
const FADE_IN_MS = 700;
const HOLD_MS = 1400;
const FADE_OUT_MS = 650;
const INTRO_MS = FADE_IN_MS + HOLD_MS;

export function LandingIntroOverlay({ show, variant, onComplete }: LandingIntroOverlayProps) {
  const copy = VARIANT_COPY[variant];

  useEffect(() => {
    if (!show) return;
    const timer = window.setTimeout(onComplete, INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="landing-intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: FADE_OUT_MS / 1000, ease: FADE_EASE } }}
          transition={{ duration: FADE_IN_MS / 1000, ease: FADE_EASE }}
          className="fixed inset-0 z-[10001] overflow-hidden"
          aria-live="polite"
          aria-label="กำลังเข้าสู่แอป"
        >
          <div className="landing-atmosphere absolute inset-0" aria-hidden />

          <div
            className="pointer-events-none absolute inset-0 opacity-[0.22]"
            style={{
              backgroundImage: 'radial-gradient(#2b221a 2px, transparent 2px)',
              backgroundSize: '28px 28px',
            }}
            aria-hidden
          />

          <div className="relative z-10 flex h-full flex-col items-center justify-between px-4 py-6 sm:px-6 sm:py-8">
            <motion.header
              className="shrink-0 pt-2 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: FADE_IN_MS / 1000, ease: FADE_EASE }}
            >
              <div className="inline-block -rotate-1 rounded-[2rem] border-[6px] border-[#2b221a] bg-white px-10 py-4 shadow-[0_10px_0_#2b221a] sm:px-14 sm:py-5">
                <h1
                  className="font-black uppercase tracking-tight text-[#2b221a]"
                  style={{ fontSize: 'clamp(2.25rem, 10vw, 4rem)', lineHeight: 1.05 }}
                >
                  {copy.title}
                </h1>
                <p className="mt-2 text-base font-black uppercase tracking-[0.22em] text-[#1f6f63] sm:text-xl">
                  {copy.subtitle}
                </p>
              </div>
            </motion.header>

            <motion.div
              className="relative flex min-h-0 flex-1 w-full max-w-lg flex-col items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: FADE_IN_MS / 1000, delay: 0.12, ease: FADE_EASE }}
            >
              <div className="relative w-[min(88vw,28rem)] origin-center scale-[1.35] sm:w-[30rem] sm:scale-[1.4]">
                <Image
                  src={getAssetPath('/HoldHandCharacter.png')}
                  alt=""
                  width={640}
                  height={640}
                  priority
                  className="h-auto w-full object-contain"
                  style={{ maxHeight: 'min(52vh, 28rem)' }}
                />
              </div>
            </motion.div>

            <motion.footer
              className="shrink-0 pb-2 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: FADE_IN_MS / 1000, delay: 0.24, ease: FADE_EASE }}
            >
              <p className="inline-block rounded-full border-4 border-[#2b221a] bg-white/95 px-8 py-3 text-sm font-black text-[#2b221a] shadow-[0_7px_0_#2b221a] sm:px-10 sm:py-3.5 sm:text-lg">
                {copy.hint}
              </p>
            </motion.footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
