'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Sparkles,
  Zap,
  MessageCircle,
  Users,
  ChevronRight,
  type LucideIcon,
  Car,
  Coffee,
  Briefcase,
  Handshake,
  Gamepad2,
  Mic,
} from 'lucide-react';

export type FreeplayScenario = {
  id: string;
  title: string;
  description: string;
  target_group?: string;
  characters?: { name?: string; role?: string; personality?: string }[];
};

type BoothTheme = {
  Icon: LucideIcon;
  emoji: string;
  scene: string;
  tagline: string;
  gradient: string;
  booth: string;
  glow: string;
  sticker: string;
};

const getBoothTheme = (scenario: FreeplayScenario, index: number): BoothTheme => {
  const title = scenario.title.toLowerCase();

  if (title.includes('รถ') || title.includes('car') || title.includes('มือสอง')) {
    return {
      Icon: Car,
      emoji: '🚗',
      scene: 'เต็นท์รถมือสอง',
      tagline: 'ต่อรองราคาให้คุ้ม!',
      gradient: 'from-amber-300 via-orange-200 to-yellow-100',
      booth: 'bg-amber-400',
      glow: 'shadow-[0_0_40px_rgba(251,191,36,0.55)]',
      sticker: 'bg-amber-500',
    };
  }
  if (title.includes('กาแฟ') || title.includes('coffee') || title.includes('คาเฟ่')) {
    return {
      Icon: Coffee,
      emoji: '☕',
      scene: 'ร้านกาแฟยอดฮิต',
      tagline: 'คุยให้ได้ดีลพิเศษ!',
      gradient: 'from-stone-300 via-amber-100 to-orange-50',
      booth: 'bg-stone-400',
      glow: 'shadow-[0_0_40px_rgba(168,162,158,0.5)]',
      sticker: 'bg-stone-600',
    };
  }
  if (title.includes('เงิน') || title.includes('salary') || title.includes('เดือน')) {
    return {
      Icon: Briefcase,
      emoji: '💼',
      scene: 'ห้องประชุม HR',
      tagline: 'เจรจาให้ได้ใจทั้งสองฝ่าย',
      gradient: 'from-slate-300 via-blue-100 to-indigo-50',
      booth: 'bg-slate-500',
      glow: 'shadow-[0_0_40px_rgba(100,116,139,0.45)]',
      sticker: 'bg-slate-600',
    };
  }

  const defaults: BoothTheme[] = [
    {
      Icon: Handshake,
      emoji: '🤝',
      scene: 'โต๊ะเจรจาเปิด',
      tagline: 'ลองทักษะของคุณเลย!',
      gradient: 'from-emerald-300 via-teal-100 to-cyan-50',
      booth: 'bg-emerald-500',
      glow: 'shadow-[0_0_40px_rgba(52,211,153,0.5)]',
      sticker: 'bg-emerald-600',
    },
    {
      Icon: MessageCircle,
      emoji: '💬',
      scene: 'สนามฝึกคำพูด',
      tagline: 'พิมพ์อิสระ ไม่มีสคริปต์!',
      gradient: 'from-sky-300 via-blue-100 to-indigo-50',
      booth: 'bg-sky-500',
      glow: 'shadow-[0_0_40px_rgba(56,189,248,0.5)]',
      sticker: 'bg-sky-600',
    },
    {
      Icon: Briefcase,
      emoji: '🎯',
      scene: 'ด่านทักษะพิเศษ',
      tagline: 'เน้นฝึกจริง ไม่กดดันคะแนน',
      gradient: 'from-violet-300 via-purple-100 to-fuchsia-50',
      booth: 'bg-violet-500',
      glow: 'shadow-[0_0_40px_rgba(139,92,246,0.45)]',
      sticker: 'bg-violet-600',
    },
  ];
  return defaults[index % defaults.length];
};

