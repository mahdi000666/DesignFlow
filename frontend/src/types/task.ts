export interface Task {
  readonly id:           number;
  readonly project_name: string;
  readonly created_at:   string;
  readonly completed_at: string | null;
  readonly subtasks:     Task[];
  project:          number;
  parent_task:      number | null;
  task_name:        string;
  description:      string;
  estimated_hours:  number | null;
  status:           'Todo' | 'InProgress' | 'Completed';
  is_unplanned:     boolean;
}

export interface TaskPayload {
  project:          number;
  parent_task?:     number | null;
  task_name:        string;
  description?:     string;
  estimated_hours?: number | null;
  status?:          Task['status'];
  is_unplanned?:    boolean;
}

export interface HourEstimate {
  estimated_hours: number | null;
  reasoning:       string;
}