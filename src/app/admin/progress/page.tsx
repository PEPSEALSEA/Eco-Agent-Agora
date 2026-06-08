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
  getDayPlanLoad,
  getPhaseProgress,
  getProgressStats,
  getTaskSpan,
  importProgressJson,
  isDueSoonTask,
  isOverdueTask,
  loadStore,
  mergeTasks,
  PLAN_DAY_CAPACITY,
  resetStore,
  seed,
  taskCoversDay,
  updateTaskOverride,
  STATUS_COLORS,
  STATUS_LABELS,
  PRIORITY_COLORS,
  PHASE_COLORS,
} from '@/lib/devProgress';

const ADMIN_EMAILS = ['sealseapep@gmail.com', 'sealseapep2@gmail.com'];

type ViewMode = 'gantt' | 'board' | 'timeline' | 'phases' | 'domains' | 'all';

const DAY_WIDTH = 34;
const LABEL_WIDTH = 240;
const ROW_HEIGHT = 40;

const STATUS_BAR_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-slate-300 border-slate-500',
  in_progress: 'bg-nintendo-yellow border-gray-900',
  done: 'bg-nintendo-green border-gray-900',
  partial: 'bg-sky-400 border-sky-700',
  skipped: 'bg-gray-200 border-gray-300 opacity-40',
};

const THAI_DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start + 'T12:00:00');
  const b = new Date(end + 'T12:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  let d = start;
  while (d <= end) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

const BOARD_COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'partial', 'done'];

