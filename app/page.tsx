import { getInventory, getTasksMd } from '@/lib/github';
import { parseTasks } from '@/lib/parse-tasks';
import { System } from '@/lib/types';

function healthBar(score: number) {
  return Array.from({ length: 5 }, (_, i) => (i < score ? '█' : '░')).join('');
}

function statusDot(status: string) {
  if (status === 'live' || status === 'active') return { color: '#22c55e', label: '上線中' };
  if (status === 'testing') return { color: '#eab308', label: '測試中' };
  return { color: '#94a3b8', label: status };
}

function priorityColor(p: string) {
  if (p === 'P0') return '#ef4444';
  if (p === 'P1') return '#f97316';
  if (p === 'P2') return '#eab308';
  return '#94a3b8';
}

export default async function Home() {
  let systems: System[] = [];
  let tasksMd = '';

  try {
    const inventory = await getInventory();
    systems = inventory.systems;
    tasksMd = await getTasksMd();
  } catch {
    return (
      <div className="text-center py-20" style={{ color: '#ef4444' }}>
        無法讀取總部資料。請確認 GITHUB_TOKEN 環境變數已設定。
      </div>
    );
  }

  const tasks = parseTasks(tasksMd);
  const p1Tasks = tasks.filter(t => t.priority === 'P1' || t.priority === 'P0');
  const p2Tasks = tasks.filter(t => t.priority === 'P2');
  const avgHealth = systems.length
    ? (systems.reduce((s, sys) => s + sys.health_score, 0) / systems.length).toFixed(1)
    : '0';

  const navItems = [
    { label: '總覽', href: '#overview' },
    { label: '任務', href: '#tasks' },
    { label: '系統', href: '#systems' },
    { label: '部門', href: '#departments' },
  ];

  return (
    <div className="space-y-6">

      {/* 快速導航 */}
      <nav className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        {navItems.map(item => (
          <a
            key={item.href}
            href={item.href}
            className="shrink-0 text-xs font-semibold px-4 py-2 rounded-full transition-colors"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--accent)',
              textDecoration: 'none',
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* 總覽數字 */}
      <section id="overview" className="grid grid-cols-3 gap-3">
        {[
          { label: '系統總數', value: String(systems.length) },
          { label: '平均健康', value: avgHealth + '/5' },
          { label: 'P1 任務', value: String(p1Tasks.length) },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stat.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* P1 任務 */}
      {p1Tasks.length > 0 && (
        <section id="tasks">
          <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#f97316' }}>
            ⚡ 本週必須完成
          </h2>
          <div className="space-y-2">
            {p1Tasks.map((t, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded mt-0.5 shrink-0"
                  style={{ backgroundColor: priorityColor(t.priority) + '22', color: priorityColor(t.priority) }}
                >
                  {t.priority}
                </span>
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>{t.system}</div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.content}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 六系統狀態 */}
      <section id="systems">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          系統狀態
        </h2>
        <div className="space-y-2">
          {systems.map(sys => {
            const dot = statusDot(sys.status);
            const hColor = sys.health_score >= 4 ? '#22c55e' : sys.health_score >= 3 ? '#eab308' : '#ef4444';
            return (
              <div
                key={sys.id}
                className="rounded-xl px-4 py-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot.color }} />
                    <span className="font-bold text-sm">{sys.short_code}</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sys.name}</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: dot.color }}>{dot.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono tracking-wider" style={{ color: hColor }}>
                    {healthBar(sys.health_score)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {sys.pending_tasks.length} 項待辦
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* P2 任務 */}
      {p2Tasks.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
            本週推進
          </h2>
          <div className="space-y-2">
            {p2Tasks.map((t, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded mt-0.5 shrink-0"
                  style={{ backgroundColor: '#eab30822', color: '#eab308' }}
                >P2</span>
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t.system}</div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.content}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 部門架構 */}
      <section id="departments">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          部門架構
        </h2>
        <div
          className="rounded-xl px-4 py-4 divide-y"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderColor: 'var(--border)' }}
        >
          {[
            { dept: '人資部 HR', path: 'hr/', role: '員工冊・盤點・健康度' },
            { dept: '開發部 DEV', path: 'dev/', role: '功能開發・Bug・版本管理' },
            { dept: '資安部 SEC', path: 'security/', role: '安全架構・API 金鑰・存取控制' },
            { dept: '內容部 CNT', path: 'content/', role: '內容策略・Threads 規劃・文章' },
            { dept: '社群部 SOC', path: 'social/', role: 'LINE@・Threads 數據・粉絲成長' },
            { dept: '業務部 BIZ', path: 'business/', role: '合作外展・潛在客戶' },
            { dept: '知識庫 KM', path: 'knowledge/', role: '方法論・SOP・決策記錄・參考文件' },
            { dept: '策略部 STR', path: 'strategy/', role: '組織架構・長期規劃・總管模式' },
          ].map(d => (
            <div key={d.dept} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{d.dept}</span>
                <span className="text-xs" style={{ color: 'var(--accent)' }}>{d.path}</span>
              </div>
              <span className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>{d.role}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs pb-4" style={{ color: 'var(--text-secondary)' }}>
        資料每 5 分鐘自動更新 · TZLTH-HQ
      </p>
    </div>
  );
}
