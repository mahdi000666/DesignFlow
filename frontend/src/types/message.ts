export interface Message {
  readonly id:          number;
  readonly sender:      number;    // User id — used to detect "own" messages
  readonly sender_name: string;
  readonly is_read:     boolean;
  readonly created_at:  string;
  project:      number;
  content_text: string;
  feedback:     number | null;     // null = chat message, set = reply to that feedback item
}

export interface MessagePayload {
  project:      number;
  content_text: string;
  feedback?:    number | null;     // omit or null for chat; set to feedback id for replies
}