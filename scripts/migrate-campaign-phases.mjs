/**
 * Expand campaign scenarios from 1 phase → 4-phase system in Google Sheets.
 * Run: node scripts/migrate-campaign-phases.mjs          (dry-run)
 *      node scripts/migrate-campaign-phases.mjs --apply  (write to DB)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const apply = process.argv.includes('--apply');

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const env = {};
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq === -1) continue;
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
    return env;
  }
  throw new Error('Missing .env or .env.local');
}

async function api(env, body) {
  const res = await fetch(env.NEXT_PUBLIC_GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...body, key: env.NEXT_PUBLIC_GAS_SECRET_KEY }),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 300));
  }
}

function charIds(scenario) {
  return (scenario.characters || []).map(c => c.id).filter(Boolean);
}

function isBoss(scenario) {
  return scenario.title?.includes('[BOSS]') || Number(scenario.difficulty) >= 5;
}

/** Expand single-phase campaign → opening / conflict / negotiation / resolution */
function expandPhaseRules(scenario) {
  const pr = typeof scenario.phase_rules === 'string'
    ? JSON.parse(scenario.phase_rules)
    : { ...(scenario.phase_rules || {}) };

  if (!Array.isArray(pr.phases) || pr.phases.length === 0) return null;
  if (pr.phases.length > 1) return null;

  const [opening] = pr.phases;
  const ids = charIds(scenario);
  const charA = ids[0] || 'char_A';
  const charB = ids[1] || 'char_B';
  const boss = isBoss(scenario);

  const openingPhase = {
    ...opening,
    id: opening.id || 'opening',
    name: opening.name || 'เข้าใจปัญหา',
    turn_limit: opening.turn_limit ?? (boss ? 4 : 3),
    advance_condition: opening.advance_condition || `player รับฟังทั้ง ${charA} และ ${charB} อย่างน้อยฝ่ายละ 1 ครั้ง`,
    ai_behavior: opening.ai_behavior || 'ตัวละครอธิบายจุดยืน ยังไม่ปิดทางเจรจา',
  };

  const conflictLimit = boss ? 5 : 4;
  const negotiationLimit = boss ? 6 : 5;
  const resolutionLimit = boss ? 4 : 3;

  const phases = [
    openingPhase,
    {
      id: 'conflict',
      name: 'รับมือประเด็นร้อน',
      description: 'อารมณ์ตึงขึ้น ต้องลดความขัดแย้งก่อนต่อรอง',
      turn_limit: conflictLimit,
      advance_condition: `player รับรู้ความรู้สึกของทั้งสองฝ่าย และลด anger ของอย่างน้อย 1 ตัวละคร`,
      ai_behavior: 'ตัวละครแสดงความไม่พอใจชัดขึ้น แต่ยังเปิดรับการคุยถ้าได้รับการเคารพ',
    },
    {
      id: 'negotiation',
      name: 'แลกเปลี่ยนข้อเสนอ',
      description: 'หาทางออกที่ทั้งสองฝ่ายยอมรับได้',
      turn_limit: negotiationLimit,
      advance_condition: `มีข้อเสนอที่ทั้งสองฝ่ายยอมรับได้อย่างน้อย 1 ข้อ`,
      ai_behavior: 'ตัวละครเสนอทางเลือกและต่อรองอย่างสมเหตุสมผล',
    },
    {
      id: 'resolution',
      name: 'สรุปข้อตกลง',
      description: 'ปิดดีลและยืนยันขั้นตอนถัดไป',
      turn_limit: resolutionLimit,
      advance_condition: `player สรุปข้อตกลงและทั้งสองฝ่ายยืนยัน`,
      ai_behavior: 'ตัวละครสรุปและยืนยันข้อตกลงร่วมกัน',
    },
  ];

  const turnBudget = phases.reduce((s, p) => s + (p.turn_limit || 0), 0) + (boss ? 4 : 2);
  const angerCap = boss ? 9 : 8;

  const win = pr.win_condition || 'มี agreements >= 1 ข้อ และทั้งสองฝ่ายยืนยันข้อตกลง';

  return {
    phases,
    win_condition: win,
    fail_conditions: [
      `turn_total > ${turnBudget}`,
      `${charA}.anger >= ${angerCap}`,
      `${charB}.anger >= ${angerCap}`,
    ],
  };
}

