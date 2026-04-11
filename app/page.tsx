import { getInventory, getTasksMd } from '@/lib/github';
import { parseTasks } from '@/lib/parse-tasks';
import { SystemCard } from '@/components/SystemCard';

function priorityColor(p: string) {
  if (p === 'P0') return '#ef4444';
  if (p === 'P1') return '#f97316';
  if (p === 'P2') return '#eab308';
  return '#94a3b8';
}

const departments = [
  { dept: '人資部 HR',  role: '員工冊・盤點・健康度' },
  { dept: '開發部 DEV', role: '功能開發・Bug・版本管理' },
  { dept: '資安部 SEC', role: '安全架構・API 金鑰・存取控制' },
  { dept: '內容部 CNT', role: '內容策略・Threads 規劃・文章' },
  { dept: '社群部 SOC', role: 'LINE@・Threads 數據・粉絲成長' },
  { dept: '業務部 BIZ', role: '合作外展・潛在客戶' },
  { dept: '知識庫 KM',  role: '方法論・SOP・決策記錄・參考文件' },
  { dept: '策略部 STR', role: '組織架構・長期規劃・總管模式' },
  { dept: '財務部 FIN', role: '收入・支出・月淨利・未收款' },
  { dept: '客戶部 CRM', role: '諮詢記錄・來源追蹤・回訪轉介紹' },
  { dept: '產品部 PRD', role: '診斷・預約・產品路線圖・轉換率' },
  { dept: '法務部 LEG', role: '服務條款・隱私政策・合作合約' },
];

export default async function Home() {
  let systems = [];
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
    ? (systems.reduce((s: number, sys: { health_score: number }) => s + sys.health_score, 0) / systems.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">

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
      <section id="tasks">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#f97316' }}>
          ⚡ 本週必須完成
        </h2>
        {p1Tasks.length > 0 ? (
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
        ) : (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: '#22c55e' }}>
            ✓ 本週無緊急任務
          </div>
        )}

        {/* P2 任務 */}
        {p2Tasks.length > 0 && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold tracking-widest uppercase mb-2 mt-4" style={{ color: 'var(--text-secondary)' }}>
              本週推進
            </h3>
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
          </div>
        )}
      </section>

      {/* 系統狀態（可展開） */}
      <section id="systems">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          系統狀態 <span className="normal-case font-normal ml-1">（點擊展開詳情）</span>
        </h2>
        <div className="space-y-2">
          {systems.map((sys: Parameters<typeof SystemCard>[0]['sys']) => (
            <SystemCard key={sys.id} sys={sys} />
          ))}
        </div>
      </section>

      {/* 部門架構 */}
      <section id="departments">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          部門架構
        </h2>
        <div
          className="rounded-xl px-4 py-2 divide-y"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {departments.map(d => (
            <div key={d.dept} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{d.dept}</span>
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
