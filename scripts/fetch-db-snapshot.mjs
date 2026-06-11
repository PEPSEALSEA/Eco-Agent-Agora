/**
 * Pull read_all from Cloudflare Worker → data/db-snapshot.json
 * Run: npm run db:snapshot
 * Requires .env.local with NEXT_PUBLIC_GAS_URL + NEXT_PUBLIC_GAS_SECRET_KEY
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outPath = path.join(root, 'data', 'db-snapshot.json');

function loadEnvLocal() {
  const envPath = ['.env.local', '.env'].map(n => path.join(root, n)).find(p => fs.existsSync(p));
  if (!envPath) {
    throw new Error('Missing .env.local or .env — set NEXT_PUBLIC_GAS_URL + NEXT_PUBLIC_GAS_SECRET_KEY');
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function pickScenario(s) {
  return {
    id: s.id,
    title: s.title,
    mode: s.mode || 'freeplay',
    difficulty: s.difficulty ?? null,
    target_group: s.target_group,
    has_phase_rules: Boolean(s.phase_rules),
    has_initial_state: Boolean(s.initial_state),
    character_count: Array.isArray(s.characters) ? s.characters.length : 0,
  };
}

function pickSession(s) {
  return {
    id: s.id,
    user_id: s.user_id,
    scenario_id: s.scenario_id,
    status: s.status,
    mode: s.mode,
    stage: s.stage,
    outcome_score: s.outcome_score,
    started_at: s.started_at,
    ended_at: s.ended_at,
    has_evaluation: Boolean(s.ai_evaluation),
  };
}

async function main() {
  const env = loadEnvLocal();
  const baseUrl = env.NEXT_PUBLIC_GAS_URL;
  const key = env.NEXT_PUBLIC_GAS_SECRET_KEY;

  if (!baseUrl || !key) {
    throw new Error('Set NEXT_PUBLIC_GAS_URL and NEXT_PUBLIC_GAS_SECRET_KEY in .env.local');
  }

  const url = new URL(baseUrl);
  url.searchParams.set('action', 'read_all');
  url.searchParams.set('key', key);

  console.log('Fetching', url.origin + url.pathname + '?action=read_all&key=***');
  const res = await fetch(url.toString());
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON from worker: ' + text.slice(0, 200));
  }
  if (data.error) throw new Error(data.error);

  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const users = Array.isArray(data.users) ? data.users : [];
  const skillProgress = Array.isArray(data.skill_progress) ? data.skill_progress : [];

  const campaign = scenarios.filter(s => s.mode === 'campaign').sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
  const freeplay = scenarios.filter(s => s.mode !== 'campaign');

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    source: 'Cloudflare Worker → Google Sheets (read_all)',
    summary: {
      users: users.length,
      scenarios_total: scenarios.length,
      campaign_stages: campaign.length,
      freeplay_scenarios: freeplay.length,
      sessions_total: sessions.length,
      sessions_completed: sessions.filter(s => s.status === 'completed' || Number(s.outcome_score) > 0).length,
      skill_progress_rows: skillProgress.length,
      messages: Array.isArray(data.messages) ? data.messages.length : 0,
      feedback_logs: Array.isArray(data.feedback_logs) ? data.feedback_logs.length : 0,
    },
    campaign,
    freeplay: freeplay.map(pickScenario),
    scenarios: scenarios.map(pickScenario),
    recent_sessions: sessions
      .slice()
      .sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0))
      .slice(0, 20)
      .map(pickSession),
    users: users.map(u => ({
      id: u.id,
      email: u.email,
      streak_count: u.streak_count,
      last_active_date: u.last_active_date,
    })),
    skill_progress: skillProgress.map(s => ({
      user_id: s.user_id,
      skill_name: s.skill_name,
      level: s.level,
      xp: s.xp,
    })),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log('Wrote', outPath);
  console.log('Summary:', JSON.stringify(snapshot.summary, null, 2));
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
