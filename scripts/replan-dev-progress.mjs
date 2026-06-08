import fs from 'fs';

const path = 'src/data/devProgress.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const SPLITS = {
  'p1-7': { parts: 2, titleSuffix: [' — draft', ' — polish'] },
  'p1-15': { parts: 2, titleSuffix: [' — รอบ 1-5', ' — รอบ 6-10 + balance'] },
  'p2-20': { parts: 3, titleSuffix: [' — layout', ' — path animation', ' — polish'] },
  'p3-25': { parts: 2, titleSuffix: [' — worker routes', ' — migrate client'] },
  'p3-26': { parts: 3, titleSuffix: [' — wire frontend', ' — audio pipeline', ' — test'] },
  'p3-27': { parts: 2, titleSuffix: [' — backend', ' — UI'] },
  'p3-29': { parts: 2, titleSuffix: [' — charts', ' — filters + export'] },
};

const STACKS = [
  ['p0-1', 'p0-2'],
  ['p0-3', 'p0-4'],
  ['p0-5', 'p0-6'],
];

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

const PLAN_ORDER = [];
for (const t of data.tasks) {
  if (!/^p[0-3]-/.test(t.id)) continue;
  if (t.id === 'p3-28') continue;
  const split = SPLITS[t.id];
  if (split) {
    for (let i = 0; i < split.parts; i++) {
      PLAN_ORDER.push({ baseId: t.id, part: i });
    }
  } else {
    PLAN_ORDER.push({ baseId: t.id, part: null });
  }
}

const schedule = {};
let day = nextWorkDay(new Date().toISOString().slice(0, 10));
const stacked = new Set(STACKS.flat());

for (const stack of STACKS) {
  for (const id of stack) schedule[id] = day;
  day = advanceWorkDay(day);
}

for (const item of PLAN_ORDER) {
  const id = item.baseId;
  if (stacked.has(id)) continue;
  if (item.part !== null) {
    const key = id + (item.part === 0 ? '' : String.fromCharCode(97 + item.part));
    schedule[key] = day;
    day = advanceWorkDay(day);
  } else if (!schedule[id]) {
    schedule[id] = day;
    day = advanceWorkDay(day);
  }
}

const newTasks = [];
for (const task of data.tasks) {
  if (!SPLITS[task.id]) {
    if (schedule[task.id] !== undefined) {
      task.deadline = schedule[task.id];
      if (task.effort?.includes('วัน')) task.effort = '1 วัน';
    }
    if (task.id === 'p3-28') task.deadline = null;
    newTasks.push(task);
    continue;
  }
  const { parts, titleSuffix } = SPLITS[task.id];
  for (let i = 0; i < parts; i++) {
    const suffix = titleSuffix[i] || ` — วัน ${i + 1}`;
    const id = i === 0 ? task.id : task.id + String.fromCharCode(97 + i);
    const clone = {
      ...task,
      id,
      title: task.title.replace(/ \(.*\)$/, '') + suffix,
      effort: '1 วัน',
      deadline: schedule[id],
    };
    if (i > 0) clone.notes = (task.notes ? task.notes + ' · ' : '') + 'ต่อจาก ' + task.id;
    newTasks.push(clone);
  }
}
data.tasks = newTasks;

const dates = Object.values(schedule).sort();
console.log('Schedule:', dates[0], '→', dates[dates.length - 1], `(${dates.length} task-days)`);
fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log('Done. Tasks:', data.tasks.length);