export default function AdminProgressPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [view, setView] = useState<ViewMode>('gantt');
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

  const todayLoad = useMemo(() => getDayPlanLoad(tasks, todayStr), [tasks, todayStr]);

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.actionable && taskCoversDay(t, todayStr) && t.status !== 'done' && t.status !== 'skipped'),
    [tasks, todayStr]
  );

  const overdueTasks = useMemo(
    () => tasks.filter((t) => t.actionable && isOverdueTask(t)),
    [tasks]
  );

  const soonTasks = useMemo(
    () => tasks.filter((t) => t.actionable && isDueSoonTask(t, 3) && !isOverdueTask(t)),
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
    <div className="min-h-screen cartoon-bg-blue text-gray-900 p-4 sm:p-8 relative overflow-x-hidden">
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
          <StatCard label="ทำวันนี้" value={String(stats.dueToday)} accent="bg-nintendo-pink" />
          <StatCard label="เลยวัน" value={String(stats.overdue)} accent="bg-nintendo-red" />
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
          <FocusPanel title={`วันนี้${todayLoad.hours ? ` · ${todayLoad.hours}h` : ''}`} icon={<Calendar size={18} />} tasks={todayTasks} empty="ยังไม่ได้วางงานวันนี้" onPatch={patchTask} />
          <FocusPanel title="เลยวัน" icon={<AlertTriangle size={18} />} tasks={overdueTasks} empty="ไม่มีงานค้างเลย!" tone="red" onPatch={patchTask} />
          <FocusPanel title="3 วันถัดไป" icon={<Clock size={18} />} tasks={soonTasks} empty="ไม่มีงานในช่วงนี้" tone="yellow" onPatch={patchTask} />
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

        {/* Homework Gantt — รายการงานแนวตั้ง + แถบวัน */}
        <HomeworkGanttChart
          tasks={filtered}
          allTasks={tasks}
          todayStr={todayStr}
          expandedTask={expandedTask}
          setExpandedTask={setExpandedTask}
          onPatch={patchTask}
        />

        {/* Filters + View toggle */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <div className="flex flex-wrap gap-2">
            {(['gantt', 'board', 'timeline', 'phases', 'domains', 'all'] as ViewMode[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded-xl border-4 border-gray-900 font-black text-xs uppercase tracking-tighter shadow-[0_4px_0_#2b221a] transition-all ${
                  view === v ? 'bg-nintendo-blue text-white' : 'bg-white text-gray-900 hover:translate-y-0.5'
                }`}
              >
                {v === 'gantt' && 'แผนงาน'}
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
            <label className="flex items-center gap-2 text-xs font-black uppercase cursor-pointer text-gray-900">
              <input type="checkbox" checked={filterActionable} onChange={(e) => setFilterActionable(e.target.checked)} className="w-4 h-4" />
              เฉพาะงานที่ต้องทำ
            </label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="border-4 border-gray-900 rounded-xl px-3 py-1.5 font-black text-xs uppercase bg-white text-gray-900"
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

function HomeworkGanttChart({
  tasks,
  allTasks,
  todayStr,
  expandedTask,
  setExpandedTask,
  onPatch,
}: {
  tasks: DevTask[];
  allTasks: DevTask[];
  todayStr: string;
  expandedTask: string | null;
  setExpandedTask: (id: string | null) => void;
  onPatch: (id: string, patch: Parameters<typeof updateTaskOverride>[1]) => void;
}) {
  const timelineStart = seed.weeks[0]?.start ?? todayStr;
  const timelineEnd = seed.weeks[seed.weeks.length - 1]?.end ?? todayStr;
  const days = useMemo(() => enumerateDays(timelineStart, timelineEnd), [timelineStart, timelineEnd]);
  const gridWidth = days.length * DAY_WIDTH;

  const sortedTasks = useMemo(
    () =>
      [...tasks]
        .filter((t) => getTaskSpan(t))
        .sort((a, b) => {
          const sa = getTaskSpan(a)!;
          const sb = getTaskSpan(b)!;
          const cmp = sa.start.localeCompare(sb.start);
          return cmp !== 0 ? cmp : sa.end.localeCompare(sb.end);
        }),
    [tasks]
  );

  const weekSpans = useMemo(() => {
    return seed.weeks.map((week) => {
      const startIdx = Math.max(0, daysBetween(timelineStart, week.start));
      const endIdx = Math.min(days.length - 1, daysBetween(timelineStart, week.end));
      return { week, startIdx, colSpan: endIdx - startIdx + 1, left: startIdx * DAY_WIDTH };
    });
  }, [days, timelineStart]);

  return (
    <section className="bg-white border-[5px] border-gray-900 rounded-[2rem] shadow-[0_10px_0_#2b221a] overflow-hidden text-gray-900">
      <div className="px-5 pt-5 pb-2 flex flex-wrap items-center justify-between gap-3 border-b-4 border-dashed border-gray-200">
          <h2 className="text-lg font-black uppercase tracking-tighter flex items-center gap-2 text-gray-900">
            <LayoutGrid size={20} className="text-nintendo-blue" />
            แผนงานรายวัน
          </h2>
          <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase">
            {Object.entries(STATUS_LABELS).slice(0, 4).map(([k, label]) => (
              <span key={k} className="flex items-center gap-1.5 text-gray-700">
                <span className={`w-3 h-3 rounded-sm border-2 border-gray-900 ${STATUS_BAR_COLORS[k as TaskStatus].split(' ')[0]}`} />
                {label}
              </span>
            ))}
            <span className="text-gray-500">· max {PLAN_DAY_CAPACITY}h/วัน</span>
            <span className="text-violet-700">⇄ = ทำคู่กัน</span>
          </div>
        </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: LABEL_WIDTH + gridWidth }}>
          {/* Week header row */}
          <div className="flex border-b-2 border-gray-900 bg-gray-50 sticky top-0 z-20">
            <div
              className="shrink-0 border-r-4 border-gray-900 bg-gray-100 px-3 py-2 flex items-end"
              style={{ width: LABEL_WIDTH }}
            >
              <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">งาน</span>
            </div>
            <div className="relative" style={{ width: gridWidth, height: 36 }}>
              {weekSpans.map(({ week, left, colSpan }) => (
                <button
                  key={week.id}
                  type="button"
                  className="absolute top-0 h-full border-r-2 border-gray-300 px-1 flex items-center justify-center hover:bg-nintendo-yellow/30 transition-colors"
                  style={{ left, width: colSpan * DAY_WIDTH }}
                  title={week.label}
                >
                  <span className="text-[10px] font-black uppercase text-gray-700 truncate px-1">
                    {week.id.toUpperCase()} · {week.label.split('—')[1]?.trim() || week.focus}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Day header row */}
          <div className="flex border-b-4 border-gray-900 bg-white sticky top-9 z-20">
            <div
              className="shrink-0 border-r-4 border-gray-900 bg-gray-50 px-3 py-1.5 flex items-center"
              style={{ width: LABEL_WIDTH }}
            >
              <span className="text-[10px] font-black uppercase text-gray-500">ชื่องาน</span>
            </div>
            <div className="flex">
              {days.map((day) => {
                const isToday = day === todayStr;
                const dow = new Date(day + 'T12:00:00').getDay();
                const isWeekend = dow === 0 || dow === 6;
                const load = getDayPlanLoad(allTasks, day);
                const overloaded = load.hours > PLAN_DAY_CAPACITY;
                return (
                  <div
                    key={day}
                    className={`shrink-0 border-r border-gray-200 flex flex-col items-center justify-center py-1 ${
                      isToday ? 'bg-nintendo-yellow/40 ring-2 ring-inset ring-nintendo-blue' : isWeekend ? 'bg-gray-100' : 'bg-white'
                    }`}
                    style={{ width: DAY_WIDTH }}
                    title={load.hours > 0 ? `${load.hours}h / ${PLAN_DAY_CAPACITY}h · ${load.tasks.length} งาน` : undefined}
                  >
                    <span className={`text-[9px] font-bold leading-none ${isToday ? 'text-nintendo-blue' : 'text-gray-400'}`}>
                      {THAI_DOW[dow]}
                    </span>
                    <span className={`text-[11px] font-black leading-tight ${isToday ? 'text-gray-900' : 'text-gray-700'}`}>
                      {parseInt(day.slice(8), 10)}
                    </span>
                    {load.hours > 0 && (
                      <span className={`text-[8px] font-black leading-none mt-0.5 ${overloaded ? 'text-nintendo-red' : 'text-gray-500'}`}>
                        {load.hours}h
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task rows */}
          <div className="relative">
            {/* Today vertical line */}
            {days.includes(todayStr) && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-nintendo-red/60 z-10 pointer-events-none"
                style={{ left: LABEL_WIDTH + daysBetween(timelineStart, todayStr) * DAY_WIDTH + DAY_WIDTH / 2 }}
              />
            )}

            {sortedTasks.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm font-bold text-gray-500">ไม่มีงานที่แสดงในแผน</div>
            ) : (
              sortedTasks.map((task) => (
                <GanttTaskRow
                  key={task.id}
                  task={task}
                  timelineStart={timelineStart}
                  expanded={expandedTask === task.id}
                  onToggle={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                  onPatch={onPatch}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function GanttTooltip({
  text,
  prefix,
  meta,
  onlyIfTruncated,
  className,
  style,
  onClick,
  children,
}: {
  text: string;
  prefix?: string;
  meta?: string;
  onlyIfTruncated?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  const showTip = () => {
    if (onlyIfTruncated) {
      const el = anchorRef.current;
      if (!el) return;
      const truncated = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      if (!truncated) return;
    }
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: rect.left, y: rect.bottom + 6 });
  };

  return (
    <div
      ref={anchorRef}
      className={className}
      style={style}
      onMouseEnter={showTip}
      onMouseLeave={() => setTip(null)}
      onClick={onClick}
    >
      {children}
      {tip && (
        <div className="fixed z-[9999] max-w-xs sm:max-w-sm pointer-events-none" style={{ left: tip.x, top: tip.y }}>
          <div className="bg-gray-900 text-white text-xs font-bold px-3 py-2.5 rounded-xl border-4 border-gray-900 shadow-[0_6px_0_#2b221a] leading-snug whitespace-normal">
            {prefix && <span className="font-black text-nintendo-yellow">{prefix} · </span>}
            {text}
            {meta && <span className="block text-[10px] font-bold text-gray-300 mt-1">{meta}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function GanttTaskRow({
  task,
  timelineStart,
  expanded,
  onToggle,
  onPatch,
}: {
  task: DevTask;
  timelineStart: string;
  expanded: boolean;
  onToggle: () => void;
  onPatch: (id: string, patch: Parameters<typeof updateTaskOverride>[1]) => void;
}) {
  const span = getTaskSpan(task)!;
  const overdue = isOverdueTask(task);
  const offsetDays = daysBetween(timelineStart, span.start);
  const durationDays = daysBetween(span.start, span.end) + 1;
  const barLeft = offsetDays * DAY_WIDTH + 3;
  const barWidth = durationDays * DAY_WIDTH - 6;

  return (
    <div className={`border-b border-gray-100 ${expanded ? 'bg-sky-50/50' : 'hover:bg-gray-50/80'}`}>
      <div className="flex items-stretch" style={{ minHeight: ROW_HEIGHT }}>
        {/* Task label */}
        <div
          className="shrink-0 border-r-4 border-gray-900 px-2 py-1.5 flex items-center gap-2 bg-white"
          style={{ width: LABEL_WIDTH }}
        >
          <button
            type="button"
            onClick={() => onPatch(task.id, { status: cycleStatus(task.status) })}
            className="shrink-0"
            title="เปลี่ยนสถานะ"
          >
            {task.status === 'done' ? (
              <CheckCircle2 size={16} className="text-nintendo-green" />
            ) : task.status === 'in_progress' ? (
              <Clock size={16} className="text-amber-600" />
            ) : (
              <Circle size={16} className="text-gray-400" />
            )}
          </button>
          <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === 'Enter' && onToggle()} className="flex-1 min-w-0 text-left cursor-pointer">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black bg-gray-100 text-gray-800 px-1 py-0.5 rounded border border-gray-900 shrink-0">
                {task.code}
              </span>
              {task.priority !== '—' && (
                <span className={`text-[9px] font-black px-1 py-0.5 rounded shrink-0 ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
              )}
              {task.parallelGroup && (
                <span className="text-[9px] font-black px-1 py-0.5 rounded shrink-0 bg-violet-100 text-violet-800 border border-violet-400" title="ทำคู่กัน">
                  ⇄
                </span>
              )}
            </div>
            <GanttTooltip
              text={task.title}
              prefix={task.code}
              onlyIfTruncated
              className="min-w-0 text-[11px] font-bold text-gray-900 truncate leading-tight mt-0.5"
            >
              {task.title}
            </GanttTooltip>
          </div>
        </div>

        {/* Bar track */}
        <div className="relative flex-1" style={{ minWidth: 0 }}>
          <div className="absolute inset-y-0 left-0 flex pointer-events-none">
            {Array.from({ length: Math.ceil((barLeft + barWidth) / DAY_WIDTH) + 5 }).map((_, i) => (
              <div key={i} className="shrink-0 border-r border-gray-100 h-full" style={{ width: DAY_WIDTH }} />
            ))}
          </div>
          <GanttTooltip
            text={task.title}
            prefix={task.code}
            meta={`${span.start.slice(5)}${durationDays > 1 ? `–${span.end.slice(5)}` : ''} · ${task.planHours ?? '?'}h · ${STATUS_LABELS[task.status]}`}
            className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-lg border-2 shadow-[0_2px_0_rgba(0,0,0,0.15)] flex items-center px-1.5 overflow-hidden cursor-pointer transition-all hover:brightness-105 ${
              STATUS_BAR_COLORS[task.status]
            } ${overdue ? 'ring-2 ring-nintendo-red ring-offset-1' : ''}`}
            style={{ left: barLeft, width: Math.max(barWidth, 20) }}
            onClick={onToggle}
          >
            <span
              className={`text-[9px] font-black truncate drop-shadow-sm ${task.status === 'done' ? 'text-white' : 'text-gray-900'}`}
              style={{ width: Math.max(barWidth, 20) - 12 }}
            >
              {task.status === 'done' ? '✓' : STATUS_LABELS[task.status]}
            </span>
          </GanttTooltip>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-3 ml-[240px] space-y-2 border-t border-dashed border-gray-200 pt-2">
          <p className="text-[11px] font-bold text-gray-600">
            {task.domain} · {task.effort}
            {task.planHours != null && ` · ~${task.planHours}h`}
            {(task.spanDays ?? 1) > 1 && ` · ${task.spanDays} วัน`}
            {task.parallelGroup && ' · ทำคู่กัน'}
            {' · เริ่ม '}{formatDeadline(task.deadline)}
          </p>
          {task.dependsOn?.length ? (
            <p className="text-[10px] font-bold text-amber-700">หลังจาก: {task.dependsOn.join(', ')}</p>
          ) : null}
          <p className="text-[10px] font-mono text-gray-500">{task.files}</p>
          {task.notes && (
            <p className="text-[11px] font-bold text-gray-700 flex items-start gap-1">
              <StickyNote size={12} className="shrink-0 mt-0.5" />
              {task.notes}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <select
              value={task.status}
              onChange={(e) => onPatch(task.id, { status: e.target.value as TaskStatus })}
              className="border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-black text-gray-900 bg-white"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={task.deadline || ''}
              onChange={(e) => onPatch(task.id, { deadline: e.target.value || null })}
              className="border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-bold text-gray-900 bg-white"
            />
          </div>
        </div>
      )}
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
    <div className={`border-4 rounded-2xl p-4 shadow-[0_6px_0_#2b221a] text-gray-900 ${bg}`}>
      <h3 className="font-black uppercase tracking-tighter text-sm flex items-center gap-2 mb-3 text-gray-900">{icon}{title} ({tasks.length})</h3>
      {tasks.length === 0 ? (
        <p className="text-sm font-bold text-gray-500">{empty}</p>
      ) : (
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {tasks.slice(0, 8).map((t) => (
            <li key={t.id} className="flex items-start gap-2">
              <button type="button" onClick={() => onPatch(t.id, { status: t.status === 'done' ? 'todo' : 'done' })} className="mt-0.5 shrink-0">
                {t.status === 'done' ? <CheckCircle2 size={16} className="text-nintendo-green" /> : <Circle size={16} className="text-gray-400" />}
              </button>
              <div className="min-w-0">
                <p className="text-xs font-black truncate text-gray-900">{t.code} · {t.title}</p>
                <p className="text-[10px] font-bold text-gray-600">
                  {t.planHours != null && `${t.planHours}h`}
                  {t.parallelGroup && ' · ⇄ คู่กัน'}
                  {(t.spanDays ?? 1) > 1 && ` · ${t.spanDays} วัน`}
                  {t.planHours != null && ' · '}
                  {formatDeadline(t.deadline)}
                </p>
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
  const overdue = isOverdueTask(task);
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`bg-white border-4 rounded-xl p-3 shadow-[0_4px_0_#2b221a] text-gray-900 ${overdue ? 'border-nintendo-red' : 'border-gray-900'}`}>
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
          <p className="text-xs font-black leading-snug text-gray-900">{task.title}</p>
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
            className="w-full border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-black text-gray-900 bg-white"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="date"
            value={task.deadline || ''}
            onChange={(e) => onPatch(task.id, { deadline: e.target.value || null })}
            className="w-full border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-bold text-gray-900 bg-white"
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
  const overdue = isOverdueTask(task);
  return (
    <div className={`bg-white border-4 rounded-2xl overflow-hidden shadow-[0_4px_0_#2b221a] text-gray-900 ${overdue ? 'border-nintendo-red' : 'border-gray-900'}`}>
      <div className="flex items-center gap-3 p-3">
        <button type="button" onClick={() => onPatch(task.id, { status: cycleStatus(task.status) })}>
          {task.status === 'done' ? <CheckCircle2 size={20} className="text-nintendo-green" /> : <Circle size={20} className="text-gray-400" />}
        </button>
        <button type="button" onClick={onToggle} className="flex-1 text-left min-w-0 flex flex-wrap items-center gap-2">
          <span className="text-xs font-black bg-gray-100 px-2 py-0.5 rounded border-2 border-gray-900">{task.code}</span>
          {!compact && <span className="text-[10px] font-bold text-gray-400">{task.domain}</span>}
          <span className="font-black text-sm flex-1 min-w-0 truncate text-gray-900">{task.title}</span>
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
            <select value={task.status} onChange={(e) => onPatch(task.id, { status: e.target.value as TaskStatus })} className="border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-black text-gray-900 bg-white">
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" value={task.deadline || ''} onChange={(e) => onPatch(task.id, { deadline: e.target.value || null })} className="border-2 border-gray-900 rounded-lg px-2 py-1 text-xs font-bold text-gray-900 bg-white" />
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
