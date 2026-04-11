import Anthropic from '@anthropic-ai/sdk';
import { getInventory, getTasksMd, getContentCalendar, getOutreachLog, getFinanceReport } from '@/lib/github';

const SYSTEM_PROMPT = `你是職涯停看聽總部（TZLTH-HQ）的 CEO 助理，協助顧問蒲朝棟 Tim 管理工作室的各項系統與營運。

職責：
- 分析提供的系統資料，給出清晰、可行動的建議
- 使用繁體中文回應，語氣直接、不廢話
- 重點優先，結論先說
- 適當使用 markdown（## 標題、- 清單、**粗體**）

工作室資料：
- 名稱：職涯停看聽
- 顧問：蒲朝棟 Tim（CDA 認證職涯顧問、104 職涯引導師）
- 定位：協助 3-10 年工作經驗的職場人士解決履歷、求職、轉職問題
- 12 部門：HR / DEV / SEC / CNT / SOC / BIZ / KM / STR / FIN / CRM / PRD / LEG`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY 未設定，請在 Vercel 環境變數中新增此金鑰。', { status: 503 });
  }

  const { command } = await req.json() as { command: string };
  if (!command?.trim()) {
    return new Response('指令不能為空', { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Fetch relevant GitHub data based on command keywords
  let dataContext = '';
  const lowerCmd = command.toLowerCase();
  const needsFullData = lowerCmd.includes('週報') || lowerCmd.includes('健康') ||
                        lowerCmd.includes('總管') || lowerCmd.includes('盤點') ||
                        lowerCmd.includes('全局');

  try {
    if (needsFullData) {
      const [inventory, tasks, content, outreach, finance] = await Promise.allSettled([
        getInventory(),
        getTasksMd(),
        getContentCalendar(),
        getOutreachLog(),
        getFinanceReport(),
      ]);

      if (inventory.status === 'fulfilled') {
        dataContext += `\n\n## 系統清單（inventory）\n\`\`\`json\n${JSON.stringify(inventory.value, null, 2)}\n\`\`\``;
      }
      if (tasks.status === 'fulfilled' && tasks.value) {
        dataContext += `\n\n## 任務清單（tasks.md）\n${tasks.value}`;
      }
      if (content.status === 'fulfilled' && content.value) {
        dataContext += `\n\n## 內容行事曆\n${content.value}`;
      }
      if (outreach.status === 'fulfilled' && outreach.value) {
        dataContext += `\n\n## 外展記錄\n${outreach.value}`;
      }
      if (finance.status === 'fulfilled' && finance.value) {
        dataContext += `\n\n## 財務報告\n${finance.value}`;
      }
    } else if (lowerCmd.includes('任務')) {
      const tasks = await getTasksMd().catch(() => '');
      if (tasks) dataContext += `\n\n## 任務清單\n${tasks}`;
    } else if (lowerCmd.includes('內容') || lowerCmd.includes('排程')) {
      const content = await getContentCalendar().catch(() => '');
      if (content) dataContext += `\n\n## 內容行事曆\n${content}`;
    } else if (lowerCmd.includes('財務') || lowerCmd.includes('收入')) {
      const finance = await getFinanceReport().catch(() => '');
      if (finance) dataContext += `\n\n## 財務報告\n${finance}`;
    } else if (lowerCmd.includes('外展') || lowerCmd.includes('合作')) {
      const outreach = await getOutreachLog().catch(() => '');
      if (outreach) dataContext += `\n\n## 外展記錄\n${outreach}`;
    }
  } catch {
    // proceed without data context
  }

  const userMessage = dataContext
    ? `${command}\n\n---\n以下是當前系統資料供你分析：${dataContext}`
    : command;

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        });

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知錯誤';
        controller.enqueue(encoder.encode(`\n\n⚠️ 執行失敗：${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
