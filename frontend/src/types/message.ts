export interface Message {
  readonly id:          number;
  readonly sender:      number;    // User id — used to detect "own" messages
  readonly sender_name: string;
  readonly is_read:     boolean;
  readonly created_at:  string;
  project:      number;
  content_text: string;
}

export interface MessagePayload {
  project:      number;
  content_text: string;
}