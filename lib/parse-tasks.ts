import { Task } from './types';

export function parseTasks(md: string): Task[] {
  const tasks: Task[] = [];
  let currentSystem = '';

  const lines = md.split('\n');
  for (const line of lines) {
    // Detect system heading (### 系統名稱)
    const headingMatch = line.match(/^###\s+(.+)/);
    if (headingMatch) {
      currentSystem = headingMatch[1].split(' ')[0]; // first word = system name
      continue;
    }

    // Detect uncompleted task: - [ ] P1：content，或進行中 - [~] P2：content
    // [2026-09-30 L1105] 原本只收 `[ ]` ⇒ 進行中 `[~]` 的 P2 任務（例：說明書格式推廣）在儀表板消失。
    // 仍只收頂層行（縮排子項不收）；P3 由 page.tsx 決定不顯示（刻意只放 P1/P2）。
    const taskMatch = line.match(/^-\s+\[(\s|~)\]\s+(P[0-3])：(.+)/);
    if (taskMatch) {
      tasks.push({
        priority: taskMatch[2] as Task['priority'],
        system: currentSystem,
        content: taskMatch[3].trim(),
        inProgress: taskMatch[1] === '~',
      });
    }
  }

  return tasks;
}
