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

    // Detect uncompleted task: - [ ] P1: content
    const taskMatch = line.match(/^-\s+\[\s+\]\s+(P[0-3])：(.+)/);
    if (taskMatch) {
      tasks.push({
        priority: taskMatch[1] as Task['priority'],
        system: currentSystem,
        content: taskMatch[2].trim(),
      });
    }
  }

  return tasks;
}
