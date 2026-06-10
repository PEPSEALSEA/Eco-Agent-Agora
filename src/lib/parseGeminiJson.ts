export type AudioAnalysisResult = {
  text: string;
  vibe: string;
  intensity: number;
  context_note: string;
};

/** Strip markdown fences, repair common Gemini JSON mistakes, close brackets. */
export function repairGeminiJsonText(raw: string): string {
  let clean = raw.trim();
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }

  clean = clean.replace(/\}\s*",\s*"state_delta"/g, '}], "state_delta"');
  clean = clean.replace(/,\s*([\]}])/g, '$1');
  clean = clean.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
  clean = clean.replace(/[\u201c\u201d]/g, '"');
  clean = clean.replace(/[\u2018\u2019]/g, "'");

  let openBraces = (clean.match(/\{/g) || []).length;
  let closeBraces = (clean.match(/\}/g) || []).length;
  let openBrackets = (clean.match(/\[/g) || []).length;
  let closeBrackets = (clean.match(/\]/g) || []).length;

  while (openBrackets > closeBrackets) {
    clean += ']';
    closeBrackets++;
  }
  while (openBraces > closeBraces) {
    clean += '}';
    closeBraces++;
  }

  return clean;
}

function extractQuotedField(raw: string, key: string): string | null {
  const marker = `"${key}"`;
  const idx = raw.indexOf(marker);
  if (idx === -1) return null;

  const colon = raw.indexOf(':', idx + marker.length);
  if (colon === -1) return null;

  let i = colon + 1;
  while (i < raw.length && /\s/.test(raw[i])) i++;
  if (raw[i] !== '"') return null;

  i++;
  let result = '';
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\') {
      const next = raw[i + 1];
      if (next === 'n') result += '\n';
      else if (next === 't') result += '\t';
      else if (next === 'r') result += '\r';
      else if (next) result += next;
      i += 2;
      continue;
    }
    if (ch === '"') break;
    result += ch;
    i++;
  }
  return result;
}

function extractNumberField(raw: string, key: string): number | null {
  const re = new RegExp(`"${key}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`);
  const m = raw.match(re);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** Last-resort field extraction when JSON.parse still fails (common with long Thai strings). */
export function extractAudioAnalysisFallback(raw: string): AudioAnalysisResult | null {
  const text = extractQuotedField(raw, 'text');
  if (!text) return null;

  const vibe = extractQuotedField(raw, 'vibe') || 'Neutral';
  const intensity = extractNumberField(raw, 'intensity') ?? 0.5;
  const context_note = extractQuotedField(raw, 'context_note') || '';

  return normalizeAudioAnalysis({ text, vibe, intensity, context_note });
}

export function normalizeAudioAnalysis(raw: Partial<AudioAnalysisResult>): AudioAnalysisResult {
  const vibeRaw = String(raw.vibe || 'Neutral').trim();
  const allowed = ['Happy', 'Calm', 'Serious', 'Neutral'];
  const vibe = allowed.find((v) => v.toLowerCase() === vibeRaw.toLowerCase()) || vibeRaw || 'Neutral';

  return {
    text: String(raw.text || '').trim(),
    vibe,
    intensity: Math.min(1, Math.max(0, Number(raw.intensity) || 0.5)),
    context_note: String(raw.context_note || '').trim(),
  };
}

export function parseGeminiJson<T = unknown>(raw: string): T {
  const clean = repairGeminiJsonText(raw);
  try {
    return JSON.parse(clean) as T;
  } catch (e) {
    console.warn('parseGeminiJson: standard parse failed, text length', clean.length);
    throw e;
  }
}

export function parseAudioAnalysisJson(raw: string): AudioAnalysisResult {
  try {
    const parsed = parseGeminiJson<Partial<AudioAnalysisResult>>(raw);
    if (!parsed?.text) throw new Error('Missing text field');
    return normalizeAudioAnalysis(parsed);
  } catch {
    const fallback = extractAudioAnalysisFallback(raw);
    if (fallback) return fallback;
    throw new Error('ไม่สามารถอ่านผลวิเคราะห์เสียงจาก AI ได้');
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
