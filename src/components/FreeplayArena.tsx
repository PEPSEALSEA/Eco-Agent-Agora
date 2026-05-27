'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
  Car,
  ChevronRight,
  ClipboardList,
  Coffee,
  Code2,
  Crown,
  Gamepad2,
  Handshake,
  MessageCircle,
  Mic,
  Play,
  Repeat,
  Sparkles,
  Sprout,
  Store,
  Target,
  Ticket,
  UserRound,
  Users,
  type LucideIcon,
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
  venue: string;
  hook: string;
  accent: string;
  chip: string;
  panel: string;
  iconTile: string;
};

const ICON_STROKE = 2.7;

const DEFAULT_THEMES: StageTheme[] = [
  {
    Icon: Handshake,
    venue: 'โต๊ะเจรจาเปิด',
    hook: 'ฝึกพูดให้มั่นใจแล้วคมขึ้น',
    accent: 'text-emerald-700',
    chip: 'bg-emerald-400',
    panel: 'from-emerald-100 via-green-50 to-white',
    iconTile: 'bg-emerald-100',
  },
  {
    Icon: MessageCircle,
    venue: 'สนามคำพูด',
    hook: 'ทดลองหลายสไตล์แบบไม่กดดัน',
    accent: 'text-sky-700',
    chip: 'bg-sky-400',
    panel: 'from-sky-100 via-cyan-50 to-white',
    iconTile: 'bg-sky-100',
  },
  {
    Icon: Target,
    venue: 'ห้องซ้อมทักษะ',
    hook: 'จับจังหวะให้ดีและปิดดีลให้เนียน',
    accent: 'text-violet-700',
    chip: 'bg-violet-400',
    panel: 'from-violet-100 via-purple-50 to-white',
    iconTile: 'bg-violet-100',
  },
];

const getTheme = (scenario: FreeplayScenario, index: number): StageTheme => {
  const t = scenario.title.toLowerCase();
  if (t.includes('รถ') || t.includes('car') || t.includes('มือสอง')) {
    return {
      Icon: Car,
      venue: 'เต็นท์รถมือสอง',
      hook: 'ต่อรองให้ได้ราคาที่คุ้มกว่าเดิม',
      accent: 'text-amber-700',
      chip: 'bg-amber-400',
      panel: 'from-amber-100 via-orange-50 to-white',
      iconTile: 'bg-amber-100',
    };
  }
  if (t.includes('กาแฟ') || t.includes('coffee') || t.includes('คาเฟ่')) {
    return {
      Icon: Coffee,
      venue: 'ร้านกาแฟยอดฮิต',
      hook: 'คุยให้ได้ข้อเสนอพิเศษแบบสุภาพ',
      accent: 'text-stone-700',
      chip: 'bg-stone-400',
      panel: 'from-stone-200 via-stone-50 to-white',
      iconTile: 'bg-stone-100',
    };
  }
  return DEFAULT_THEMES[index % DEFAULT_THEMES.length];
};

const cleanTitle = (title: string) => title.replace(/^เล่นอิสระ:\s*/i, '').trim();

function IconBox({
  Icon,
  className,
  iconClass,
  size = 22,
}: {
  Icon: LucideIcon;
  className: string;
  iconClass?: string;
  size?: number;
}) {
  return (
    <span className={`flex items-center justify-center border-[3px] border-[#2b221a] shadow-[0_4px_0_#2b221a] ${className}`}>
      <Icon size={size} strokeWidth={ICON_STROKE} className={iconClass ?? 'text-[#2b221a]'} />
    </span>
  );
}

function getCharacterIcon(char: { name?: string; role?: string }, index: number) {
  const text = `${char.name ?? ''} ${char.role ?? ''}`.toLowerCase();
  if (/dev|engineer|โปรแกรม|พัฒน/.test(text)) return { Icon: Code2, bg: 'bg-nintendo-blue', fg: 'text-white' };
  if (/pm|manager|ผู้จัดการ|หัวหน้า|hr|product/.test(text)) return { Icon: ClipboardList, bg: 'bg-nintendo-pink', fg: 'text-white' };
  if (/เกษตร|ชุมชน|แม่บ้าน|ลุง|ป้า/.test(text)) return { Icon: Sprout, bg: 'bg-nintendo-green', fg: 'text-white' };
  if (/ขาย|เต็นท์|เฮีย|รถ|ค้า/.test(text)) return { Icon: Store, bg: 'bg-amber-500', fg: 'text-[#2b221a]' };
  if (/lead|boss|ผู้นำ/.test(text)) return { Icon: Crown, bg: 'bg-violet-500', fg: 'text-white' };
  const fallback = [
    { Icon: UserRound, bg: 'bg-nintendo-yellow', fg: 'text-[#2b221a]' },
    { Icon: Briefcase, bg: 'bg-sky-500', fg: 'text-white' },
    { Icon: Handshake, bg: 'bg-emerald-500', fg: 'text-white' },
  ];
  return fallback[index % fallback.length];
}

