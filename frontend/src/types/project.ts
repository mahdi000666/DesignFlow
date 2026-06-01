export interface ProjectAssignment {
  readonly designer_id:   number;
  readonly designer_name: string;
  readonly assigned_at:   string;
  readonly avatar_url:     string | null;
}

export interface Project {
  readonly id:           number;
  readonly client_name:  string;
  readonly client_phone: string;
  readonly client_industry: string;
  readonly actual_hours: number;
  readonly assignments:  ProjectAssignment[];
  readonly created_at:   string;
  readonly updated_at:   string;
  project_name:   string;
  description:    string;
  budget_hours:   number | null;
  budget_amount:  number | null;
  deadline:       string | null;
  status:         'Active' | 'Completed' | 'OnHold';
  category:       string;
  client:         number;
  revision_limit: number;
}

export interface ProjectPayload {
  client:        number;
  project_name:  string;
  description?:  string;
  budget_hours?: number;
  budget_amount?: number;
  deadline?:     string;
  status?:       Project['status'];
  category?:     string;
  revision_limit?: number;
}