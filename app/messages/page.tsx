'use client';
import { useEffect, useState, useRef } from 'react';
import type { Conversation, Message, User } from '@/types';

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm ago';
  if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
  return Math.floor(mins / 1440) + 'd ago';
}

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [meId, setMeId] = useState(15);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then((u: User) => setMeId(u.id)).catch(console.error);
    fetch('/api/messages/conversations').then(r => r.json()).then(setConversations).catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConversation = async (conv: Conversation) => {
    setActive(conv);
    setLoading(true);
    const msgs = await fetch(`/api/messages/conversation/${conv.user.id}`).then(r => r.json()).catch(() => []);
    setMessages(msgs);
    setLoading(false);
  };

  const send = async () => {
    if (!text.trim() || !active) return;
    const msg = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: active.user.id, content: text }),
    }).then(r => r.json()).catch(() => null);
    if (msg) { setMessages(prev => [...prev, msg]); setText(''); }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-height) - 20px)', gap: 16, maxWidth: 900, margin: '0 auto' }}>
      <div className="card" style={{ width: active ? 280 : '100%', minWidth: 260, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--blue-100)' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-800)', marginBottom: 10 }}>💬 Messages</h2>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input placeholder="Search messages..." style={{
              width: '100%', padding: '8px 10px 8px 30px',
              background: 'var(--gray-50)', border: '1px solid var(--blue-100)',
              borderRadius: 'var(--radius-full)', fontSize: '0.82rem', outline: 'none',
            }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.map(conv => (
            <div key={conv.user.id} onClick={() => openConversation(conv)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer',
                background: active?.user.id === conv.user.id ? 'var(--blue-50)' : 'transparent',
                borderLeft: active?.user.id === conv.user.id ? '3px solid var(--blue-400)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={conv.user.avatar} alt={conv.user.name} className="avatar" style={{ width: 44, height: 44 }} />
                <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: 'var(--green-400)', border: '2px solid white' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: conv.unread ? 700 : 600, fontSize: '0.875rem' }}>{conv.user.name}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{timeAgo(conv.last_time)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', color: conv.unread ? 'var(--gray-700)' : 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150, fontWeight: conv.unread ? 600 : 400 }}>
                    {conv.last_message}
                  </span>
                  {conv.unread && <span className="badge" style={{ flexShrink: 0, fontSize: '0.65rem', minWidth: 16, height: 16 }}>1</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {active ? (
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={active.user.avatar} alt="" className="avatar" style={{ width: 38, height: 38 }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: 'var(--green-400)', border: '2px solid white' }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{active.user.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--green-500)', fontWeight: 500 }}>🟢 Online</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {['📞','📹','⋯'].map(icon => (
                <button key={icon} className="btn btn-ghost btn-icon" style={{ fontSize: '1.1rem' }}>{icon}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--gray-400)', marginTop: 40 }}>Loading messages...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--gray-400)', marginTop: 60 }}>
                <div style={{ fontSize: '3rem', marginBottom: 8 }}>👋</div>
                <div>Start a conversation with {active.user.name}!</div>
              </div>
            ) : messages.map(msg => {
              const isMe = msg.sender_id === meId;
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 8 }}>
                  {!isMe && <img src={msg.sender?.avatar} alt="" className="avatar" style={{ width: 30, height: 30, alignSelf: 'flex-end' }} />}
                  <div style={{
                    maxWidth: '65%', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMe ? 'var(--blue-500)' : 'var(--blue-50)',
                    color: isMe ? 'white' : 'var(--gray-800)',
                    fontSize: '0.875rem', lineHeight: 1.5,
                    boxShadow: isMe ? 'var(--shadow-blue)' : 'var(--shadow-sm)',
                  }}>
                    {msg.content}
                    <div style={{ fontSize: '0.65rem', marginTop: 3, opacity: 0.7, textAlign: 'right' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isMe && <span style={{ marginLeft: 4 }}>{msg.is_read ? '✓✓' : '✓'}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--blue-100)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-icon" style={{ fontSize: '1.2rem' }}>😊</button>
            <button className="btn btn-ghost btn-icon" style={{ fontSize: '1.2rem' }}>📎</button>
            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Type a message..." style={{
                flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-full)',
                border: '1.5px solid var(--blue-100)', outline: 'none',
                fontSize: '0.875rem', background: 'var(--gray-50)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--blue-300)')}
              onBlur={e => (e.target.style.borderColor = 'var(--blue-100)')}
            />
            <button onClick={send} className="btn btn-primary btn-icon" disabled={!text.trim()}
              style={{ width: 40, height: 40, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 12 }}>💬</div>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-600)' }}>Select a conversation</div>
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>Choose from your messages to start chatting</div>
          </div>
        </div>
      )}
    </div>
  );
}
