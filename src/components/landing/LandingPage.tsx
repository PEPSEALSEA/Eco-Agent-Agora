'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, LogIn, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { NegotiationOrb } from './NegotiationOrb';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-agora-deep text-agora-cream selection:bg-agora-teal/30">
      {/* Organic background mesh */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 15% 20%, rgba(45, 212, 191, 0.18) 0%, transparent 55%),
            radial-gradient(ellipse 70% 50% at 85% 75%, rgba(212, 168, 83, 0.14) 0%, transparent 50%),
            radial-gradient(ellipse 100% 80% at 50% 100%, rgba(19, 78, 74, 0.55) 0%, transparent 60%),
            linear-gradient(165deg, #0a2e2a 0%, #0f3d38 42%, #0a2522 100%)
          `,
        }}
      />

      {/* Floating organic blobs */}
      <motion.div
        className="pointer-events-none absolute -left-[20%] top-[18%] h-[45vh] w-[55vw] rounded-[60%_40%_55%_45%] bg-agora-teal/10 blur-3xl"
        animate={{ x: [0, 24, 0], y: [0, -18, 0], rotate: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 18, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -right-[15%] bottom-[10%] h-[40vh] w-[50vw] rounded-[45%_55%_40%_60%] bg-agora-gold/10 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 14, 0], rotate: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 22, ease: 'easeInOut' }}
      />

      {/* Subtle grid arc — agora floor */}
      <div
        className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2 w-[140vmax] h-[70vmax] rounded-[100%] border border-agora-cream/5 opacity-40"
        style={{ marginBottom: '-52vmax' }}
      />

      <div className="relative z-10 flex min-h-screen flex-col px-5 pb-10 pt-8 sm:px-8 sm:pt-12">
        {/* Top auth shortcut */}
        <motion.nav
          className="flex justify-end"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: {} }}
        >
          <motion.div custom={0} variants={fadeUp}>
            {!loading && (
              user ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-agora-cream/20 bg-agora-forest/50 px-4 py-2 text-sm font-bold text-agora-cream/90 backdrop-blur-sm transition hover:border-agora-teal/50 hover:bg-agora-forest/80"
                >
                  <User size={16} className="text-agora-teal" />
                  โปรไฟล์
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-agora-cream/20 bg-agora-forest/50 px-4 py-2 text-sm font-bold text-agora-cream/90 backdrop-blur-sm transition hover:border-agora-gold/50"
                >
                  <LogIn size={16} className="text-agora-gold" />
                  เข้าสู่ระบบ
                </Link>
              )
            )}
          </motion.div>
        </motion.nav>

        {/* Title — top center */}
        <motion.header
          className="mt-4 flex flex-col items-center text-center sm:mt-2"
          initial="hidden"
          animate="visible"
        >
          <motion.p
            custom={0.1}
            variants={fadeUp}
            className="mb-2 text-[10px] font-black uppercase tracking-[0.35em] text-agora-teal sm:text-xs"
          >
            Eco-Agent Agora
          </motion.p>
          <motion.h1
            custom={0.18}
            variants={fadeUp}
            className="font-black tracking-tight text-agora-cream"
            style={{
              fontSize: 'clamp(2.75rem, 10vw, 4.5rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
            }}
          >
            WongJraJa
          </motion.h1>
          <motion.p
            custom={0.26}
            variants={fadeUp}
            className="mt-3 max-w-md text-sm font-medium text-agora-cream/65 sm:text-base"
          >
            วงเจรจาอัจฉริยะ — ฝึกทักษะเจรจาผ่านตัวแทน AI หลายมุมมอง
          </motion.p>
          <motion.div
            custom={0.32}
            variants={fadeUp}
            className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-agora-gold/60 to-transparent"
          />
        </motion.header>

        {/* Center orb */}
        <main className="flex flex-1 flex-col items-center justify-center py-6 sm:py-10">
          <NegotiationOrb />
        </main>

        {/* CTA */}
        <motion.footer
          className="flex flex-col items-center gap-5 pb-6"
          initial="hidden"
          animate="visible"
        >
          <motion.div custom={0.55} variants={fadeUp} className="relative">
            <div className="absolute -inset-3 rounded-full bg-agora-teal/20 blur-xl landing-pulse-ring" />
            <Link
              href="/scenarios"
              className="group relative flex items-center gap-3 rounded-full border-2 border-agora-cream/30 bg-gradient-to-r from-agora-forest to-agora-deep px-10 py-4 text-base font-black text-agora-cream shadow-[0_0_40px_rgba(45,212,191,0.2)] transition hover:border-agora-teal hover:shadow-[0_0_50px_rgba(45,212,191,0.35)] sm:px-12 sm:py-5 sm:text-lg"
            >
              <span>เข้าสู่วงเจรจา</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-agora-teal/20 transition group-hover:bg-agora-teal group-hover:text-agora-deep">
                <ArrowRight size={20} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </motion.div>

          <motion.p
            custom={0.62}
            variants={fadeUp}
            className="max-w-xs text-center text-[11px] font-medium leading-relaxed text-agora-cream/45 sm:max-w-sm sm:text-xs"
          >
            เลือกสถานการณ์ · ฝึกกับเอเจนต์หลายบทบาท · รับข้อมูลสรุปหลังเจรจา
          </motion.p>
        </motion.footer>
      </div>
    </div>
  );
}
