import fs from 'fs';

/**
 * Smart replan — จัดวันตามความยาก + ทำคู่กัน + dependency
 *
 * PLAN fields ต่อ task:
 *   hours          — ชั่วโมงโดยประมาณ (0.5–6)
 *   spanDays       — กินหลายวันต่อเนื่อง (default 1)
 *   after          — ต้องทำหลัง task ไหน (dependsOn)
 *   sameDayAfter   — ทำต่อในวันเดียวกันได้ถ้ายังไม่เต็ม 6h
 *   parallelGroup  — งานที่ทำคู่กันในวันเดียว (คนละไฟล์/คนละ layer)
 *   fullDay        — งานโฟกัสเต็มวัน (content, redesign) — ไม่แชร์วัน
 *   skip           — ไม่จัด schedule (backlog)
 */

const path = 'src/data/devProgress.json';
const DAY_CAPACITY = 6;

/** @type {Record<string, { hours: number; spanDays?: number; after?: string[]; sameDayAfter?: boolean; parallelGroup?: string; fullDay?: boolean; skip?: boolean }>} */
const PLAN = {
  'p0-1': { hours: 2.5, after: [] },
  'p0-2': { hours: 1.5, after: ['p0-1'], sameDayAfter: true, parallelGroup: 'p0-core' },
  'p0-3': { hours: 1, after: ['p0-1'], sameDayAfter: true, parallelGroup: 'p0-core' },
  'p0-4': { hours: 2, after: ['p0-2', 'p0-3'] },
  'p0-5': { hours: 1, after: ['p0-4'], sameDayAfter: true, parallelGroup: 'p0-debrief' },
  'p0-6': { hours: 0.5, after: ['p0-4'], sameDayAfter: true, parallelGroup: 'p0-debrief' },

  'p1-7': { hours: 6, after: ['p0-6'], fullDay: true },
  'p1-7b': { hours: 4, after: ['p1-7'] },
  'p1-8': { hours: 6, after: ['p1-7b'], fullDay: true },
  'p1-9': { hours: 6, after: ['p1-8'], fullDay: true },
  'p1-10': { hours: 6, after: ['p1-9'], fullDay: true },
  'p1-11': { hours: 6, after: ['p1-10'], fullDay: true },
  'p1-12': { hours: 3.5, after: ['p1-11'], parallelGroup: 'progression' },
  'p1-13': { hours: 2, after: ['p1-11'], parallelGroup: 'progression' },
  'p1-14': { hours: 3.5, after: ['p1-12', 'p1-13'] },
  'p1-15': { hours: 6, after: ['p1-14'], fullDay: true },
  'p1-15b': { hours: 6, after: ['p1-15'], fullDay: true },

  'p2-16': { hours: 3, after: ['p1-15b'] },
  'p2-17': { hours: 2, after: ['p2-16'], parallelGroup: 'admin-tools' },
  'p2-18': { hours: 2, after: ['p2-16'], parallelGroup: 'admin-tools' },
  'p2-19': { hours: 6, after: ['p2-18'], fullDay: true },
  'p2-20': { hours: 6, after: ['p2-19'], fullDay: true },
  'p2-20b': { hours: 6, after: ['p2-20'], fullDay: true },
  'p2-20c': { hours: 6, after: ['p2-20b'], fullDay: true },
  'p2-21': { hours: 6, after: ['p2-20c'], fullDay: true },
  'p2-22': { hours: 3, after: ['p2-21'], parallelGroup: 'worker-hardening' },
  'p2-23': { hours: 3, after: ['p2-21'], parallelGroup: 'worker-hardening' },
  'p2-24': { hours: 1, after: ['p2-23'], sameDayAfter: true },

  'p3-25': { hours: 6, after: ['p2-24'], fullDay: true },
  'p3-25b': { hours: 6, after: ['p3-25'], fullDay: true },
  'p3-26': { hours: 6, after: ['p3-25b'], fullDay: true },
  'p3-26b': { hours: 6, after: ['p3-26'], fullDay: true },
  'p3-26c': { hours: 6, after: ['p3-26b'], fullDay: true },
  'p3-27': { hours: 6, after: ['p3-26c'], fullDay: true },
  'p3-27b': { hours: 4, after: ['p3-27'] },
  'p3-28': { skip: true },
  'p3-29': { hours: 5, after: ['p3-27b'] },
  'p3-29b': { hours: 4, after: ['p3-29'] },
};

const ORDER = Object.keys(PLAN);

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function nextWorkDay(iso) {
  let d = iso;
  let dt = new Date(d + 'T12:00:00');
  while (dt.getDay() === 0 || dt.getDay() === 6) {
    dt.setDate(dt.getDate() + 1);
    d = dt.toISOString().slice(0, 10);
  }
  return d;
}