type FreeplayArenaProps = {
  scenarios: FreeplayScenario[];
  onStart: (scenarioId: string) => void;
  loading?: boolean;
};

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
  const theme = selected ? getBoothTheme(selected, Math.max(0, selectedIndex)) : null;
  const BoothIcon = theme?.Icon ?? Gamepad2;

  return (
    <div className="mb-12 space-y-8 pb-24 xl:pb-0">
      {/* Arena header */}
      <div className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-[#2b221a] bg-[#0f172a] p-6 sm:p-8 shadow-[0_14px_0_#2b221a]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(248,204,0,0.25),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(0,135,229,0.3),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(237,71,162,0.2),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border-[3px] border-[#2b221a] bg-nintendo-yellow px-4 py-1.5 text-[11px] font-black uppercase tracking-wider text-gray-900 shadow-[0_4px_0_#2b221a]">
              <Gamepad2 size={14} strokeWidth={3} />
              Freeplay Arena
            </div>
            <h2 className="text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl">
              สนามฝึกเจรจา
              <span className="block text-nintendo-yellow">แบบอิสระ!</span>
            </h2>
            <p className="mt-3 text-sm font-bold leading-relaxed text-sky-100/90 sm:text-base">
              เลือกบูธด้านล่าง ดูฉากและคู่เจรจา แล้วกดเริ่ม — พิมพ์คำพูดได้อิสระ ไม่มีด่านล็อก
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-3">
            {[
              { icon: <Mic size={18} />, label: 'พิมพ์อิสระ' },
              { icon: <Zap size={18} />, label: 'ไม่ล็อกด่าน' },
              { icon: <Sparkles size={18} />, label: 'ฝึกซ้ำได้' },
            ].map((pill) => (
              <span
                key={pill.label}
                className="flex items-center gap-2 rounded-2xl border-[3px] border-white/20 bg-white/10 px-4 py-2 text-xs font-black text-white backdrop-blur-sm"
              >
                {pill.icon}
                {pill.label}
              </span>
            ))}
          </div>
        </div>

        {/* Floating deco */}
        <motion.span
          animate={{ y: [0, -8, 0], rotate: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 3.2 }}
          className="pointer-events-none absolute right-6 top-6 hidden text-5xl sm:block"
        >
          🎮
        </motion.span>
        <motion.span
          animate={{ y: [0, 6, 0], rotate: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.8, delay: 0.4 }}
          className="pointer-events-none absolute bottom-4 right-24 hidden text-3xl sm:block"
        >
          ⭐
        </motion.span>
      </div>

      {/* Main stage + booth picker */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_320px]">
        {/* Spotlight stage */}
        <AnimatePresence mode="wait">
          {selected && theme && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              className={`relative overflow-hidden rounded-[2.5rem] border-[6px] border-[#2b221a] bg-gradient-to-br ${theme.gradient} shadow-[0_16px_0_#2b221a] ${theme.glow}`}
            >
              {/* Comic burst */}
              <div className="pointer-events-none absolute -right-4 top-6 z-20 rotate-12">
                <div className={`${theme.sticker} flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#2b221a] text-center text-[10px] font-black uppercase leading-tight text-white shadow-[0_6px_0_#2b221a]`}>
                  ฝึก
                  <br />
                  ได้!
                </div>
              </div>

              <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-2">
                {/* Scene art */}
                <div className="relative flex flex-col items-center justify-center p-8 md:p-10">
                  <div className="absolute inset-4 rounded-[2rem] border-4 border-dashed border-[#2b221a]/15" />
                  <motion.div
                    animate={{ scale: [1, 1.06, 1], rotate: [0, 2, -2, 0] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="relative z-10 text-[7rem] leading-none drop-shadow-[0_8px_0_rgba(0,0,0,0.15)] sm:text-[8rem]"
                  >
                    {theme.emoji}
                  </motion.div>
                  <p className="relative z-10 mt-2 rounded-full border-[3px] border-[#2b221a] bg-white/90 px-4 py-1 text-xs font-black uppercase tracking-wider text-gray-800 shadow-[0_4px_0_#2b221a]">
                    {theme.scene}
                  </p>
                  <p className="relative z-10 mt-3 text-center text-lg font-black text-gray-900">
                    {theme.tagline}
                  </p>
                </div>

                {/* Briefing panel */}
                <div className="flex flex-col justify-between border-t-[5px] border-[#2b221a] bg-[#fffdf8]/95 p-6 md:border-l-[5px] md:border-t-0 md:p-8">
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-[#2b221a] ${theme.booth} text-white shadow-[0_4px_0_#2b221a]`}>
                        <BoothIcon size={20} strokeWidth={2.5} />
                      </span>
                      <span className="rounded-lg border-2 border-[#2b221a] bg-nintendo-green px-2 py-0.5 text-[9px] font-black uppercase text-white">
                        เปิดเล่นได้ทันที
                      </span>
                    </div>

                    <h3 className="text-2xl font-black leading-tight text-gray-900 sm:text-3xl">
                      {selected.title.replace(/^เล่นอิสระ:\s*/i, '')}
                    </h3>

                    <div className="relative mt-4">
                      <div className="absolute -left-2 top-4 h-0 w-0 border-y-[10px] border-r-[14px] border-y-transparent border-r-[#2b221a]" />
                      <div className="rounded-2xl border-[4px] border-[#2b221a] bg-white p-4 shadow-[0_6px_0_#2b221a]">
                        <p className="text-sm font-bold leading-relaxed text-gray-700">
                          {selected.description}
                        </p>
                      </div>
                    </div>

                    {/* Characters */}
                    <div className="mt-5">
                      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                        <Users size={12} />
                        คู่เจรจาในฉากนี้
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selected.characters?.map((char, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-xl border-[3px] border-[#2b221a] bg-nintendo-yellow/30 px-3 py-2 shadow-[0_3px_0_#2b221a]"
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#2b221a] bg-white text-sm font-black">
                              {char.name?.charAt(0) ?? '?'}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-gray-900">{char.name}</p>
                              <p className="truncate text-[9px] font-bold text-gray-600">{char.role}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98, y: 4 }}
                    disabled={loading}
                    onClick={() => onStart(selected.id)}
                    className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl border-[5px] border-[#2b221a] bg-nintendo-red py-4 text-lg font-black uppercase tracking-wide text-white shadow-[0_8px_0_#2b221a] transition-colors hover:bg-red-500 disabled:opacity-60"
                  >
                    <Play size={22} className="fill-current" />
                    เริ่มฝึกเลย!
                    <ChevronRight size={22} strokeWidth={3} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Booth picker — vertical arcade cabinets */}
        <div className="flex flex-col gap-3">
          <p className="text-center text-xs font-black uppercase tracking-widest text-gray-600 xl:text-left">
            เลือกบูธฝึก
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 xl:flex-col xl:overflow-visible xl:pb-0 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#2b221a]/30">
            {scenarios.map((scenario, index) => {
              const booth = getBoothTheme(scenario, index);
              const BoothIco = booth.Icon;
              const isActive = selected?.id === scenario.id;
              const shortTitle = scenario.title.replace(/^เล่นอิสระ:\s*/i, '');

              return (
                <motion.button
                  key={scenario.id}
                  type="button"
                  onClick={() => setSelectedId(scenario.id)}
                  whileHover={{ scale: 1.03, x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  className={`relative flex min-w-[140px] shrink-0 flex-col items-center rounded-[1.75rem] border-[5px] p-4 text-left transition-all xl:min-w-0 xl:flex-row xl:gap-3 xl:p-3 ${
                    isActive
                      ? `border-[#2b221a] ${booth.booth} text-white shadow-[0_8px_0_#2b221a] ${booth.glow}`
                      : 'border-[#2b221a]/40 bg-white text-gray-900 shadow-[0_5px_0_#2b221a]/40 hover:border-[#2b221a]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="freeplay-booth-glow"
                      className="pointer-events-none absolute -inset-1 rounded-[2rem] border-2 border-dashed border-white/50"
                    />
                  )}
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[3px] text-3xl ${
                      isActive ? 'border-white/40 bg-white/20' : 'border-[#2b221a] bg-white'
                    }`}
                  >
                    {booth.emoji}
                  </span>
                  <div className="mt-2 min-w-0 flex-1 xl:mt-0">
                    <p className={`line-clamp-2 text-sm font-black leading-tight ${isActive ? 'text-white' : 'text-gray-900'}`}>
                      {shortTitle}
                    </p>
                    <p className={`mt-0.5 flex items-center gap-1 text-[9px] font-bold uppercase ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                      <BoothIco size={10} />
                      {booth.scene}
                    </p>
                  </div>
                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#2b221a] bg-nintendo-yellow text-[10px] font-black text-gray-900"
                    >
                      ✓
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quick-start strip for mobile */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 left-4 right-4 z-40 xl:hidden"
        >
          <button
            type="button"
            disabled={loading}
            onClick={() => onStart(selected.id)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-[4px] border-[#2b221a] bg-nintendo-red py-3.5 font-black text-white shadow-[0_6px_0_#2b221a] active:translate-y-1 active:shadow-none disabled:opacity-60"
          >
            <Play size={18} className="fill-current" />
            เริ่ม: {selected.title.replace(/^เล่นอิสระ:\s*/i, '').slice(0, 24)}
            {(selected.title.length > 28) && '…'}
          </button>
        </motion.div>
      )}
    </div>
  );
}
