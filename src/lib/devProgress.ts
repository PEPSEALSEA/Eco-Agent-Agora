import seedData from '@/data/devProgress.json';

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'partial' | 'skipped';
export type AuditStatus = 'done' | 'partial' | 'missing' | 'bug';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3' | '—';

export type DevWeek = {
  id: string;
  label: string;
  focus: string;
  start: string;
  end: string;
};

export type DevPhase = {
  id: string;
  name: string;
  title: string;
  goal: string;
  weekIds: string[];
  color: string;
};

export type DevTask = {
  id: string;
  code: string;
  title: string;
  domain: string;
  domainNum: number;
  phaseId: string | null;
  weekId: string | null;
  priority: TaskPriority;
  auditStatus: AuditStatus;
  status: TaskStatus;
  actionable: boolean;
  effort: string;
  deadline: string | null;
  planHours: number | null;
  spanDays: number | null;
  parallelGroup: string | null;
  dependsOn: string[] | null;
  files: string;
  notes: string;
};

export type DevBlocker = {
  id: string;
  title: string;
  taskIds: string[];
  impact: string;
};

export type DevProgressSeed = {
  version: number;
  project: string;
  source: string;
  weeks: DevWeek[];
  phases: DevPhase[];
  tasks: DevTask[];
  blockers: DevBlocker[];
};

export type TaskOverride = Partial<
  Pick<DevTask, 'status' | 'deadline' | 'notes' | 'priority' | 'weekId' | 'phaseId' | 'planHours' | 'spanDays' | 'parallelGroup' | 'dependsOn'>
>;

export type DevProgressStore = {
  version: number;
  updatedAt: string;
  overrides: Record<string, TaskOverride>;
};

const STORAGE_KEY = 'wongjraja-dev-progress-v1';

export const seed = seedData as DevProgressSeed;

export function mergeTasks(store?: DevProgressStore | null): DevTask[] {
  const overrides = store?.overrides ?? {};
  return seed.tasks.map((task) => ({
    ...task,
    planHours: task.planHours ?? null,
    spanDays: task.spanDays ?? null,
    parallelGroup: task.parallelGroup ?? null,
    dependsOn: task.dependsOn ?? null,
    ...overrides[task.id],
  }));
}

export function loadStore(): DevProgressStore | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DevProgressStore;
  } catch {
    return null;
  }
}

