export interface TimeLog {
  readonly id:            number;
  readonly task_name:     string;
  readonly project_id:    number;
  readonly project_name:  string;
  readonly designer_name: string;
  readonly designer_user_id: number;
  readonly created_at:    string;
  task:        number;
  designer:    number;
  hours_spent: number | string;  // DRF serializes DecimalField as string
  description: string;
}

export interface TimeLogPayload {
  task:         number;
  hours_spent:  number;
  description?: string;
}