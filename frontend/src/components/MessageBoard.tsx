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
    <div className="bg-white rounded-xl border border-slate-200 flex flex-col" style={{ height: 480 }}>

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {isLoading ? (
          <p className="text-sm text-slate-400 text-center pt-10">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-slate-400 text-center pt-10">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map(msg => {
            // isOwn = true means this message was sent by the logged-in user.
            const isOwn = msg.sender === Number(user?.user_id);
            return (
              <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>

                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                  isOwn ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {Initials(msg.sender_name)}
                </div>

                {/* Bubble + meta */}
                <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2">
                    {!isOwn && (
                      <span className="text-xs font-semibold text-slate-700">{msg.sender_name}</span>
                    )}
                    <span className="text-[11px] text-slate-400">{fmt(msg.created_at)}</span>
                  </div>
                  <div className={`rounded-xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    isOwn
                      ? 'bg-blue-600 text-white rounded-tl-sm'
                      : 'bg-slate-100 text-slate-800 rounded-tr-sm'
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
      <div className="border-t border-slate-200 p-3 flex gap-3 items-end shrink-0">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={2}
          className="flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || createMessage.isPending}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
}