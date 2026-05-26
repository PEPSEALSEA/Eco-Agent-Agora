'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Sparkles,
  Mic,
  Repeat,
  Users,
  ChevronRight,
  Ticket,
  type LucideIcon,
  Car,
  Coffee,
  Briefcase,
  Handshake,
  MessageCircle,
  Gamepad2,
} from 'lucide-react';

export type FreeplayScenario = {
  id: string;
  title: string;
  description: string;
  target_group?: string;
  characters?: { name?: string; role?: string; personality?: string }[];
};

type StageTheme = {
  Icon: LucideIcon;
  emoji: string;
  venue: string;
  hook: string;
  ticketColor: string;
  stageBg: string;
  curtain: string;
  stamp: string;
  pattern: string;
};

const STAGE_THEMES: StageTheme[] = [
  {
    Icon: Handshake,
    emoji: '🤝',
    venue: 'โต๊ะเจรจาเปิด',
    hook: 'ลองประโยคของคุณเอง!',
    ticketColor: 'bg-emerald-400',
    stageBg: 'from-[#d4f5e4] via-[#f0fdf4] to-[#ecfdf5]',
    curtain: 'from-[#b91c1c] via-[#dc2626] to-[#991b1b]',
    stamp: 'bg-emerald-600',
    pattern: '[background-image:radial-gradient(#059669_1.5px,transparent_1.5px)] [background-size:14px_14px]',
  },
  {
    Icon: MessageCircle,
    emoji: '💬',
    venue: 'สนามคำพูด',
    hook: 'ไม่มีสคริปต์ ไม่มีด่านล็อก',
    ticketColor: 'bg-sky-400',
    stageBg: 'from-[#bae6fd] via-[#e0f2fe] to-[#f0f9ff]',
    curtain: 'from-[#1d4ed8] via-[#2563eb] to-[#1e40af]',
    stamp: 'bg-sky-600',
    pattern: '[background-image:radial-gradient(#0284c7_1.5px,transparent_1.5px)] [background-size:12px_12px]',
  },
  {
    Icon: Briefcase,
    emoji: '🎯',
    venue: 'ห้องซ้อมทักษะ',
    hook: 'เน้นฝึกจริง ไม่กดดันคะแนน',
    ticketColor: 'bg-violet-400',
    stageBg: 'from-[#ddd6fe] via-[#ede9fe] to-[#f5f3ff]',
    curtain: 'from-[#6d28d9] via-[#7c3aed] to-[#5b21b6]',
    stamp: 'bg-violet-600',
    pattern: '[background-image:radial-gradient(#7c3aed_1.2px,transparent_1.2px)] [background-size:16px_16px]',
  },
];

const getStageTheme = (scenario: FreeplayScenario, index: number): StageTheme => {
  const t = scenario.title.toLowerCase();

  if (t.includes('รถ') || t.includes('car') || t.includes('มือสอง')) {
    return {
      Icon: Car,
      emoji: '🚗',
      venue: 'เต็นท์รถมือสอง',
      hook: 'ต่อรองให้ได้ราคาที่ใจอยากได้!',
      ticketColor: 'bg-amber-400',
      stageBg: 'from-[#fde68a] via-[#fef3c7] to-[#fffbeb]',
      curtain: 'from-[#c2410c] via-[#ea580c] to-[#9a3412]',
      stamp: 'bg-amber-600',
      pattern: '[background-image:repeating-linear-gradient(-45deg,transparent,transparent_8px,rgba(217,119,6,0.08)_8px,rgba(217,119,6,0.08)_16px)]',
    };
  }
  if (t.includes('กาแฟ') || t.includes('coffee') || t.includes('คาเฟ่')) {
    return {
      Icon: Coffee,
      emoji: '☕',
      venue: 'ร้านกาแฟยอดฮิต',
      hook: 'คุยให้ได้ดีลพิเศษ!',
      ticketColor: 'bg-stone-400',
      stageBg: 'from-[#d6d3d1] via-[#f5f5f4] to-[#fafaf9]',
      curtain: 'from-[#78350f] via-[#92400e] to-[#451a03]',
      stamp: 'bg-stone-600',
      pattern: '[background-image:radial-gradient(#78716c_1px,transparent_1px)] [background-size:10px_10px]',
    };
  }

  return STAGE_THEMES[index % STAGE_THEMES.length];
};

