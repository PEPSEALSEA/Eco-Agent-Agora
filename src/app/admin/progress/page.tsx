'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Filter,
  Flag,
  Kanban,
  LayoutGrid,
  ListTodo,
  RefreshCw,
  Settings,
  Upload,
  AlertTriangle,
  ChevronRight,
  StickyNote,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { CartoonLoading } from '@/components/CartoonLoading';
import {
  DevPhase,
  DevTask,
  DevWeek,
  TaskStatus,
  downloadProgressJson,
  formatDeadline,
  getPhaseProgress,
  getProgressStats,
  importProgressJson,
  isDueSoon,
  isOverdue,
  loadStore,
  mergeTasks,
  resetStore,
  seed,
  updateTaskOverride,
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PHASE_COLORS,
} from '@/lib/devProgress';

const ADMIN_EMAILS = ['sealseapep@gmail.com', 'sealseapep2@gmail.com'];

type ViewMode = 'board' | 'timeline' | 'phases' | 'domains' | 'all';

const BOARD_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'partial', 'done'];

export default function AdminProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [view, setView] = useState<ViewMode>('board');
  const [filterActionable, setFilterActionable] = useState(true);
  const [filterWeek, setFilterWeek] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!ADMIN_EMAILS.includes(user.email)) {
      router.push('/scenarios');
      return;
    }
    const store = loadStore();
    setTasks(mergeTasks(store));
    setReady(true);
  }, [user, authLoading, router]);

  const refresh = useCallback(() => {
    setTasks(mergeTasks(loadStore()));
  }, []);

  const patchTask = useCallback((taskId: string, patch: Parameters<typeof updateTaskOverride>[1]) => {
    updateTaskOverride(taskId, patch, loadStore());
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filterActionable && !t.actionable) return false;
      if (filterWeek !== 'all' && t.weekId !== filterWeek) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterActionable, filterWeek, filterPriority]);

  const stats = useMemo(() => getProgressStats(tasks), [tasks]);
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.actionable && t.deadline === todayStr && t.status !== 'done' && t.status !== 'skipped'),
    [tasks, todayStr]
  );

  const overdueTasks = useMemo(
    () => tasks.filter((t) => t.actionable && isOverdue(t.deadline, t.status)),
    [tasks]
  );

  const soonTasks = useMemo(
    () => tasks.filter((t) => t.actionable && isDueSoon(t.deadline, t.status, 3) && !isOverdue(t.deadline, t.status)),
    [tasks]
  );

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importProgressJson(JSON.parse(text));
      refresh();
    } catch {
      alert('ไฟล์ JSON ไม่ถูกต้อง');
    }
    e.target.value = '';
  };

  if (!ready) {
    return <CartoonLoading isOpen message="กำลังโหลดแผนงาน dev..." />;
  }

  return (
    <div className="min-h-screen cartoon-bg-blue p-4 sm:p-8 relative overflow-x-hidden">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin/scenarios"
              prefetch={false}
              className="flex items-center bg-white text-gray-900 border-4 border-gray-900 px-5 py-2.5 rounded-2xl hover:translate-y-0.5 transition-all shadow-[0_6px_0_#2b221a] active:shadow-none"
            >
              <ArrowLeft size={18} className="mr-2" />
              <span className="font-black uppercase tracking-tighter text-sm">Admin</span>
            </Link>
            <div className="bg-white border-[5px] border-gray-900 px-6 py-3 rounded-[2rem] shadow-[0_8px_0_#2b221a] -rotate-1">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-2">
                <ListTodo size={28} className="text-nintendo-blue" />
                Dev Progress
              </h1>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                Local · src/data/devProgress.json · solo planner
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadProgressJson(tasks)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-4 border-gray-900 rounded-xl font-black text-xs uppercase shadow-[0_4px_0_#2b221a] hover:translate-y-0.5 active:shadow-none"
              title="ดาวน์โหลด JSON ไปแทนที่ src/data/devProgress.json"
            >
              <Download size={16} /> Export
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border-4 border-gray-900 rounded-xl font-black text-xs uppercase shadow-[0_4px_0_#2b221a] hover:translate-y-0.5 active:shadow-none"
            >
              <Upload size={16} /> Import
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('รีเซ็ต progress ที่บันทึกใน browser? (seed จากไฟล์ยังอยู่)')) {
                  resetStore();
                  refresh();
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-nintendo-yellow border-4 border-gray-900 rounded-xl font-black text-xs uppercase shadow-[0_4px_0_#2b221a] hover:translate-y-0.5 active:shadow-none"
            >
              <RefreshCw size={16} /> Reset
            </button>
            <Link href="/admin/campaign-analytics" className="p-2.5 bg-white border-4 border-gray-900 rounded-xl shadow-[0_4px_0_#2b221a]">
              <BarChart3 size={20} />
            </Link>
            <Link href="/admin/settings" className="p-2.5 bg-white border-4 border-gray-900 rounded-xl shadow-[0_4px_0_#2b221a]">
              <Settings size={20} />
            </Link>
          </div>
        </header>

        {/* Local storage note */}
        <div className="bg-nintendo-yellow/30 border-4 border-dashed border-gray-900 rounded-2xl px-5 py-3 text-sm font-bold text-gray-700">
          บันทึกใน <code className="bg-white px-1.5 py-0.5 rounded border-2 border-gray-900">localStorage</code> ของเครื่องคุณ — ไม่ขึ้น cloud.
          กด <strong>Export</strong> แล้ววางทับ <code className="bg-white px-1.5 py-0.5 rounded border-2 border-gray-900">src/data/devProgress.json</code> ถ้าอยากเก็บใน repo
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard label="ความคืบหน้า" value={`${stats.pct}%`} sub={`${stats.done}/${stats.total}`} accent="bg-nintendo-green" />
          <StatCard label="รอทำ" value={String(stats.todo)} accent="bg-gray-200" />
          <StatCard label="กำลังทำ" value={String(stats.inProgress)} accent="bg-nintendo-yellow" />
          <StatCard label="งานที่ต้องทำ" value={String(stats.actionable)} accent="bg-nintendo-blue" />
          <StatCard label="ครบกำหนดวันนี้" value={String(stats.dueToday)} accent="bg-nintendo-pink" />
          <StatCard label="เลย deadline" value={String(stats.overdue)} accent="bg-nintendo-red" />
        </div>

        {/* Blockers */}
        {seed.blockers.length > 0 && (
          <section className="bg-white border-[5px] border-gray-900 rounded-[2rem] p-6 shadow-[0_10px_0_#2b221a]">
            <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 mb-4">
              <AlertTriangle className="text-nintendo-red" size={22} />
              Blockers — ทำก่อน
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {seed.blockers.map((b) => (
                <div key={b.id} className="bg-nintendo-red/10 border-4 border-nintendo-red rounded-2xl p-4">
                  <p className="font-black text-gray-900 uppercase tracking-tighter">{b.title}</p>
                  <p className="text-sm font-bold text-gray-600 mt-1">{b.impact}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Today / Overdue / Soon */}
        <div className="grid lg:grid-cols-3 gap-4">
          <FocusPanel title="วันนี้" icon={<Calendar size={18} />} tasks={todayTasks} empty="ไม่มีงานครบกำหนดวันนี้" onPatch={patchTask} />
          <FocusPanel title="เลย deadline" icon={<AlertTriangle size={18} />} tasks={overdueTasks} empty="ไม่มีงานค้างเลย!" tone="red" onPatch={patchTask} />
          <FocusPanel title="ใกล้ครบ (3 วัน)" icon={<Clock size={18} />} tasks={soonTasks} empty="ไม่มีงานใกล้ครบ" tone="yellow" onPatch={patchTask} />
        </div>

        {/* Phase Timeline Diagram */}
        <section className="bg-white border-[5px] border-gray-900 rounded-[2rem] p-6 shadow-[0_10px_0_#2b221a]">
          <h2 className="text-lg font-black uppercase tracking-tighter mb-6 flex items-center gap-2">
            <Flag size={20} className="text-nintendo-blue" />
            แผนภูมิ Phase
          </h2>
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-2">
            {seed.phases.map((phase, i) => (
              <PhaseCard key={phase.id} phase={phase} tasks={tasks} isLast={i === seed.phases.length - 1} />
            ))}
          </div>
        </section>

        {/* Week Timeline */}
        <section className="bg-white border-[5px] border-gray-900 rounded-[2rem] p-6 shadow-[0_10px_0_#2b221a] overflow-x-auto">
          <h2 className="text-lg font-black uppercase tracking-tighter mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Timeline รายสัปดาห์
          </h2>
          <div className="flex gap-3 min-w-max pb-2">
            {seed.weeks.map((week) => {
              const weekTasks = tasks.filter((t) => t.weekId === week.id && t.actionable);
              const done = weekTasks.filter((t) => t.status === 'done').length;
              const pct = weekTasks.length ? Math.round((done / weekTasks.length) * 100) : 0;
              const isCurrent = todayStr >= week.start && todayStr <= week.end;
              return (
                <button
                  key={week.id}
                  type="button"
                  onClick={() => setFilterWeek(filterWeek === week.id ? 'all' : week.id)}
                  className={`w-44 shrink-0 text-left border-4 border-gray-900 rounded-2xl p-4 transition-all shadow-[0_6px_0_#2b221a] hover:translate-y-0.5 ${
                    isCurrent ? 'bg-nintendo-yellow' : 'bg-gray-50'
                  } ${filterWeek === week.id ? 'ring-4 ring-nintendo-blue' : ''}`}
                >
                  <p className="text-[10px] font-black uppercase text-gray-500">{week.id.toUpperCase()}</p>
                  <p className="font-black text-sm uppercase tracking-tighter leading-tight mt-1">{week.label.split('—')[1]?.trim() || week.label}</p>
                  <p className="text-xs font-bold text-gray-500 mt-2">{week.start.slice(5)} – {week.end.slice(5)}</p>
                  <div className="mt-3 h-2 bg-gray-200 border-2 border-gray-900 rounded-full overflow-hidden">
                    <div className="h-full bg-nintendo-green transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] font-black mt-1">{done}/{weekTasks.length} งาน · {pct}%</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Filters + View toggle */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div className="flex flex-wrap gap-2">
            {(['board', 'timeline', 'phases', 'domains', 'all'] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-xl border-4 border-gray-900 font-black text-xs uppercase tracking-tighter shadow-[0_4px_0_#2b221a] transition-all ${
                  view === v ? 'bg-nintendo-blue text-white' : 'bg-white text-gray-900 hover:translate-y-0.5'
                }`}
              >
                {v === 'board' && 'Kanban'}
                {v === 'timeline' && 'Deadline'}
                {v === 'phases' && 'Phase'}
                {v === 'domains' && 'Domain'}
                {v === 'all' && 'ทั้งหมด'}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Filter size={16} className="text-gray-400" />
            <label className="flex items-center gap-2 text-xs font-black uppercase cursor-pointer">
              <input type="checkbox" checked={filterActionable} onChange={(e) => setFilterActionable(e.target.checked)} className="w-4 h-4" />
              เฉพาะงานที่ต้องทำ
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="border-4 border-gray-900 rounded-xl px-3 py-1.5 font-black text-xs uppercase bg-white"
            >
              <option value="all">ทุก Priority</option>
              <option value="P0">P0</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </div>
        </div>

        {/* Main content views */}
        {view === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {BOARD_COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                status={col}
                tasks={filtered.filter((t) => t.status === col)}
                expandedTask={expandedTask}
                setExpandedTask={setExpandedTask}
                onPatch={patchTask}
              />
            ))}
          </div>
        )}

        {view === 'timeline' && (
          <div className="space-y-3">
            {[...filtered]
              .filter((t) => t.deadline)
              .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
              .map((task) => (
                <TaskRow key={task.id} task={task} expanded={expandedTask === task.id} onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)} onPatch={patchTask} />
              ))}
          </div>
        )}

        {view === 'phases' && (
          <div className="space-y-6">
            {seed.phases.map((phase) => (
              <div key={phase.id} className="bg-white border-[5px] border-gray-900 rounded-[2rem] p-6 shadow-[0_8px_0_#2b221a]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-lg text-white text-xs font-black uppercase ${PHASE_COLORS[phase.color]}`}>{phase.name}</span>
                    <h3 className="text-xl font-black uppercase tracking-tighter mt-2">{phase.title}</h3>
                    <p className="text-sm font-bold text-gray-500">{phase.goal}</p>
                  </div>
                  <span className="text-2xl font-black text-nintendo-blue">{getPhaseProgress(tasks, phase.id)}%</span>
                </div>
                <div className="space-y-2">
                  {filtered.filter((t) => t.phaseId === phase.id).map((task) => (
                    <TaskRow key={task.id} task={task} compact expanded={expandedTask === task.id} onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)} onPatch={patchTask} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'domains' && (
          <div className="space-y-6">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
              const domainTasks = filtered.filter((t) => t.domainNum === num);
              if (!domainTasks.length) return null;
              const label = domainTasks[0]?.domain || `Domain ${num}`;
              const done = domainTasks.filter((t) => t.status === 'done').length;
              return (
                <div key={num} className="bg-white border-[5px] border-gray-900 rounded-[2rem] p-6 shadow-[0_8px_0_#2b221a]">
                  <div className="flex justify-between mb-4">
                    <h3 className="text-lg font-black uppercase tracking-tighter">D{num} · {label}</h3>
                    <span className="font-black text-gray-400">{done}/{domainTasks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {domainTasks.map((task) => (
                      <TaskRow key={task.id} task={task} compact expanded={expandedTask === task.id} onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)} onPatch={patchTask} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'all' && (
          <div className="space-y-2">
            {filtered.map((task) => (
              <TaskRow key={task.id} task={task} expanded={expandedTask === task.id} onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)} onPatch={patchTask} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <div className="bg-white border-4 border-gray-900 rounded-2xl p-4 shadow-[0_6px_0_#2b221a]">
      <div className={`w-8 h-1.5 rounded-full ${accent} mb-2`} />
      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</p>
      <p className="text-2xl font-black text-gray-900 tracking-tighter">{value}</p>
      {sub && <p className="text-xs font-bold text-gray-400">{sub}</p>}
    </div>
  );
}

function PhaseCard({ phase, tasks, isLast }: { phase: DevPhase; tasks: DevTask[]; isLast: boolean }) {
  const pct = getPhaseProgress(tasks, phase.id);
  const phaseTasks = tasks.filter((t) => t.phaseId === phase.id);
  const weeks = seed.weeks.filter((w) => phase.weekIds.includes(w.id));

  return (
    <div className="flex-1 flex items-stretch gap-2 min-w-0">
      <div className="flex-1 bg-gray-50 border-4 border-gray-900 rounded-2xl p-4 shadow-[0_6px_0_#2b221a]">
        <div className={`inline-block px-2 py-0.5 rounded-lg text-white text-[10px] font-black uppercase mb-2 ${PHASE_COLORS[phase.color]}`}>
          {phase.name}
        </div>
        <h3 className="font-black text-sm uppercase tracking-tighter leading-tight">{phase.title}</h3>
        <p className="text-[11px] font-bold text-gray-500 mt-1 line-clamp-2">{phase.goal}</p>
        <div className="mt-3 h-3 bg-gray-200 border-2 border-gray-900 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-nintendo-green" transition={{ duration: 0.8 }} />
        </div>
        <p className="text-[10px] font-black mt-2 text-gray-500">
          {phaseTasks.filter((t) => t.status === 'done').length}/{phaseTasks.length} · {pct}%
        </p>
        <p className="text-[10px] font-bold text-gray-400 mt-1">
          {weeks.map((w) => w.id.toUpperCase()).join(' → ')}
        </p>
      </div>
      {!isLast && (
        <div className="hidden lg:flex items-center shrink-0 text-gray-300">
          <ChevronRight size={28} strokeWidth={3} />
        </div>
      )}
    </div>
  );
}

function FocusPanel({
  title,
  icon,
  tasks,
  empty,
  tone = 'default',
  onPatch,
}: {
  title: string;
  icon: React.ReactNode;
  tasks: DevTask[];
  empty: string;
  tone?: 'default' | 'red' | 'yellow';
  onPatch: (id: string, patch: Parameters<typeof updateTaskOverride>[1]) => void;
}) {
  const bg = tone === 'red' ? 'bg-nintendo-red/10 border-nintendo-red' : tone === 'yellow' ? 'bg-nintendo-yellow/20 border-nintendo-yellow' : 'bg-white border-gray-900';
  return (
    <div className={`border-4 rounded-2xl p-4 shadow-[0_6px_0_#2b221a] ${bg}`}>
      <h3 className="font-black uppercase tracking-tighter text-sm flex items-center gap-2 mb-3">{icon}{title} ({tasks.length})</h3>
      {tasks.length === 0 ? (
        <p className="text-sm font-bold text-gray-400">{empty}</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {tasks.slice(0, 8).map((t) => (
            <li key={t.id} className="flex items-start gap-2">
              <button type="button" onClick={() => onPatch(t.id, { status: t.status === 'done' ? 'todo' : 'done' })} className="mt-0.5 shrink-0">
                {t.status === 'done' ? <CheckCircle2 size={16} className="text-nintendo-green" /> : <Circle size={16} className="text-gray-400" />}
              </button>
              <div className="min-w-0">
                <p className="text-xs font-black truncate">{t.code} · {t.title}</p>
                <p className="text-[10px] font-bold text-gray-500">{formatDeadline(t.deadline)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  expandedTask,
  setExpandedTask,
  onPatch,
}: {
  status: TaskStatus;
  tasks: DevTask[];
  expandedTask: string | null;
  setExpandedTask: (id: string | null) => void;
  onPatch: (id: string, patch: Parameters<typeof updateTaskOverride>[1]) => void;
}) {
  return (
    <div className="bg-gray-100/80 border-4 border-gray-900 rounded-[1.5rem] p-3 min-h-[320px]">
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border-4 font-black text-xs uppercase mb-3 ${STATUS_COLORS[status]}`}>
        <Kanban size={14} />
        {STATUS_LABELS[status]} ({tasks.length})
      </div>
      <div className="space-y-2">
        <AnimatePresence>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} expanded={expandedTask === task.id} onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)} onPatch={onPatch} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  expanded,
  onToggle,
  onPatch,
}: {
  task: DevTask;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (id: string, patch: Parameters<typeof updateTaskOverride>[1]) => void;
}) {
  const overdue = isOverdue(task.deadline, task.status);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`bg-white border-4 rounded-xl p-3 shadow-[0_4px_0_#2b221a] ${overdue ? 'border-nintendo-red' : 'border-gray-900'}`}>
      <div className="flex items-start gap-2">
        <button type="button" onClick={() => onPatch(task.id, { status: cycleStatus(task.status) })} className="shrink-0 mt-0.5" title="เปลี่ยนสถานะ">
          {task.status === 'done' ? <CheckCircle2 size={18} className="text-nintendo-green" /> : task.status === 'in_progress' ? <Clock size={18} className="text-nintendo-yellow" /> : <Circle size={18} className="text-gray-400" />}
        </button>
        <button type="button" onClick={onToggle} className="flex-1 text-left min-w-0">
          <div className="flex flex-wrap gap-1 mb-1">
            <span className="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded border border-gray-900">{task.code}</span>
            {task.priority !== '—' && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border border-gray-900 ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
            )}
          </div>
          <p className="text-xs font-black leading-snug">{task.title}</p>
          {task.deadline && (
            <p className={`text-[10px] font-bold mt-1 ${overdue ? 'text-nintendo-red' : 'text-gray-500'}`}>
              📅 {formatDeadline(task.deadline)}
            </p>
          )}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-200 space-y-2">
          <p className="text-[10px] font-bold text-gray-500">{task.domain} · {task.effort}</p>
          <p className="text-[10px] font-mono text-gray-400">{task.files}</p>
          <select
            value={task.status}
            onChange={(e) => onPatch(task.id, { status: e.target.value as TaskStatus })}
            className="w-full border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-black"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="date"
            value={task.deadline || ''}
            onChange={(e) => onPatch(task.id, { deadline: e.target.value || null })}
            className="w-full border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-bold"
          />
          <textarea
            value={task.notes}
            onChange={(e) => onPatch(task.id, { notes: e.target.value })}
            placeholder="บันทึก..."
            rows={2}
            className="w-full border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-bold resize-none"
          />
        </div>
      )}
    </motion.div>
  );
}

function TaskRow({
  task,
  compact,
  expanded,
  onToggle,
  onPatch,
}: {
  task: DevTask;
  compact?: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (id: string, patch: Parameters<typeof updateTaskOverride>[1]) => void;
}) {
  const overdue = isOverdue(task.deadline, task.status);
  return (
    <div className={`bg-white border-4 rounded-2xl overflow-hidden shadow-[0_4px_0_#2b221a] ${overdue ? 'border-nintendo-red' : 'border-gray-900'}`}>
      <div className="flex items-center gap-3 p-3">
        <button type="button" onClick={() => onPatch(task.id, { status: cycleStatus(task.status) })}>
          {task.status === 'done' ? <CheckCircle2 size={20} className="text-nintendo-green" /> : <Circle size={20} className="text-gray-400" />}
        </button>
        <button type="button" onClick={onToggle} className="flex-1 text-left min-w-0 flex flex-wrap items-center gap-2">
          <span className="text-xs font-black bg-gray-100 px-2 py-0.5 rounded border-2 border-gray-900">{task.code}</span>
          {!compact && <span className="text-[10px] font-bold text-gray-400">{task.domain}</span>}
          <span className="font-black text-sm flex-1 min-w-0 truncate">{task.title}</span>
          {task.priority !== '—' && <span className={`text-[10px] font-black px-2 py-0.5 rounded ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>}
          <span className={`text-xs font-bold ${overdue ? 'text-nintendo-red' : 'text-gray-500'}`}>{formatDeadline(task.deadline)}</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded border-2 ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t-2 border-dashed border-gray-100">
          <p className="text-xs font-bold text-gray-500 pt-2">{task.files}</p>
          {task.notes && <p className="text-xs font-bold flex items-start gap-1"><StickyNote size={14} />{task.notes}</p>}
          <div className="flex flex-wrap gap-2">
            <select value={task.status} onChange={(e) => onPatch(task.id, { status: e.target.value as TaskStatus })} className="border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-black">
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" value={task.deadline || ''} onChange={(e) => onPatch(task.id, { deadline: e.target.value || null })} className="border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-bold" />
          </div>
        </div>
      )}
    </div>
  );
}

function cycleStatus(current: TaskStatus): TaskStatus {
  const order: TaskStatus[] = ['todo', 'in_progress', 'partial', 'done'];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}