function advanceWorkDay(iso) {
  return nextWorkDay(addDays(iso, 1));
}

function earliestStart(plan, endDates) {
  let day = nextWorkDay(new Date().toISOString().slice(0, 10));
  for (;;) {
    const ok = (plan.after ?? []).every((dep) => {
      if (!(dep in endDates)) return false;
      const depEnd = endDates[dep];
      if (plan.sameDayAfter) return depEnd <= day;
      return depEnd < day;
    });
    if ((plan.after ?? []).length === 0 || ok) {
      if (new Date(day + 'T12:00:00').getDay() !== 0 && new Date(day + 'T12:00:00').getDay() !== 6) {
        return day;
      }
    }
    day = advanceWorkDay(day);
  }
}

function fitsOnDay(plan, dayLoad, day) {
  const load = plan.fullDay ? DAY_CAPACITY : plan.hours;
  if (plan.fullDay && dayLoad[day] > 0) return false;
  return (dayLoad[day] ?? 0) + load <= DAY_CAPACITY + 0.01;
}

function schedulePlan() {
  const startDates = {};
  const endDates = {};
  const dayLoad = {};
  const scheduled = new Set();
  const byGroup = {};

  for (const id of ORDER) {
    const plan = PLAN[id];
    if (plan.skip) continue;
    const g = plan.parallelGroup;
    if (g) {
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(id);
    } else {
      byGroup[`__solo_${id}`] = [id];
    }
  }

  const batches = [];
  const seenGroup = new Set();
  for (const id of ORDER) {
    const plan = PLAN[id];
    if (plan.skip) continue;
    const g = plan.parallelGroup;
    const key = g ?? `__solo_${id}`;
    if (seenGroup.has(key)) continue;
    seenGroup.add(key);
    batches.push(byGroup[key]);
  }

  for (const batch of batches) {
    while (batch.some((id) => !scheduled.has(id))) {
      const ready = batch.filter((id) => {
        if (scheduled.has(id)) return false;
        const after = PLAN[id].after ?? [];
        return after.every((dep) => dep in endDates);
      });
      if (!ready.length) {
        throw new Error(`Deadlock scheduling: ${batch.join(', ')}`);
      }

      const refPlan = PLAN[ready[0]];
      let day = earliestStart(
        {
          after: [...new Set(ready.flatMap((id) => PLAN[id].after ?? []))],
          sameDayAfter: ready.every((id) => (PLAN[id].after ?? []).every((dep) => PLAN[id].sameDayAfter !== false)),
        },
        endDates
      );

      const totalHours = ready.reduce((s, id) => s + (PLAN[id].fullDay ? DAY_CAPACITY : PLAN[id].hours), 0);
      const anyFullDay = ready.some((id) => PLAN[id].fullDay);

      while (!fitsOnDay({ hours: totalHours, fullDay: anyFullDay }, dayLoad, day)) {
        day = advanceWorkDay(day);
      }

      for (const id of ready) {
        const plan = PLAN[id];
        const span = plan.spanDays ?? 1;
        startDates[id] = day;
        const end = addDays(day, span - 1);
        endDates[id] = end;
        const load = plan.fullDay ? DAY_CAPACITY : plan.hours;
        for (let d = day; d <= end; d = advanceWorkDay(d)) {
          dayLoad[d] = (dayLoad[d] ?? 0) + load / span;
        }
        scheduled.add(id);
      }

      if (anyFullDay || totalHours >= DAY_CAPACITY - 0.5) {
        day = advanceWorkDay(day);
      }
    }
  }

  return { startDates, endDates, dayLoad };
}

const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const { startDates, dayLoad } = schedulePlan();

for (const task of data.tasks) {
  task.planHours = task.planHours ?? null;
  task.spanDays = task.spanDays ?? null;
  task.parallelGroup = task.parallelGroup ?? null;
  task.dependsOn = task.dependsOn ?? null;

  const plan = PLAN[task.id];
  if (!plan) continue;

  if (plan.skip) {
    task.deadline = null;
    task.planHours = null;
    task.spanDays = null;
    task.parallelGroup = null;
    task.dependsOn = null;
    continue;
  }

  task.planHours = plan.hours;
  task.spanDays = plan.spanDays ?? 1;
  task.parallelGroup = plan.parallelGroup ?? null;
  task.dependsOn = plan.after?.length ? plan.after : null;
  task.deadline = startDates[task.id] ?? null;
}

const loads = Object.entries(dayLoad)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([d, h]) => `${d.slice(5)}:${Math.round(h * 10) / 10}h`);
console.log('Day loads:', loads.join(' · '));
console.log('Range:', Object.values(startDates).sort()[0], '→', Object.values(startDates).sort().pop());

fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('Scheduled', Object.keys(startDates).length, 'plan tasks');
