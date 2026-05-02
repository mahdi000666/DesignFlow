import { useState, useRef, useEffect } from 'react';
import { useMessages, useCreateMessage } from '../hooks/useMessages';
import { useAuth } from '../hooks/useAuth';
import { Initials } from '../utils/format';

interface Props {
  projectId: number;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day:    'numeric',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  });

export default function MessageBoard({ projectId }: Props) {
  const { user }                           = useAuth();
  const { data: messages = [], isLoading } = useMessages(projectId);
  const createMessage                      = useCreateMessage(projectId);
  const [text, setText]                    = useState('');
  const bottomRef                          = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    createMessage.mutate(
      { project: projectId, content_text: trimmed },
      { onSuccess: () => setText('') },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="card overflow-hidden flex flex-col" style={{ height: 520 }}>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center pt-10 font-medium">Loading messages…</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium">No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.sender === Number(user?.user_id);
            return (
              <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm ring-2 ring-white ${
                  isOwn ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {Initials(msg.sender_name)}
                </div>

                {/* Bubble + meta */}
                <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2">
                    {!isOwn && (
                      <span className="text-xs font-bold text-slate-700">{msg.sender_name}</span>
                    )}
                    <span className="text-[11px] text-slate-400 font-medium">{fmt(msg.created_at)}</span>
                  </div>
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    isOwn
                      ? 'bg-primary text-white rounded-tr-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.content_text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Compose ───────────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border-t border-slate-100 p-4 flex gap-3 items-center">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="compose-box"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || createMessage.isPending}
          className="btn-primary h-10 px-5 shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
}