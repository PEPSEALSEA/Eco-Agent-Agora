'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, Database, RefreshCcw, TrendingUp, Trophy, Users, ListTodo } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { CartoonLoading } from '@/components/CartoonLoading';
import { gasFetch } from '@/lib/gas';

const ADMIN_EMAILS = ['sealseapep@gmail.com', 'sealseapep2@gmail.com'];

type SheetRow = Record<string, any>;

type CampaignAttempt = {
  id: string;
  userId: string;
  userLabel: string;
  scenarioId: string;
  scenarioTitle: string;
  stage: number;
  status: string;
  score: number | null;
  startedAt: string;
  endedAt: string;
};

type StageSummary = {
  stage: number;
  title: string;
  plays: number;
  players: number;
  completed: number;
  averageScore: number | null;
  bestScore: number | null;
};

type UserSummary = {
  userLabel: string;
  plays: number;
  completed: number;
  levelsTried: number;
  firstScore: number | null;
  latestScore: number | null;
  improvement: number | null;
  averageScore: number | null;
  lastPlayed: string;
};

const toNumber = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatScore = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'ไม่มีข้อมูล' : `${Math.round(value)}%`;

const getTimestamp = (value: string) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

const formatStatus = (status: string) => {
  if (status === 'completed') return 'เล่นจบ';
  if (status === 'ongoing') return 'กำลังเล่น';
  if (status === 'failed') return 'ไม่สำเร็จ';
  return status || 'ไม่ทราบสถานะ';
};

