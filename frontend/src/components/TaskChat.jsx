import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

const fmtTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const fmtDate = (ts) => {
  const d   = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function TaskChat({ task, socket, currentUserId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const bottomRef  = useRef(null);
  const textareaRef = useRef(null);

  const isParticipant =
    String(task.assignedTo?._id) === currentUserId ||
    String(task.createdBy?._id)  === currentUserId;

  useEffect(() => {
    api.get(`/api/tasks/${task._id}/messages`)
      .then(r => { setMessages(r.data); setLoading(false); })
      .catch(()  => setLoading(false));

    // Mark existing messages as read
    api.post(`/api/tasks/${task._id}/messages/read`).catch(() => {});

    socket.emit('join_task', task._id);

    const onNewMsg = (msg) => {
      setMessages(prev => [...prev, msg]);
      // Auto-mark as read since chat is open
      api.post(`/api/tasks/${task._id}/messages/read`).catch(() => {});
    };

    const onRead = ({ userId }) => {
      if (userId !== currentUserId) {
        setMessages(prev => prev.map(m =>
          m.readBy.includes(userId)
            ? m
            : { ...m, readBy: [...m.readBy, userId] }
        ));
      }
    };

    socket.on('new_message',   onNewMsg);
    socket.on('messages_read', onRead);

    return () => {
      socket.emit('leave_task', task._id);
      socket.off('new_message',   onNewMsg);
      socket.off('messages_read', onRead);
    };
  }, [task._id]); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await api.post(`/api/tasks/${task._id}/messages`, { content: text });
      setInput('');
      textareaRef.current?.focus();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // Group messages by date for section headers
  const groups = messages.reduce((acc, msg) => {
    const key = fmtDate(msg.createdAt);
    (acc[key] = acc[key] || []).push(msg);
    return acc;
  }, {});

  // Determine the overall last message sent by me — only show "Seen" there
  const lastOwnMsgId = [...messages].reverse().find(
    m => String(m.senderId._id) === currentUserId
  )?._id;

  const otherPartyId =
    String(task.assignedTo?._id) === currentUserId
      ? String(task.createdBy?._id)
      : String(task.assignedTo?._id);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[380px] flex-col bg-slate-900 border-l border-slate-700/80 shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-700/80 px-5 py-4 bg-slate-900/95">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Task Chat</p>
            <h2 className="text-sm font-semibold text-white truncate leading-snug">{task.title}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              {task.assignedTo && (
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {task.assignedTo.name}
                  <span className="text-slate-600 text-[10px]">assignee</span>
                </span>
              )}
              {task.createdBy && (
                <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                  {task.createdBy.name}
                  <span className="text-slate-600 text-[10px]">creator</span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 flex-shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          {loading ? (
            <div className="flex justify-center py-10">
              <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" />
              </svg>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">No messages yet</p>
              <p className="mt-0.5 text-xs text-slate-600">
                {isParticipant ? 'Start the conversation below.' : 'No conversation yet.'}
              </p>
            </div>
          ) : (
            Object.entries(groups).map(([date, msgs]) => (
              <div key={date} className="space-y-2.5">
                {/* Date separator */}
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-slate-700/70" />
                  <span className="text-[10px] font-medium text-slate-500 select-none">{date}</span>
                  <div className="h-px flex-1 bg-slate-700/70" />
                </div>

                {msgs.map((msg) => {
                  const isOwn      = String(msg.senderId._id) === currentUserId;
                  const isLastOwn  = String(msg._id) === String(lastOwnMsgId);
                  const seenByOther = isLastOwn && msg.readBy?.some(id => String(id) === otherPartyId);

                  return (
                    <div key={msg._id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                      {!isOwn && (
                        <span className="mb-1 ml-1 text-[10px] font-medium text-slate-500">
                          {msg.senderId.name}
                        </span>
                      )}
                      <div className={`max-w-[82%] break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isOwn
                          ? 'rounded-br-sm bg-indigo-600 text-white'
                          : 'rounded-bl-sm bg-slate-700/80 text-white'
                      }`}>
                        {msg.content}
                      </div>
                      <div className={`mt-1 flex items-center gap-1 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                        <span className="text-[10px] text-slate-600">{fmtTime(msg.createdAt)}</span>
                        {seenByOther && (
                          <span className="flex items-center gap-0.5 text-[10px] text-indigo-400">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M18 6L7 17l-5-5" /><path d="M23 6L12 17" />
                            </svg>
                            Seen
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        {isParticipant ? (
          <form
            onSubmit={sendMessage}
            className="flex items-end gap-2 border-t border-slate-700/80 bg-slate-900/95 px-4 py-3"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message… (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="max-h-28 flex-1 resize-none rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              style={{ lineHeight: '1.5' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-all disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
            >
              {sending
                ? <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              }
            </button>
          </form>
        ) : (
          <div className="border-t border-slate-700/80 px-5 py-4">
            <p className="text-center text-xs text-slate-500">
              Only the assignee and task creator can send messages.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
