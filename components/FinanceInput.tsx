'use client';
import { useState } from 'react';
import type { FinanceEntry } from '@/lib/finance';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '@/lib/finance';

interface Props {
  onSuccess: (entry: FinanceEntry) => void;
}

function todayTaipei(): string {
  // 台灣 UTC+8，Vercel 執行環境為 UTC
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function FinanceInput({ onSuccess }: Props) {
  const [entryType, setEntryType]       = useState<'income' | 'expense'>('income');
  const [date, setDate]                 = useState(todayTaipei());
  const [type, setType]                 = useState('顧問諮詢');
  const [amount, setAmount]             = useState('');
  const [paymentMethod, setPaymentMethod] = useState('銀行轉帳');
  const [note, setNote]                 = useState('');
  const [status, setStatus]             = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg]         = useState('');

  const categories = entryType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleTypeSwitch = (t: 'income' | 'expense') => {
    setEntryType(t);
    setType(t === 'income' ? '顧問諮詢' : '臨時支出');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setErrorMsg('請輸入有效金額'); return; }

    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/finance/add-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          entry_type: entryType,
          type,
          amount: Number(amount),
          payment_method: paymentMethod,
          note,
        }),
      });
      const data = await res.json() as { success?: boolean; entry?: FinanceEntry; error?: string };
      if (!res.ok || !data.success || !data.entry) {
        setStatus('error');
        setErrorMsg(data.error ?? '新增失敗，請稍後再試');
        return;
      }
      setStatus('success');
      onSuccess(data.entry);
      // 重置表單（保留日期）
      setAmount('');
      setNote('');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setErrorMsg('網路錯誤，請稍後再試');
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '14px',
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '4px',
    display: 'block',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">

      {/* 收入 / 支出 切換 */}
      <div className="flex gap-2">
        {(['income', 'expense'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeSwitch(t)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{
              backgroundColor: entryType === t
                ? (t === 'income' ? '#22c55e' : '#ef4444')
                : 'var(--bg-primary)',
              color: entryType === t ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${entryType === t ? (t === 'income' ? '#22c55e' : '#ef4444') : 'var(--border)'}`,
            }}
          >
            {t === 'income' ? '＋ 收入' : '－ 支出'}
          </button>
        ))}
      </div>

      {/* 日期 */}
      <div>
        <label style={labelStyle}>日期</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          style={inputStyle}
        />
      </div>

      {/* 分類 */}
      <div>
        <label style={labelStyle}>分類</label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={inputStyle}
        >
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 金額 */}
      <div>
        <label style={labelStyle}>金額（NT$）</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-secondary)' }}>NT$</span>
          <input
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            required
            style={{ ...inputStyle, paddingLeft: '44px' }}
          />
        </div>
      </div>

      {/* 付款方式 */}
      <div>
        <label style={labelStyle}>付款方式</label>
        <select
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
          style={inputStyle}
        >
          {PAYMENT_METHODS.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* 備註 */}
      <div>
        <label style={labelStyle}>備註（選填）</label>
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="例：C-202604-001 諮詢費"
          style={inputStyle}
        />
      </div>

      {/* 錯誤訊息 */}
      {errorMsg && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#ef444415', color: '#ef4444', border: '1px solid #ef444440' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* 送出 */}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity"
        style={{
          backgroundColor: status === 'success'
            ? '#22c55e'
            : (entryType === 'income' ? '#22c55e' : '#ef4444'),
          color: '#fff',
          opacity: status === 'loading' ? 0.6 : 1,
          border: 'none',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'loading' ? '新增中…' : status === 'success' ? '✓ 已新增' : `新增${entryType === 'income' ? '收入' : '支出'}記錄`}
      </button>
    </form>
  );
}
