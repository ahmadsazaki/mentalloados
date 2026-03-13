export interface Category {
  id: string;
  name: string;
  color: string;
  max_capacity: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category_id: string;
  category_name?: string;
  category_color?: string;
  effort_score: number;
  urgency_score: number;
  decision_score: number;
  coordination_score: number;
  worry_score: number;
  cognitive_load_score: number;
  completed: boolean;
  archived: boolean;
  deleted: boolean;
  sort_order: number;
  due_date: string | null;
  notes: string | null;
  raw_context: string | null;
  attachments: string | null;
  recurrence_rule: string | null;
  last_reset_date: string | null;
  created_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  daily_capacity: number;
  ai_provider: string;
  ai_model: string;
  openrouter_api_key: string | null;
}
