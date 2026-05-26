'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Car,
  Coffee,
  Briefcase,
  Handshake,
  MessageCircle,
  Gamepad2,
  Play,
  Sparkles,
  Zap,
  Users,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';

type Scenario = {
  id: string;
  title: string;
  description: string;
  target_group: string;
  characters: { name?: string; role?: string; personality?: string }[];
  mode?: string;
};

type SessionRow = {
  scenario_id?: unknown;
  user_id?: unknown;
};

type FreeplayLobbyProps = {
  scenarios: Scenario[];
  sessions?: SessionRow[];
  userId?: string;
  onStart: (scenarioId: string) => void;
};

type ScenarioTheme = {
  Icon: LucideIcon;
  gradient: string;
  glow: string;
  accent: string;
  badge: string;
  emoji: string;
  tag: string;
};

const normalizeId = (value: unknown) => String(value ?? '').trim();

const getScenarioTheme = (scenario: Scenario, index: number): ScenarioTheme => {
  const title = scenario.title.toLowerCase();

  if (title.includes('รถ') || title.includes('car') || title.includes('มือสอง')) {
    return {
      Icon: Car,
      gradient: 'from-amber-400 via-orange-500 to-rose-500',
      glow: 'shadow-[0_0_40px_rgba(251,146,60,0.45)]',
      accent: 'text-amber-950',
      badge: 'bg-amber-200 text-amber-950',
      emoji: '🚗',
      tag: 'ต่อรองราคา',
    };
  }
  if (title.includes('กาแฟ') || title.includes('coffee') || title.includes('คาเฟ่')) {
    return {
      Icon: Coffee,
      gradient: 'from-stone-300 via-amber-200 to-orange-300',
      glow: 'shadow-[0_0_40px_rgba(180,83,9,0.35)]',
      accent: 'text-stone-900',
      badge: 'bg-stone-200 text-stone-900',
      emoji: '☕',
      tag: 'บริการ & ลูกค้า',
    };
  }
  if (title.includes('เงิน') || title.includes('salary') || title.includes('เดือน')) {
    return {
      Icon: Briefcase,
      gradient: 'from-slate-400 via-indigo-400 to-violet-500',
      glow: 'shadow-[0_0_40px_rgba(99,102,241,0.4)]',
      accent: 'text-slate-950',
      badge: 'bg-indigo-200 text-indigo-950',
      emoji: '💼',
      tag: 'ทำงาน & เงินเดือน',
    };
  }

  const defaults: ScenarioTheme[] = [
    {
      Icon: Handshake,
      gradient: 'from-emerald-400 via-teal-400 to-cyan-500',
      glow: 'shadow-[0_0_40px_rgba(52,211,153,0.4)]',
      accent: 'text-emerald-950',
      badge: 'bg-emerald-200 text-emerald-950',
      emoji: '🤝',
      tag: 'เจรจาทั่วไป',
    },
    {
      Icon: MessageCircle,
      gradient: 'from-sky-400 via-blue-500 to-indigo-500',
      glow: 'shadow-[0_0_40px_rgba(59,130,246,0.4)]',
      accent: 'text-sky-950',
      badge: 'bg-sky-200 text-sky-950',
      emoji: '💬',
      tag: 'สื่อสาร',
    },
    {
      Icon: Briefcase,
      gradient: 'from-violet-400 via-purple-500 to-fuchsia-500',
      glow: 'shadow-[0_0_40px_rgba(168,85,247,0.4)]',
      accent: 'text-violet-950',
      badge: 'bg-violet-200 text-violet-950',
      emoji: '🎯',
      tag: 'ทักษะขั้นสูง',
    },
  ];
  return defaults[index % defaults.length];
};