export default function CampaignAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<{ users: SheetRow[]; scenarios: SheetRow[]; sessions: SheetRow[] }>({
    users: [],
    scenarios: [],
    sessions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gasFetch('read_all');
      if (data.error) throw new Error(data.error);
      setRows({
        users: Array.isArray(data.users) ? data.users : [],
        scenarios: Array.isArray(data.scenarios) ? data.scenarios : [],
        sessions: Array.isArray(data.sessions) ? data.sessions : []
      });
    } catch (err: any) {
      setError(err.message || 'โหลดข้อมูลวิเคราะห์แคมเปญไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

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
    loadData();
  }, [user, authLoading, router]);

  const analytics = useMemo(() => {
    const userById = new Map(rows.users.map(u => [String(u.id), u]));
    const scenarioById = new Map(rows.scenarios.map(s => [String(s.id), s]));

    const campaignAttempts: CampaignAttempt[] = rows.sessions
      .map(session => {
        const scenario = scenarioById.get(String(session.scenario_id));
        const scenarioMode = scenario?.mode || '';
        const stage = toNumber(session.stage) ?? toNumber(scenario?.difficulty) ?? 0;
        const isCampaign = session.mode === 'campaign' || scenarioMode === 'campaign' || stage > 0;
        if (!isCampaign) return null;

        const owner = userById.get(String(session.user_id));
        const score = toNumber(session.outcome_score);

        return {
          id: String(session.id || ''),
          userId: String(session.user_id || ''),
          userLabel: owner?.email || owner?.name || String(session.user_id || 'ไม่ทราบผู้เล่น'),
          scenarioId: String(session.scenario_id || ''),
          scenarioTitle: scenario?.title || `ด่าน ${stage || '?'}`,
          stage,
          status: String(session.status || 'unknown'),
          score,
          startedAt: String(session.started_at || ''),
          endedAt: String(session.ended_at || '')
        };
      })
      .filter(Boolean) as CampaignAttempt[];

    const scoredAttempts = campaignAttempts.filter(a => a.score !== null);
    const completedAttempts = campaignAttempts.filter(a => a.status === 'completed' || a.endedAt || a.score !== null);
    const uniquePlayers = new Set(campaignAttempts.map(a => a.userId).filter(Boolean));

    const byStage = Array.from(
      campaignAttempts.reduce((map, attempt) => {
        const key = String(attempt.stage || attempt.scenarioId);
        const current = map.get(key) || {
          stage: attempt.stage,
          title: attempt.scenarioTitle,
          attempts: [] as CampaignAttempt[]
        };
        current.attempts.push(attempt);
        if (!current.stage && attempt.stage) current.stage = attempt.stage;
        map.set(key, current);
        return map;
      }, new Map<string, { stage: number; title: string; attempts: CampaignAttempt[] }>())
    )
      .map(([, group]) => {
        const scores = group.attempts.map(a => a.score).filter((s): s is number => s !== null);
        return {
          stage: group.stage,
          title: group.title,
          plays: group.attempts.length,
          players: new Set(group.attempts.map(a => a.userId)).size,
          completed: group.attempts.filter(a => a.status === 'completed' || a.endedAt || a.score !== null).length,
          averageScore: scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null,
          bestScore: scores.length ? Math.max(...scores) : null
        };
      })
      .sort((a, b) => (a.stage || 999) - (b.stage || 999));

    const byUser = Array.from(
      campaignAttempts.reduce((map, attempt) => {
        const current = map.get(attempt.userId) || [] as CampaignAttempt[];
        current.push(attempt);
        map.set(attempt.userId, current);
        return map;
      }, new Map<string, CampaignAttempt[]>())
    )
      .map(([, attempts]) => {
        const sorted = [...attempts].sort((a, b) => getTimestamp(a.startedAt) - getTimestamp(b.startedAt));
        const scored = sorted.filter(a => a.score !== null);
        const firstScore = scored[0]?.score ?? null;
        const latestScore = scored[scored.length - 1]?.score ?? null;
        const averageScore = scored.length
          ? scored.reduce((sum, a) => sum + (a.score || 0), 0) / scored.length
          : null;
        return {
          userLabel: attempts[0].userLabel,
          plays: attempts.length,
          completed: attempts.filter(a => a.status === 'completed' || a.endedAt || a.score !== null).length,
          levelsTried: new Set(attempts.map(a => a.stage || a.scenarioId)).size,
          firstScore,
          latestScore,
          improvement: firstScore !== null && latestScore !== null && scored.length > 1 ? latestScore - firstScore : null,
          averageScore,
          lastPlayed: sorted[sorted.length - 1]?.startedAt || ''
        };
      })
      .sort((a, b) => getTimestamp(b.lastPlayed) - getTimestamp(a.lastPlayed));

    const improvingUsers = byUser.filter(u => (u.improvement ?? 0) > 0).length;
    const usersWithRepeatScores = byUser.filter(u => u.improvement !== null).length;
    const averageImprovement = usersWithRepeatScores
      ? byUser.reduce((sum, u) => sum + (u.improvement ?? 0), 0) / usersWithRepeatScores
      : null;

    return {
      campaignAttempts,
      totalPlays: campaignAttempts.length,
      completedPlays: completedAttempts.length,
      uniquePlayers: uniquePlayers.size,
      averageScore: scoredAttempts.length
        ? scoredAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / scoredAttempts.length
        : null,
      completionRate: campaignAttempts.length ? (completedAttempts.length / campaignAttempts.length) * 100 : null,
      improvingUsers,
      usersWithRepeatScores,
      averageImprovement,
      byStage,
      byUser,
      recent: [...campaignAttempts].sort((a, b) => getTimestamp(b.startedAt) - getTimestamp(a.startedAt)).slice(0, 12)
    };
  }, [rows]);

  if (loading && rows.sessions.length === 0) {
    return <CartoonLoading isOpen={true} message="กำลังโหลดสถิติ Campaign Journal..." />;
  }

  return (
    <div className="min-h-screen cartoon-bg-blue p-8 relative overflow-x-hidden">
      <CartoonLoading isOpen={loading} message="กำลังรีเฟรชสถิติ Campaign Journal..." />
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex flex-col lg:flex-row justify-between items-center mb-10 gap-5">
          <Link
            href="/admin/scenarios"
            prefetch={false}
            className="flex items-center bg-white text-gray-900 border-4 border-gray-900 px-5 py-3 rounded-2xl hover:translate-y-1 transition-all shadow-[0_7px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 font-black"
          >
            <ArrowLeft size={20} className="mr-2" />
            กลับหน้าจัดการด่าน
          </Link>

          <div className="bg-white border-[6px] border-gray-900 px-8 py-5 rounded-[2.5rem] shadow-[0_10px_0_rgba(0,0,0,1)]">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 uppercase tracking-tighter flex items-center">
              <BarChart3 size={34} className="mr-3 text-nintendo-blue" />
              สถิติ Campaign Journal
            </h1>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/progress"
              prefetch={false}
              className="flex items-center bg-nintendo-yellow text-gray-900 border-4 border-gray-900 px-4 py-3 rounded-2xl hover:translate-y-1 transition-all shadow-[0_7px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 font-black"
              title="Dev Progress"
            >
              <ListTodo size={20} />
            </Link>
            <button
              onClick={loadData}
              className="flex items-center bg-nintendo-yellow text-gray-900 border-4 border-gray-900 px-5 py-3 rounded-2xl hover:translate-y-1 transition-all shadow-[0_7px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-2 font-black"
            >
              <RefreshCcw size={20} className="mr-2" />
              รีเฟรช
            </button>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 border-[5px] border-red-900 text-red-900 p-5 rounded-2xl font-black mb-8">
            {error}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          <MetricCard icon={<Users size={28} />} label="ผู้เล่นแคมเปญ" value={analytics.uniquePlayers} color="bg-nintendo-blue" />
          <MetricCard icon={<Database size={28} />} label="จำนวนครั้งที่เล่นด่าน" value={analytics.totalPlays} color="bg-nintendo-green" />
          <MetricCard icon={<Trophy size={28} />} label="คะแนนเฉลี่ย" value={formatScore(analytics.averageScore)} color="bg-nintendo-yellow" />
          <MetricCard icon={<TrendingUp size={28} />} label="พัฒนาการเฉลี่ย" value={analytics.averageImprovement === null ? 'ไม่มีข้อมูล' : `${analytics.averageImprovement > 0 ? '+' : ''}${analytics.averageImprovement.toFixed(1)} คะแนน`} color="bg-nintendo-pink" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
          <DataPanel title="กราฟจำนวนการเล่นและคะแนนตามด่าน">
            <StageChart stages={analytics.byStage} />
          </DataPanel>

          <DataPanel title="กราฟพัฒนาการผู้เล่น">
            <ImprovementChart users={analytics.byUser} />
          </DataPanel>
        </section>

        <section className="bg-white border-[6px] border-gray-900 rounded-[2.5rem] p-8 shadow-[0_10px_0_rgba(0,0,0,1)] mb-10">
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-5">ระดับความละเอียดของการวิเคราะห์</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoBlock label="พื้นฐาน" text="ดูว่าใครเล่น เล่นด่านไหน เวลาใด เล่นจบหรือไม่ และได้คะแนนเท่าไร" />
            <InfoBlock label="พัฒนาการ" text="เปรียบเทียบคะแนนครั้งแรกกับคะแนนล่าสุดของผู้เล่นแต่ละคน" />
            <InfoBlock label="เชิงลึก" text="ใช้ผลประเมิน AI และ feedback logs เพื่ออธิบายว่าทักษะเจรจาด้านไหนเปลี่ยนไป" />
          </div>
          <p className="mt-5 text-sm font-bold text-gray-800">
            หน้านี้ใช้ข้อมูลระดับ session จาก Google Sheets ผ่าน Cloudflare Worker เป็นหลัก ถ้าต้องการรายงานทักษะเชิงลึก ควรให้ผู้เล่นเปิดหน้าสรุปผลและบันทึก AI evaluation หลังเล่นแต่ละครั้ง
          </p>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
          <DataPanel title="ผลการเล่นแยกตามด่าน">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase text-gray-700 border-b-4 border-gray-300">
                    <th className="py-3 pr-4">ด่าน</th>
                    <th className="py-3 pr-4">สถานการณ์</th>
                    <th className="py-3 pr-4">เล่น</th>
                    <th className="py-3 pr-4">ผู้เล่น</th>
                    <th className="py-3 pr-4">เล่นจบ</th>
                    <th className="py-3 pr-4">เฉลี่ย</th>
                    <th className="py-3">สูงสุด</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byStage.map(stage => (
                    <tr key={`${stage.stage}-${stage.title}`} className="border-b-2 border-gray-200 font-bold text-sm text-gray-900">
                      <td className="py-3 pr-4 font-black">{stage.stage || '-'}</td>
                      <td className="py-3 pr-4 max-w-[220px] truncate">{stage.title}</td>
                      <td className="py-3 pr-4">{stage.plays}</td>
                      <td className="py-3 pr-4">{stage.players}</td>
                      <td className="py-3 pr-4">{stage.completed}</td>
                      <td className="py-3 pr-4">{formatScore(stage.averageScore)}</td>
                      <td className="py-3">{formatScore(stage.bestScore)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataPanel>

          <DataPanel title="พัฒนาการรายผู้เล่น">
            <div className="mb-4 flex flex-wrap gap-3">
              <span className="px-4 py-2 bg-green-50 text-green-700 border-2 border-green-200 rounded-full text-xs font-black">
                ผู้เล่นที่ดีขึ้น: {analytics.improvingUsers}/{analytics.usersWithRepeatScores}
              </span>
              <span className="px-4 py-2 bg-blue-50 text-blue-700 border-2 border-blue-200 rounded-full text-xs font-black">
                อัตราเล่นจบ: {formatScore(analytics.completionRate)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase text-gray-700 border-b-4 border-gray-300">
                    <th className="py-3 pr-4">ผู้เล่น</th>
                    <th className="py-3 pr-4">เล่น</th>
                    <th className="py-3 pr-4">จำนวนด่าน</th>
                    <th className="py-3 pr-4">ครั้งแรก</th>
                    <th className="py-3 pr-4">ล่าสุด</th>
                    <th className="py-3">เปลี่ยนแปลง</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byUser.map(row => (
                    <tr key={row.userLabel} className="border-b-2 border-gray-200 font-bold text-sm text-gray-900">
                      <td className="py-3 pr-4 max-w-[220px] truncate">{row.userLabel}</td>
                      <td className="py-3 pr-4">{row.plays}</td>
                      <td className="py-3 pr-4">{row.levelsTried}</td>
                      <td className="py-3 pr-4">{formatScore(row.firstScore)}</td>
                      <td className="py-3 pr-4">{formatScore(row.latestScore)}</td>
                      <td className={`py-3 font-black ${(row.improvement || 0) > 0 ? 'text-green-700' : (row.improvement || 0) < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                        {row.improvement === null ? 'ไม่มีข้อมูล' : `${row.improvement > 0 ? '+' : ''}${row.improvement.toFixed(1)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataPanel>
        </section>

        <DataPanel title="รายการเล่นล่าสุดใน Campaign Journal">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase text-gray-700 border-b-4 border-gray-300">
                  <th className="py-3 pr-4">เวลาเริ่ม</th>
                  <th className="py-3 pr-4">ผู้เล่น</th>
                  <th className="py-3 pr-4">ด่าน</th>
                  <th className="py-3 pr-4">สถานการณ์</th>
                  <th className="py-3 pr-4">สถานะ</th>
                  <th className="py-3">คะแนน</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent.map(attempt => (
                  <tr key={attempt.id} className="border-b-2 border-gray-200 font-bold text-sm text-gray-900">
                    <td className="py-3 pr-4 whitespace-nowrap">{attempt.startedAt ? new Date(attempt.startedAt).toLocaleString('th-TH') : 'ไม่มีข้อมูล'}</td>
                    <td className="py-3 pr-4 max-w-[220px] truncate">{attempt.userLabel}</td>
                    <td className="py-3 pr-4 font-black">{attempt.stage || '-'}</td>
                    <td className="py-3 pr-4 max-w-[260px] truncate">{attempt.scenarioTitle}</td>
                    <td className="py-3 pr-4 text-xs font-black">{formatStatus(attempt.status)}</td>
                    <td className="py-3">{formatScore(attempt.score)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DataPanel>
      </div>
    </div>
  );
}

function StageChart({ stages }: { stages: StageSummary[] }) {
  const maxPlays = Math.max(1, ...stages.map(stage => stage.plays));

  if (stages.length === 0) {
    return <EmptyState text="ยังไม่มีข้อมูลการเล่นแคมเปญ" />;
  }

  return (
    <div className="space-y-5">
      {stages.map(stage => {
        const playWidth = Math.max(4, (stage.plays / maxPlays) * 100);
        const scoreWidth = stage.averageScore === null ? 0 : Math.max(4, Math.min(100, stage.averageScore));
        return (
          <div key={`${stage.stage}-${stage.title}`} className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-black text-gray-900 truncate">ด่าน {stage.stage || '-'}: {stage.title}</p>
                <p className="text-xs font-bold text-gray-700">เล่น {stage.plays} ครั้ง โดย {stage.players} ผู้เล่น</p>
              </div>
              <span className="text-sm font-black text-gray-900 whitespace-nowrap">{formatScore(stage.averageScore)}</span>
            </div>

            <div className="space-y-1">
              <BarTrack label="จำนวนการเล่น" value={`${stage.plays}`} width={playWidth} color="bg-nintendo-blue" />
              <BarTrack label="คะแนนเฉลี่ย" value={formatScore(stage.averageScore)} width={scoreWidth} color="bg-nintendo-green" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImprovementChart({ users }: { users: UserSummary[] }) {
  const rows = users.filter(user => user.improvement !== null).slice(0, 8);
  const maxAbsChange = Math.max(1, ...rows.map(user => Math.abs(user.improvement || 0)));

  if (rows.length === 0) {
    return <EmptyState text="ต้องมีผู้เล่นที่มีคะแนนอย่างน้อย 2 ครั้ง จึงจะแสดงพัฒนาการได้" />;
  }

  return (
    <div className="space-y-4">
      {rows.map(user => {
        const improvement = user.improvement || 0;
        const width = Math.max(5, (Math.abs(improvement) / maxAbsChange) * 100);
        const isPositive = improvement > 0;
        const isNegative = improvement < 0;
        return (
          <div key={user.userLabel} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <p className="font-black text-gray-900 truncate">{user.userLabel}</p>
              <span className={`text-sm font-black whitespace-nowrap ${isPositive ? 'text-green-700' : isNegative ? 'text-red-700' : 'text-gray-700'}`}>
                {improvement > 0 ? '+' : ''}{improvement.toFixed(1)} คะแนน
              </span>
            </div>
            <div className="h-8 bg-gray-100 border-2 border-gray-900 rounded-xl overflow-hidden relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-[3px] bg-gray-900/50" />
              <div
                className={`absolute top-0 bottom-0 ${isPositive ? 'left-1/2 bg-green-500' : 'right-1/2 bg-red-500'} ${improvement === 0 ? 'bg-gray-400' : ''}`}
                style={{ width: `${width / 2}%` }}
              />
            </div>
            <p className="text-xs font-bold text-gray-700">
              ครั้งแรก {formatScore(user.firstScore)} → ล่าสุด {formatScore(user.latestScore)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function BarTrack({ label, value, width, color }: { label: string; value: string; width: number; color: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr_72px] items-center gap-3">
      <span className="text-[11px] font-black text-gray-700 uppercase">{label}</span>
      <div className="h-5 bg-gray-100 border-2 border-gray-900 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-xs font-black text-gray-900 text-right">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border-4 border-dashed border-gray-300 rounded-2xl p-8 text-center">
      <p className="font-black text-gray-700">{text}</p>
    </div>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: React.ReactNode; color: string }) {
  return (
    <div className="bg-white border-[6px] border-gray-900 p-6 rounded-[2rem] shadow-[0_9px_0_rgba(0,0,0,1)]">
      <div className={`w-14 h-14 ${color} border-4 border-gray-900 rounded-2xl flex items-center justify-center text-white mb-5`}>
        {icon}
      </div>
      <p className="text-gray-700 text-xs font-black uppercase tracking-widest mb-1">{label}</p>
      <p className="text-4xl font-black text-gray-900 tracking-tighter">{value}</p>
    </div>
  );
}

function DataPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border-[6px] border-gray-900 rounded-[2.5rem] p-7 shadow-[0_10px_0_rgba(0,0,0,1)]">
      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-5">{title}</h2>
      {children}
    </section>
  );
}

function InfoBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="bg-gray-50 border-4 border-gray-900 rounded-2xl p-5">
      <p className="text-xs font-black text-nintendo-blue uppercase tracking-widest mb-2">{label}</p>
      <p className="text-sm font-bold text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}
