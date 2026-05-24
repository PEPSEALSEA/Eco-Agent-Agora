'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getAssetPath } from '@/lib/gas';

export function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const enterApp = () => {
    router.push('/scenarios');
  };

  return (
    <button
      type="button"
      onClick={enterApp}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          enterApp();
        }
      }}
      className="landing-scene relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden cursor-pointer border-0 p-0 text-left outline-none focus-visible:ring-4 focus-visible:ring-[#2b221a]/30"
      aria-label="WongJraJa — แตะเพื่อเข้าสู่แอป"
    >
      {/* Dimensional teal atmosphere (not flat linear) */}
      <div className="landing-atmosphere pointer-events-none absolute inset-0" aria-hidden />

      {/* Neubrutal dot texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: 'radial-gradient(#2b221a 2px, transparent 2px)',
          backgroundSize: '28px 28px',
        }}
        aria-hidden
      />

      {/* Corner stickers */}
      <div
        className="pointer-events-none absolute left-4 top-[18%] hidden h-14 w-14 rotate-12 rounded-2xl border-4 border-[#2b221a] bg-nintendo-yellow shadow-[0_6px_0_#2b221a] sm:block"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-5 bottom-[22%] hidden h-10 w-10 -rotate-6 rounded-full border-4 border-[#2b221a] bg-white shadow-[0_5px_0_#2b221a] sm:block"
        aria-hidden
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-between px-4 py-5 sm:px-6 sm:py-7">
        {/* Title plaque */}
        <motion.header
          className="shrink-0 pt-1 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="inline-block -rotate-1 rounded-[1.75rem] border-[5px] border-[#2b221a] bg-white px-8 py-3 shadow-[0_8px_0_#2b221a] sm:px-10 sm:py-4">
            <h1
              className="font-black uppercase tracking-tight text-[#2b221a]"
              style={{ fontSize: 'clamp(2rem, 8vw, 3.25rem)', lineHeight: 1.05 }}
            >
              WongJraJa
            </h1>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] text-[#4eb9a7] sm:text-xs">
              วงเจรจา
            </p>
          </div>
        </motion.header>

        {/* Hero character — plain PNG */}
        <motion.div
          className="relative flex min-h-0 flex-1 w-full max-w-lg flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="relative w-[min(90vw,26rem)] origin-center scale-[2.0] sm:w-[28rem]"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
          >
            <Image
              src={getAssetPath('/HoldHandCharacter.png')}
              alt="ตัวละครจับมือ — สัญลักษณ์การเจรจา"
              width={512}
              height={512}
              priority
              className="h-auto w-full object-contain"
              style={{ maxHeight: 'min(52vh, 26rem)' }}
            />
          </motion.div>
        </motion.div>

        {/* Tap hint — not a separate button */}
        <motion.footer
          className="shrink-0 pb-1 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
        >
          <motion.p
            className="inline-block rounded-full border-[3px] border-[#2b221a] bg-white/90 px-5 py-2 text-xs font-black text-[#2b221a] shadow-[0_5px_0_#2b221a] sm:text-sm"
            animate={{ y: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          >
            แตะที่ใดก็ได้เพื่อเริ่ม
          </motion.p>
        </motion.footer>
      </div>
    </button>
  );
}