type FreeplayArenaProps = {
  scenarios: FreeplayScenario[];
  onStart: (scenarioId: string) => void;
  loading?: boolean;
};

export function FreeplayArena({ scenarios, onStart, loading }: FreeplayArenaProps) {
  const [selectedId, setSelectedId] = useState<string | null>(scenarios[0]?.id ?? null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setSelectedId((prev) => {
      if (scenarios.length === 0) return null;
      if (prev && scenarios.some((s) => s.id === prev)) return prev;
      return scenarios[0].id;
    });
  }, [scenarios]);

  const selected = scenarios.find((s) => s.id === selectedId) ?? scenarios[0];
  const selectedIndex = selected ? scenarios.findIndex((s) => s.id === selected.id) : 0;
  const theme = selected ? getTheme(selected, Math.max(0, selectedIndex)) : null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredScenarios = scenarios.filter((scenario) => {
    if (!normalizedQuery) return true;
    const title = cleanTitle(scenario.title).toLowerCase();
    const desc = (scenario.description ?? '').toLowerCase();
    return title.includes(normalizedQuery) || desc.includes(normalizedQuery);
  });

  return (
    <div className="mb-12 space-y-6">
      <div className="rounded-[2rem] border-[6px] border-[#2b221a] bg-[#fffdf9] p-5 shadow-[0_10px_0_#2b221a] sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <IconBox Icon={Gamepad2} className="h-10 w-10 rounded-xl bg-nintendo-yellow" size={20} />
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#b45309]">Freeplay Mode</p>
        </div>
        <h2 className="mt-3 text-4xl font-black leading-[0.9] text-gray-900 sm:text-5xl">
          ฝึกเจรจาอิสระ
          <span className="block text-nintendo-blue">แบบการ์ตูน</span>
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-bold text-gray-600 sm:text-base">
          เลือกฉากเดียวที่อยากฝึก แล้วโฟกัสที่การพิมพ์จริงทันที โดยลดองค์ประกอบรบกวนสายตาให้ใช้ง่ายขึ้น
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { icon: Mic, label: 'พิมพ์อิสระ', bg: 'bg-nintendo-pink' },
            { icon: Repeat, label: 'เล่นซ้ำได้', bg: 'bg-nintendo-green' },
            { icon: Sparkles, label: 'ฝึกเร็ว', bg: 'bg-nintendo-yellow' },
          ].map(({ icon: Icon, label, bg }) => (
            <span key={label} className={`inline-flex items-center gap-2 rounded-xl border-[3px] border-[#2b221a] ${bg} px-3 py-1.5 text-xs font-black shadow-[0_3px_0_#2b221a]`}>
              <Icon size={14} strokeWidth={3} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-700">
            <Ticket size={15} strokeWidth={3} />
            เลือกฉากฝึก
          </p>
          <span className="rounded-lg border-2 border-[#2b221a]/25 bg-white px-2.5 py-1 text-[10px] font-black text-gray-600">
            {filteredScenarios.length}/{scenarios.length} ฉาก
          </span>
        </div>
        <div className="rounded-2xl border-[4px] border-[#2b221a] bg-white p-3 shadow-[0_6px_0_#2b221a]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อฉากหรือคำอธิบาย..."
            className="w-full rounded-xl border-[3px] border-[#2b221a] bg-[#fffdf9] px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:bg-[#fff8e7]"
          />
        </div>
        <div className="grid max-h-[22rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredScenarios.map((scenario) => {
            const originalIndex = scenarios.findIndex((s) => s.id === scenario.id);
            const t = getTheme(scenario, Math.max(0, originalIndex));
            const active = selected?.id === scenario.id;
            return (
              <motion.button
                key={scenario.id}
                type="button"
                onClick={() => setSelectedId(scenario.id)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-2xl border-[4px] px-4 py-3 text-left shadow-[0_6px_0_#2b221a] transition ${
                  active
                    ? `border-[#2b221a] ${t.chip} text-gray-900`
                    : 'border-[#2b221a] bg-white text-gray-900 hover:bg-[#fff8e7]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <IconBox Icon={t.Icon} className={`h-9 w-9 rounded-lg ${active ? 'bg-white/80' : 'bg-white'}`} size={16} />
                  <span className="text-[10px] font-black uppercase tracking-wide">#{String(originalIndex + 1).padStart(2, '0')}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm font-black leading-tight">{cleanTitle(scenario.title)}</p>
                <p className="mt-1 text-[10px] font-bold uppercase text-gray-700">{t.venue}</p>
              </motion.button>
            );
          })}
          {filteredScenarios.length === 0 && (
            <div className="col-span-full rounded-2xl border-[3px] border-dashed border-[#2b221a]/40 bg-[#fffdf9] px-4 py-6 text-center text-sm font-bold text-gray-500">
              ไม่พบฉากที่ตรงกับคำค้นหา
            </div>
          )}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {selected && theme && (
          <motion.section
            key={selected.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="overflow-hidden rounded-[2.2rem] border-[6px] border-[#2b221a] bg-white shadow-[0_14px_0_#2b221a]"
          >
            <div className={`grid grid-cols-1 gap-0 bg-gradient-to-b ${theme.panel} lg:grid-cols-[0.9fr_1.1fr]`}>
              <div className="flex flex-col items-center justify-center border-b-[5px] border-[#2b221a] px-6 py-8 lg:border-b-0 lg:border-r-[5px]">
                <IconBox Icon={theme.Icon} className={`h-28 w-28 rounded-[1.6rem] ${theme.iconTile}`} size={56} />
                <p className={`mt-4 text-sm font-black uppercase tracking-[0.12em] ${theme.accent}`}>{theme.venue}</p>
                <p className="mt-2 text-center text-sm font-bold text-gray-700">{theme.hook}</p>
              </div>

              <div className="flex min-h-0 flex-col gap-5 p-6 sm:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border-[3px] border-[#2b221a] bg-nintendo-green px-3 py-1.5 text-[10px] font-black uppercase text-white shadow-[0_3px_0_#2b221a]">
                    พร้อมเริ่มเล่น
                  </span>
                  <span className="rounded-lg border-2 border-dashed border-[#2b221a]/35 bg-white px-2.5 py-1 text-[10px] font-black uppercase text-gray-600">
                    {theme.venue}
                  </span>
                </div>

                <h3 className="text-2xl font-black leading-tight text-gray-900 sm:text-3xl">{cleanTitle(selected.title)}</h3>

                <div className="rounded-2xl border-[3px] border-[#2b221a] bg-[#fff8c6] p-4 shadow-[0_4px_0_#2b221a]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-900/80">รายละเอียดฉาก</p>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-gray-800">{selected.description}</p>
                </div>

                {!!selected.characters?.length && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500">
                      <Users size={12} strokeWidth={3} />
                      ตัวละครในฉากนี้
                    </p>
                    <ul className="space-y-3">
                      {selected.characters.map((char, i) => {
                        const visual = getCharacterIcon(char, i);
                        return (
                          <li key={i} className="rounded-xl border-[3px] border-[#2b221a] bg-white p-3 shadow-[0_3px_0_#2b221a]">
                            <div className="flex items-start gap-3">
                              <IconBox Icon={visual.Icon} className={`h-10 w-10 rounded-xl ${visual.bg}`} iconClass={visual.fg} size={20} />
                              <div className="min-w-0 flex-1">
                                <p className="break-words text-sm font-black text-gray-900">{char.name}</p>
                                <p className="mt-0.5 break-words text-[11px] font-bold text-gray-600">
                                  {char.role}
                                  {char.personality ? <><span className="text-gray-400"> · </span>{char.personality}</> : null}
                                </p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <motion.button
                  type="button"
                  disabled={loading}
                  onClick={() => onStart(selected.id)}
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 1 }}
                  className="mt-1 flex w-full items-center justify-between gap-2 rounded-2xl border-[5px] border-[#2b221a] bg-nintendo-red px-5 py-3.5 text-white shadow-[0_8px_0_#2b221a] transition hover:bg-red-500 disabled:opacity-60"
                >
                  <span className="flex items-center gap-2 text-lg font-black uppercase">
                    <Play size={20} className="fill-current" />
                    เริ่มฝึกฉากนี้
                  </span>
                  <ChevronRight size={24} strokeWidth={3} />
                </motion.button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
