'use client';

import { useState, useRef, useEffect } from 'react';

const PRESET_COMMANDS = [
  { label: '週報', command: '給我本週週報，分析各系統狀態與本週最重要的事', icon: '📊' },
  { label: '健康檢查', command: '執行健康檢查，列出所有系統健康分數，標出 ≤3 的警示與建議', icon: '🔍' },
  { label: '總管模式', command: '進入總管模式，給出全局分析、本週最重要一件事、跨系統風險', icon: '🎯' },
  { label: '本週任務', command: '整理本週 P1/P2 任務，按優先順序給出具體執行建議', icon: '✅' },
  { label: '內容建議', command: '分析內容行事曆，給出本週內容執行建議與下一步行動', icon: '✏️' },
  { label: '財務摘要', command: '分析本月財務狀況，給出收入支出摘要與建議', icon: '💰' },
];

function renderOutput(text: string) {
  // Simple markdown-like rendering: convert ** ** and ## to styled spans
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^## (.+)$/gm, '<span class="cmd-h2">$1</span>')
    .replace(/^### (.+)$/gm, '<span class="cmd-h3">$1</span>');
}

export function CommandCenter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output to bottom as it streams
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function execute(command: string) {
    if (!command.trim()) return;
    if (loading) {
      abortRef.current?.abort();
      setLoading(false);
      return;
    }

    setLoading(true);
    setOutput('');

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        setOutput('⚠️ ' + errText);
        return;
      }

      if (!res.body) {
        setOutput('⚠️ 無回應');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setOutput(accumulated);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setOutput('⚠️ 執行失敗：' + err.message);
      }
    } finally {
      setLoading(false);
      setActivePreset(null);
    }
  }

  function handlePreset(cmd: (typeof PRESET_COMMANDS)[0]) {
    setActivePreset(cmd.label);
    setInput(cmd.command);
    execute(cmd.command);
  }

  function handleClear() {
    setOutput('');
    setInput('');
    setActivePreset(null);
  }

  return (
    <section id="command">
      <h2
        className="text-xs font-semibold tracking-widest uppercase mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        指令中心
      </h2>
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        {/* Preset chips */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COMMANDS.map((cmd) => (
            <button
              key={cmd.label}
              onClick={() => handlePreset(cmd)}
              disabled={loading && activePreset !== cmd.label}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={{
                backgroundColor:
                  activePreset === cmd.label ? 'var(--accent)' : 'var(--bg-primary)',
                border:
                  '1px solid ' +
                  (activePreset === cmd.label ? 'var(--accent)' : 'var(--border)'),
                color:
                  activePreset === cmd.label ? '#ffffff' : 'var(--text-secondary)',
                opacity: loading && activePreset !== cmd.label ? 0.4 : 1,
                cursor:
                  loading && activePreset !== cmd.label ? 'not-allowed' : 'pointer',
              }}
            >
              {cmd.icon} {cmd.label}
            </button>
          ))}
        </div>

        {/* Custom input row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) execute(input);
            }}
            placeholder="輸入自訂指令，例如：分析外展進度"
            disabled={loading}
            className="flex-1 text-sm px-3 py-2 rounded-lg outline-none cmd-input"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={() => (loading ? abortRef.current?.abort() : execute(input))}
            className="text-xs font-bold px-4 py-2 rounded-lg shrink-0 transition-colors"
            style={{
              backgroundColor: loading ? '#ef444420' : 'var(--accent)',
              color: loading ? '#ef4444' : '#ffffff',
              border: loading ? '1px solid #ef444440' : '1px solid transparent',
            }}
          >
            {loading ? '停止' : '執行'}
          </button>
        </div>

        {/* Output area */}
        {(output || loading) && (
          <div
            ref={outputRef}
            className="rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap cmd-output"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              maxHeight: '420px',
              overflowY: 'auto',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
            dangerouslySetInnerHTML={{
              __html: output
                ? renderOutput(output)
                : '<span style="opacity:0.4">▋</span>',
            }}
          />
        )}

        {/* Clear button — only when there's output and not loading */}
        {output && !loading && (
          <button
            onClick={handleClear}
            className="text-xs"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            清除結果
          </button>
        )}
      </div>
    </section>
  );
}
