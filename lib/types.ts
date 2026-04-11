export interface System {
  id: string;
  name: string;
  short_code: string;
  type: string;
  status: string;
  url: string | null;
  local_path: string;
  tech: string;
  health_score: number;
  last_updated: string;
  pending_tasks: string[];
  notes: string;
  hq_archive_status: string;
  current_followers?: number;
  follower_recorded_at?: string;
}

export interface Inventory {
  last_updated: string;
  total_systems: number;
  systems: System[];
}

export interface Task {
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  system: string;
  content: string;
}

export interface TaskSection {
  title: string;
  tasks: Task[];
}