function fixInitialState(scenario, phaseRules) {
  const firstPhaseId = phaseRules.phases[0]?.id || 'opening';
  const is = typeof scenario.initial_state === 'string'
    ? JSON.parse(scenario.initial_state || '{}')
    : { ...(scenario.initial_state || {}) };
  const ids = charIds(scenario);

  const relationships = { ...(is.relationships || {}) };
  for (const id of ids) {
    if (!relationships[id]) {
      relationships[id] = { trust: 5, anger: 4, concessions_made: [] };
    }
  }

  return {
    ...is,
    current_phase: firstPhaseId,
    phase_turn_count: is.phase_turn_count ?? 0,
    turn_total: is.turn_total ?? 0,
    unlocked_characters: is.unlocked_characters?.length ? is.unlocked_characters : ids,
    relationships,
    phase_flags: is.phase_flags || {},
    agreements: is.agreements || {},
    resolved_issues: is.resolved_issues || [],
    pending_issues: is.pending_issues?.length ? is.pending_issues : [],
    score: is.score ?? 0,
  };
}

async function main() {
  const env = loadEnv();
  const url = new URL(env.NEXT_PUBLIC_GAS_URL);
  url.searchParams.set('action', 'read_all');
  url.searchParams.set('key', env.NEXT_PUBLIC_GAS_SECRET_KEY);
  const all = await (await fetch(url)).json();
  if (all.error) throw new Error(all.error);

  const campaigns = (all.scenarios || [])
    .filter(s => s.mode === 'campaign')
    .sort((a, b) => Number(a.difficulty) - Number(b.difficulty));

  const plan = [];

  for (const s of campaigns) {
    const phase_rules = expandPhaseRules(s);
    if (!phase_rules) {
      console.log('SKIP', s.difficulty, s.title, '— already multi-phase');
      continue;
    }
    const initial_state = fixInitialState(s, phase_rules);
    plan.push({
      id: s.id,
      difficulty: s.difficulty,
      title: s.title,
      data: { phase_rules, initial_state },
    });
  }

  // Rename duplicate freeplay copy of campaign stage 1
  const dup = (all.scenarios || []).find(
    s => s.mode === 'freeplay' && s.title === campaigns[0]?.title
  );
  if (dup) {
    plan.push({
      id: dup.id,
      difficulty: 'freeplay',
      title: dup.title,
      data: {
        title: '[ฝึกซ้อม] ' + dup.title,
        description: (dup.description || '') + ' (โหมดฝึกซ้อม — ไม่นับใน campaign map)',
      },
    });
  }

  console.log(apply ? '=== APPLY ===' : '=== DRY RUN ===');
  for (const item of plan) {
    const phaseCount = item.data.phase_rules?.phases?.length;
    console.log(
      item.difficulty,
      item.title?.slice(0, 45),
      phaseCount ? `→ ${phaseCount} phases` : '→ rename freeplay duplicate'
    );
    if (apply) {
      const result = await api(env, {
        action: 'update',
        table: 'scenarios',
        id: item.id,
        data: item.data,
      });
      if (result.error) throw new Error(`${item.id}: ${result.error}`);
      console.log('  ✓ updated', item.id);
      await new Promise(r => setTimeout(r, 400));
    }
  }

  if (!apply) {
    console.log('\nRe-run with --apply to write to Google Sheets');
    fs.writeFileSync(
      path.join(root, 'data', 'campaign-phase-migration-plan.json'),
      JSON.stringify(plan, null, 2),
      'utf8'
    );
    console.log('Wrote data/campaign-phase-migration-plan.json');
  } else {
    console.log('\nDone. Run: npm run db:snapshot');
  }
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