export function FreeplayLobby({ scenarios, sessions = [], userId, onStart }: FreeplayLobbyProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (scenarios.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !scenarios.some((s) => s.id === selectedId)) {
      setSelectedId(scenarios[0].id);
    }
  }, [scenarios, selectedId]);

  const playCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const uid = normalizeId(userId);
    for (const s of sessions) {
      if (uid && normalizeId(s.user_id) !== uid) continue;
      const sid = normalizeId(s.scenario_id);
      if (sid) counts[sid] = (counts[sid] ?? 0) + 1;
    }
    return counts;
  }, [sessions, userId]);

  const selected = scenarios.find((s) => s.id === selectedId) ?? scenarios[0] ?? null;
  const selectedIndex = selected ? scenarios.findIndex((s) => s.id === selected.id) : 0;
  const selectedTheme = selected ? getScenarioTheme(selected, Math.max(0, selectedIndex)) : null;

  if (scenarios.length === 0) return null;

  return (
    <div className="mb-12 space-y-8">
      {/* Arcade hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border-[6px] border-[#2b221a] bg-[#0f172a] p-6 sm:p-10 shadow-[0_14px_0_#2b221a]"
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 3px)',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-emerald-400/60 bg-emerald-500/20 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-300">
              <Gamepad2 size={14} />
              Freeplay Arena
            </div>
            <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
              ห้องฝึกเจรจา
              <span className="block bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
                ลองได้ทุกเทคนิค
              </span>
            </h2>
            <p className="mt-3 max-w-xl text-sm font-bold leading-relaxed text-slate-300 sm:text-base">
              ไม่มีด่านล็อก ไม่มีคะแนนผ่าน—เลือกสถานการณ์ที่อยากลอง อ่านบรีฟ แล้วกดเริ่มจำลองได้ทันที
            </p>
          </div>

          <div className="flex shrink-0 gap-3 sm:gap-4">
            {[
              { label: 'สถานการณ์', value: scenarios.length, icon: Sparkles },
              { label: 'พร้อมฝึก', value: '∞', icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="min-w-[5.5rem] rounded-2xl border-[3px] border-white/15 bg-white/5 px-4 py-3 text-center backdrop-blur-sm sm:min-w-[6.5rem]"
              >
                <Icon size={18} className="mx-auto mb-1 text-emerald-400" />
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_380px]">
        {/* Scenario pickers — arcade cabinets */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {scenarios.map((scenario, index) => {
            const theme = getScenarioTheme(scenario, index);
            const isSelected = selected?.id === scenario.id;
            const plays = playCounts[scenario.id] ?? 0;
            const Icon = theme.Icon;
            const isFeatured = index === 0 && scenarios.length > 1;

            return (
              <motion.button
                key={scenario.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => setSelectedId(scenario.id)}
                className={`group relative text-left outline-none ${
                  isFeatured ? 'sm:col-span-2' : ''
                }`}
              >
                <div
                  className={`relative flex h-full min-h-[200px] flex-col overflow-hidden rounded-[2rem] border-[5px] transition-all duration-300 ${
                    isSelected
                      ? `border-[#2b221a] bg-white ${theme.glow} scale-[1.02]`
                      : 'border-[#2b221a]/80 bg-[#fffdf9] hover:-translate-y-1 hover:border-[#2b221a] hover:shadow-[0_12px_0_#2b221a]'
                  } ${isFeatured ? 'sm:min-h-[220px] sm:flex-row' : ''}`}
                  style={{
                    boxShadow: isSelected
                      ? undefined
                      : '0 8px 0 #2b221a',
                  }}
                >
                  {/* Scene header */}
                  <div
                    className={`relative overflow-hidden bg-gradient-to-br ${theme.gradient} ${
                      isFeatured ? 'sm:w-[42%] sm:min-h-full' : 'h-28'
                    }`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_55%)]" />
                    <span className="absolute right-3 top-3 text-4xl opacity-90 drop-shadow-md sm:text-5xl">
                      {theme.emoji}
                    </span>
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border-[3px] border-black/20 bg-white/90 shadow-lg">
                        <Icon size={22} className={theme.accent} strokeWidth={2.5} />
                      </div>
                      <span className={`rounded-lg px-2 py-0.5 text-[10px] font-black uppercase ${theme.badge}`}>
                        {theme.tag}
                      </span>
                    </div>
                    {isSelected && (
                      <motion.div
                        layoutId="freeplay-selected-ring"
                        className="absolute inset-0 ring-4 ring-inset ring-white/50"
                      />
                    )}
                  </div>

                  {/* Body */}
                  <div className={`flex flex-1 flex-col p-4 sm:p-5 ${isFeatured ? 'sm:justify-center' : ''}`}>
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="text-lg font-black leading-snug text-gray-900 sm:text-xl">
                        {scenario.title.replace(/^เล่นอิสระ:\s*/i, '')}
                      </h3>
                      {plays > 0 && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-600">
                          ฝึกแล้ว {plays}×
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 flex-1 text-xs font-bold leading-relaxed text-gray-500 sm:text-sm">
                      {scenario.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-gray-200 pt-3">
                      <div className="flex -space-x-2">
                        {scenario.characters?.slice(0, 3).map((char, i) => (
                          <div
                            key={i}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#2b221a] bg-amber-100 text-xs font-black text-gray-900"
                            style={{ transform: `rotate(${i % 2 === 0 ? -6 : 6}deg)` }}
                          >
                            {char.name?.charAt(0) ?? '?'}
                          </div>
                        ))}
                        {(scenario.characters?.length ?? 0) > 3 && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-[#2b221a] bg-gray-200 text-[10px] font-black">
                            +{(scenario.characters?.length ?? 0) - 3}
                          </div>
                        )}
                      </div>
                      <span
                        className={`flex items-center gap-1 text-[11px] font-black uppercase transition-colors ${
                          isSelected ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-600'
                        }`}
                      >
                        {isSelected ? 'กำลังเลือก' : 'เลือก'}
                        <ChevronRight size={14} className={isSelected ? 'translate-x-0.5' : ''} />
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-emerald-400 to-cyan-400 sm:w-2" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Mission console — sticky briefing */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <AnimatePresence mode="wait">
            {selected && selectedTheme && (
              <motion.aside
                key={selected.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="overflow-hidden rounded-[2rem] border-[6px] border-[#2b221a] bg-[#fffdf9] shadow-[0_12px_0_#2b221a]"
              >
                <div className={`bg-gradient-to-br ${selectedTheme.gradient} px-6 py-5`}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">
                    Mission Brief
                  </p>
                  <h3 className="mt-1 text-2xl font-black leading-tight text-gray-900">
                    {selected.title.replace(/^เล่นอิสระ:\s*/i, '')}
                  </h3>
                  <span className="mt-2 inline-block rounded-lg border-2 border-black/20 bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase text-gray-800">
                    {selectedTheme.tag} · โหมดอิสระ
                  </span>
                </div>

                <div className="space-y-5 p-6">
                  <p className="text-sm font-bold leading-relaxed text-gray-600">
                    {selected.description}
                  </p>

                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-800">
                      <Users size={14} className="text-emerald-600" />
                      คู่เจรจาในฉาก
                    </h4>
                    <ul className="space-y-2">
                      {selected.characters?.map((char, i) => (
                        <li
                          key={i}
                          className="rounded-xl border-2 border-[#2b221a]/15 bg-[#f8faf6] px-3 py-2.5"
                        >
                          <p className="text-sm font-black text-gray-900">{char.name}</p>
                          <p className="text-[11px] font-bold text-gray-500">
                            {char.role}
                            {char.personality ? ` · ${char.personality}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <ul className="space-y-2 rounded-xl border-2 border-dashed border-emerald-300/60 bg-emerald-50/80 p-3">
                    {[
                      'พิมพ์อิสระ ไม่มีตัวเลือกบังคับ',
                      'ฝึกซ้ำได้ไม่จำกัด',
                      'ไม่กระทบความคืบหน้า Campaign',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-[11px] font-bold text-emerald-900">
                        <Zap size={12} className="shrink-0 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onStart(selected.id)}
                    className="group flex w-full items-center justify-center gap-3 rounded-2xl border-[5px] border-[#2b221a] bg-gradient-to-r from-emerald-500 to-teal-500 py-4 text-lg font-black uppercase tracking-wide text-white shadow-[0_8px_0_#2b221a] transition-shadow hover:shadow-[0_6px_0_#2b221a] active:translate-y-1 active:shadow-[0_2px_0_#2b221a]"
                  >
                    <Play size={22} className="fill-white" />
                    เริ่มจำลองเจรจา
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    >
                      →
                    </motion.span>
                  </motion.button>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
