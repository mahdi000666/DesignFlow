export interface DesignerCard {
  designer_id:              number;
  designer_name:            string;
  specialization:           string;
  hourly_rate:              string | null;
  available_hours_per_week: number | null;
  logged_hours_this_week:   number;
  utilization_pct:          number | null;
  active_projects:          string[];
  is_active:                boolean;
  avatar_url:               string | null;
}

export interface TeamUser {
  id:             number;
  full_name:      string;
  email:          string;
  role:           'Manager' | 'Designer' | 'Client';
  specialization: string;
  is_active:      boolean;
  avatar_url:     string | null;
}

export interface TeamData {
  designers: DesignerCard[];
  users:     TeamUser[];
}

export interface InviteUserPayload {
  email:        string;
  full_name:    string;
  role:         'Designer' | 'Client';
  hourly_rate?: number;
}

export interface MeData {
  id:                      number;
  email:                   string;
  full_name:               string;
  role:                    string;
  hourly_rate:             number | null;
  specialization:          string;
  available_hours_per_week: number | null;
  phone:                   string;
  industry:                string;
  avatar_url:              string | null;
}