export function saveStore(overrides: Record<string, TaskOverride>): DevProgressStore {
  const store: DevProgressStore = {
    version: seed.version,
    updatedAt: new Date().toISOString(),
    overrides,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
  return store;
}

export function updateTaskOverride(taskId: string, patch: TaskOverride, current?: DevProgressStore | null): DevProgressStore {
  const base = current ?? loadStore() ?? { version: seed.version, updatedAt: '', overrides: {} };
  const nextOverrides = {
    ...base.overrides,
    [taskId]: {
      ...base.overrides[taskId],
      ...patch,
    },
  };
  return saveStore(nextOverrides);
}

export function resetStore(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function exportProgressJson(tasks: DevTask[]): string {
  const payload = {
    ...seed,
    exportedAt: new Date().toISOString(),
    tasks,
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadProgressJson(tasks: DevTask[], filename = 'devProgress.json'): void {
  const blob = new Blob([exportProgressJson(tasks)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProgressJson(json: unknown): DevProgressStore {
  const data = json as { tasks?: DevTask[]; overrides?: Record<string, TaskOverride> };
  if (data.overrides) {
    return saveStore(data.overrides);
  }
  if (Array.isArray(data.tasks)) {
    const overrides: Record<string, TaskOverride> = {};
    for (const task of data.tasks) {
      overrides[task.id] = {
        status: task.status,
        deadline: task.deadline,
        notes: task.notes,
        priority: task.priority,
        weekId: task.weekId,
        phaseId: task.phaseId,
        planHours: task.planHours,
        spanDays: task.spanDays,
        parallelGroup: task.parallelGroup,
        dependsOn: task.dependsOn,
      };
    }
    return saveStore(overrides);
  }
  throw new Error('Invalid dev-progress JSON');
}

const DAY_CAPACITY = 6;

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function getTaskSpan(task: DevTask): { start: string; end: string } | null {
  if (!task.deadline) return null;
  const span = task.spanDays ?? 1;
  return { start: task.deadline, end: addDaysStr(task.deadline, span - 1) };
}

export function taskCoversDay(task: DevTask, day: string): boolean {
  const span = getTaskSpan(task);
  if (!span) return false;
  return day >= span.start && day <= span.end;
}

export function getTaskHoursOnDay(task: DevTask, day: string): number {
  if (!taskCoversDay(task, day) || !task.planHours) return 0;
  const span = task.spanDays ?? 1;
  return task.planHours / span;
}

export function getDayPlanLoad(tasks: DevTask[], day: string): { hours: number; tasks: DevTask[] } {
  const onDay = tasks.filter((t) => t.actionable && taskCoversDay(t, day));
  const hours = onDay.reduce((sum, t) => sum + getTaskHoursOnDay(t, day), 0);
  return { hours: Math.round(hours * 10) / 10, tasks: onDay };
}

export function isDayOverloaded(tasks: DevTask[], day: string): boolean {
  return getDayPlanLoad(tasks, day).hours > DAY_CAPACITY;
}

export { DAY_CAPACITY as PLAN_DAY_CAPACITY };

export function getProgressStats(tasks: DevTask[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const todo = tasks.filter((t) => t.status === 'todo').length;
  const partial = tasks.filter((t) => t.status === 'partial').length;
  const actionableList = tasks.filter((t) => t.actionable && t.status !== 'done' && t.status !== 'skipped');
  const today = new Date().toISOString().slice(0, 10);
  const overdue = actionableList.filter((t) => isOverdueTask(t));
  const dueToday = actionableList.filter((t) => taskCoversDay(t, today));

  return {
    total,
    done,
    inProgress,
    todo,
    partial,
    actionable: actionableList.length,
    overdue: overdue.length,
    dueToday: dueToday.length,
    pct: total ? Math.round((done / total) * 100) : 0,
  };
}

export function getPhaseProgress(tasks: DevTask[], phaseId: string) {
  const phaseTasks = tasks.filter((t) => t.phaseId === phaseId);
  if (!phaseTasks.length) return 0;
  const done = phaseTasks.filter((t) => t.status === 'done').length;
  return Math.round((done / phaseTasks.length) * 100);
}

export function formatDeadline(deadline: string | null): string {
  if (!deadline) return '—';
  return new Date(deadline + 'T12:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isOverdueTask(task: DevTask): boolean {
  if (!task.deadline || task.status === 'done' || task.status === 'skipped') return false;
  const span = getTaskSpan(task);
  if (!span) return false;
  return new Date(span.end) < new Date(new Date().toDateString());
}

export function isOverdue(deadline: string | null, status: TaskStatus, spanDays = 1): boolean {
  if (!deadline || status === 'done' || status === 'skipped') return false;
  const end = addDaysStr(deadline, spanDays - 1);
  return new Date(end) < new Date(new Date().toDateString());
}

export function isDueSoonTask(task: DevTask, days = 2): boolean {
  if (!task.deadline || task.status === 'done' || task.status === 'skipped') return false;
  const span = getTaskSpan(task);
  if (!span) return false;
  const end = new Date(span.end);
  const now = new Date(new Date().toDateString());
  const diff = (end.getTime() - now.getTime()) / 86400000;
  return diff >= 0 && diff <= days;
}

export function isDueSoon(deadline: string | null, status: TaskStatus, days = 2, spanDays = 1): boolean {
  if (!deadline || status === 'done' || status === 'skipped') return false;
  const end = addDaysStr(deadline, spanDays - 1);
  const d = new Date(end);
  const now = new Date(new Date().toDateString());
  const diff = (d.getTime() - now.getTime()) / 86400000;
  return diff >= 0 && diff <= days;
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'รอทำ',
  in_progress: 'กำลังทำ',
  done: 'เสร็จแล้ว',
  partial: 'ทำบางส่วน',
  skipped: 'ข้าม',
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-700 border-gray-900',
  in_progress: 'bg-nintendo-yellow text-gray-900 border-gray-900',
  done: 'bg-nintendo-green text-white border-gray-900',
  partial: 'bg-nintendo-blue/20 text-nintendo-blue border-gray-900',
  skipped: 'bg-gray-200 text-gray-400 border-gray-300',
};

export const PRIORITY_COLORS: Record<string, string> = {
  P0: 'bg-nintendo-red text-white',
  P1: 'bg-nintendo-yellow text-gray-900',
  P2: 'bg-nintendo-blue text-white',
  P3: 'bg-purple-500 text-white',
  '—': 'bg-gray-200 text-gray-500',
};

export const PHASE_COLORS: Record<string, string> = {
  red: 'bg-nintendo-red',
  blue: 'bg-nintendo-blue',
  green: 'bg-nintendo-green',
  purple: 'bg-purple-500',
};