const cleanTitle = (title: string) =>
  title.replace(/^เล่นอิสระ:\s*/i, '').trim();

type FreeplayArenaProps = {
  scenarios: FreeplayScenario[];
  onStart: (scenarioId: string) => void;
  loading?: boolean;
};

function MarqueeLights() {
  return (
    <div className="flex justify-center gap-1.5 sm:gap-2" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.span
          key={i}
          className="h-2.5 w-2.5 rounded-full border-2 border-[#2b221a] sm:h-3 sm:w-3"
          animate={{
            backgroundColor: ['#f8cc00', '#e60012', '#00aa4b', '#0087e5', '#f8cc00'],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.12,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function StageCurtains({ curtain }: { curtain: string }) {
  return (
    <>
      <div
        className={`pointer-events-none absolute left-0 top-0 z-10 h-full w-[18%] bg-gradient-to-r ${curtain} opacity-95`}
        style={{
          clipPath: 'polygon(0 0, 100% 0, 72% 100%, 0 100%)',
          boxShadow: 'inset -8px 0 20px rgba(0,0,0,0.25)',
        }}
      />
      <div
        className={`pointer-events-none absolute right-0 top-0 z-10 h-full w-[18%] bg-gradient-to-l ${curtain} opacity-95`}
        style={{
          clipPath: 'polygon(28% 0, 100% 0, 100% 100%, 0 100%)',
          boxShadow: 'inset 8px 0 20px rgba(0,0,0,0.25)',
        }}
      />
      <div className="pointer-events-none absolute left-[16%] right-[16%] top-0 z-20 flex justify-center">
        <div className="rounded-b-3xl border-x-[5px] border-b-[5px] border-[#2b221a] bg-nintendo-yellow px-8 py-2 shadow-[0_6px_0_#2b221a]">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 sm:text-xs">
            ● กำลังถ่ายทอดสด ●
          </p>
        </div>
      </div>
    </>
  );
}

export function FreeplayArena({ scenarios, onStart, loading }: FreeplayArenaProps) {
  const [selectedId, setSelectedId] = useState<string | null>(scenarios[0]?.id ?? null);

  useEffect(() => {
    setSelectedId((prev) => {
      if (scenarios.length === 0) return null;
      if (prev && scenarios.some((s) => s.id === prev)) return prev;
      return scenarios[0].id;
    });
  }, [scenarios]);

  const selected = scenarios.find((s) => s.id === selectedId) ?? scenarios[0];
  const selectedIndex = selected ? scenarios.findIndex((s) => s.id === selected.id) : 0;
  const theme = selected ? getStageTheme(selected, Math.max(0, selectedIndex)) : null;
  const StageIcon = theme?.Icon ?? Gamepad2;

  return (
    <div className="relative mb-12 space-y-6 sm:space-y-8">
      {/* Marquee sign */}
      <header className="relative -rotate-1">
        <div className="rounded-[2rem] border-[6px] border-[#2b221a] bg-[#fffdf9] px-5 py-6 shadow-[0_12px_0_#2b221a] sm:px-8 sm:py-8">
          <MarqueeLights />
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#b45309]">
                <Gamepad2 size={14} strokeWidth={3} />
                โซนฝึกอิสระ
              </p>
              <h2 className="text-[2rem] font-black leading-[0.95] tracking-tight text-gray-900 sm:text-5xl">
                ลานเกมโชว์
                <span className="block text-nintendo-blue">เจรจา!</span>
              </h2>
              <p className="mt-3 max-w-lg text-sm font-bold leading-relaxed text-gray-600">
                เลือกตั๋วฉากด้านล่าง ขึ้นเวที แล้วพิมพ์คำพูดของคุณเอง — เหมือนเข้ารายการจริง ไม่ใช่การ์ดท่องจำ
              </p>
            </div>
            <ul className="flex flex-wrap gap-2 sm:max-w-xs sm:justify-end">
              {[
                { icon: Mic, text: 'พิมพ์อิสระ', bg: 'bg-nintendo-pink' },
                { icon: Repeat, text: 'เล่นซ้ำได้', bg: 'bg-nintendo-green' },
                { icon: Sparkles, text: 'ไม่ล็อกด่าน', bg: 'bg-nintendo-yellow' },
              ].map(({ icon: Icon, text, bg }) => (
                <li
                  key={text}
                  className={`flex items-center gap-2 rounded-2xl border-[3px] border-[#2b221a] ${bg} px-3 py-2 text-[11px] font-black text-gray-900 shadow-[0_4px_0_#2b221a]`}
                >
                  <Icon size={14} strokeWidth={3} />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className="pointer-events-none absolute -right-2 -top-3 rotate-12 rounded-lg border-[3px] border-[#2b221a] bg-nintendo-red px-3 py-1 text-[10px] font-black uppercase text-white shadow-[0_4px_0_#2b221a]"
          aria-hidden
        >
          LIVE
        </div>
      </header>

      {/* Ticket picker */}
      <section aria-label="เลือกฉากฝึก">
        <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-700">
          <Ticket size={16} strokeWidth={3} className="text-[#b45309]" />
          เลือกตั๋วเข้าเวที
        </p>
        <div className="flex gap-4 overflow-x-auto pb-3 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible">
          {scenarios.map((scenario, index) => {
            const t = getStageTheme(scenario, index);
            const isActive = selected?.id === scenario.id;
            const label = cleanTitle(scenario.title);

            return (
              <motion.button
                key={scenario.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => setSelectedId(scenario.id)}
                whileHover={{ y: -4, rotate: isActive ? -2 : 1 }}
                whileTap={{ scale: 0.97 }}
                className={`group relative flex min-w-[148px] shrink-0 flex-col text-left sm:min-w-[160px] ${
                  isActive ? 'z-10' : 'opacity-90 hover:opacity-100'
                }`}
              >
                {/* Perforated ticket top */}
                <div
                  className={`relative rounded-t-2xl border-[4px] border-b-0 border-[#2b221a] px-3 pb-2 pt-3 ${t.ticketColor} shadow-[0_4px_0_#2b221a]`}
                >
                  <div
                    className="absolute -bottom-1 left-2 right-2 flex justify-between"
                    aria-hidden
                  >
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-[#fffdf9] border border-[#2b221a]/30"
                      />
                    ))}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-3xl leading-none drop-shadow-sm">{t.emoji}</span>
                    <span className="rounded-md border-2 border-[#2b221a] bg-white/90 px-1.5 py-0.5 text-[9px] font-black text-gray-800">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                </div>

                <div
                  className={`rounded-b-2xl border-[4px] border-[#2b221a] bg-[#fffdf9] px-3 py-3 shadow-[0_6px_0_#2b221a] transition-colors ${
                    isActive ? 'ring-4 ring-nintendo-yellow ring-offset-2 ring-offset-[#bae6fd]' : ''
                  }`}
                >
                  <p className="line-clamp-2 text-sm font-black leading-tight text-gray-900">
                    {label}
                  </p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                    {t.venue}
                  </p>
                </div>

                {isActive && (
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: -12 }}
                    className={`absolute -right-2 -top-2 z-20 rounded-lg border-[3px] border-[#2b221a] ${t.stamp} px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-[0_3px_0_#2b221a]`}
                  >
                    ON AIR
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Main stage */}
      <AnimatePresence mode="wait">
        {selected && theme && (
          <motion.section
            key={selected.id}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative overflow-x-hidden rounded-[2.5rem] border-[6px] border-[#2b221a] bg-[#fffdf9] shadow-[0_16px_0_#2b221a]"
            aria-label="เวทีฉากที่เลือก"
          >
            <StageCurtains curtain={theme.curtain} />

            <div
              className={`relative min-h-[440px] bg-gradient-to-b pb-2 ${theme.stageBg} ${theme.pattern}`}
            >
              <div className="relative z-[15] grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] lg:items-stretch">
                {/* Puppet / character side */}
                <div className="flex flex-col items-center justify-end px-6 pb-8 pt-16 lg:pt-20">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                    className="relative"
                  >
                    <div className="absolute -inset-4 rounded-full bg-white/40 blur-2xl" />
                    <div className="relative rounded-[3rem] border-[5px] border-[#2b221a] bg-white px-8 py-6 shadow-[0_10px_0_#2b221a]">
                      <span className="block text-center text-[5.5rem] leading-none sm:text-[6.5rem]">
                        {theme.emoji}
                      </span>
                    </div>
                    <div className="absolute -bottom-3 left-1/2 h-4 w-[85%] -translate-x-1/2 rounded-[100%] bg-black/15 blur-sm" />
                  </motion.div>

                  <p className="mt-6 rounded-full border-[3px] border-[#2b221a] bg-white px-5 py-1.5 text-sm font-black text-gray-900 shadow-[0_4px_0_#2b221a]">
                    {theme.hook}
                  </p>
                </div>

                {/* Script / briefing side */}
                <div className="relative z-[15] flex min-h-0 flex-col gap-6 border-t-[5px] border-[#2b221a] bg-[#fffdf8]/95 p-6 pb-8 sm:p-8 sm:pb-10 lg:border-l-[5px] lg:border-t-0">
                  <div className="min-h-0 flex flex-col gap-5">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-[#2b221a] ${theme.ticketColor} text-gray-900 shadow-[0_4px_0_#2b221a]`}
                      >
                        <StageIcon size={22} strokeWidth={2.5} />
                      </span>
                      <span className="rounded-lg border-2 border-[#2b221a] bg-nintendo-green px-2.5 py-1 text-[10px] font-black uppercase text-white">
                        เปิดเล่นได้ทันที
                      </span>
                      <span className="rounded-lg border-2 border-dashed border-[#2b221a]/40 bg-amber-50 px-2.5 py-1 text-[10px] font-black text-amber-900">
                        {theme.venue}
                      </span>
                    </div>

                    <h3 className="text-2xl font-black leading-tight text-gray-900 sm:text-[1.75rem]">
                      {cleanTitle(selected.title)}
                    </h3>

                    {/* Pinned note — not a flashcard */}
                    <div className="relative mt-5 rotate-1">
                      <div
                        className="absolute -top-3 left-1/2 z-10 h-8 w-14 -translate-x-1/2 rounded-sm bg-[#cedf9f]/90 border border-[#2b221a]/25 shadow-sm"
                        aria-hidden
                      />
                      <div className="rounded-sm border-[3px] border-[#2b221a] bg-[#fef9c3] p-4 shadow-[4px_4px_0_#2b221a]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-900/70">
                          โน้ตผู้จัดรายการ
                        </p>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-gray-800">
                          {selected.description}
                        </p>
                      </div>
                    </div>

                    {selected.characters && selected.characters.length > 0 && (
                      <div className="mt-1 pb-2">
                        <p className="mb-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                          <Users size={12} strokeWidth={3} />
                          ตัวละครในรายการนี้
                        </p>
                        <ul className="flex flex-col gap-4">
                          {selected.characters.map((char, i) => (
                            <li key={i} className="list-none">
                              <div className="flex items-start gap-3 rounded-2xl border-[3px] border-[#2b221a] bg-white p-3.5 shadow-[0_4px_0_#2b221a]">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[3px] border-[#2b221a] bg-nintendo-yellow text-lg font-black">
                                  {char.name?.charAt(0) ?? '?'}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-black leading-snug text-gray-900 break-words">
                                    {char.name}
                                  </p>
                                  <p className="mt-1 text-[11px] font-bold leading-relaxed text-gray-600 break-words">
                                    {char.role}
                                    {char.personality ? (
                                      <>
                                        <span className="text-gray-400"> · </span>
                                        {char.personality}
                                      </>
                                    ) : null}
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <motion.button
                    type="button"
                    disabled={loading}
                    onClick={() => onStart(selected.id)}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98, y: 3 }}
                    className="group mt-2 shrink-0 flex w-full items-center justify-between gap-3 rounded-2xl border-[5px] border-[#2b221a] bg-nintendo-red py-4 pl-5 pr-4 text-left font-black text-white shadow-[0_8px_0_#2b221a] transition-colors hover:bg-red-500 disabled:opacity-60"
                  >
                    <span className="flex flex-col">
                      <span className="flex items-center gap-2 text-lg uppercase tracking-wide sm:text-xl">
                        <Play size={22} className="fill-current" />
                        ขึ้นเวทีเลย!
                      </span>
                      <span className="text-[11px] font-bold text-red-100">
                        แตะเพื่อเริ่มเจรจาสด
                      </span>
                    </span>
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-[3px] border-white/40 bg-white/15 group-hover:bg-white/25">
                      <ChevronRight size={26} strokeWidth={3} />
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
