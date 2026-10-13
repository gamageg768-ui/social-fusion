'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Channel } from '@/types';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAvatar, setNewAvatar] = useState('');

  useEffect(() => {
    fetch('/api/channels')
      .then(r => r.json())
      .then(data => { setChannels(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc, avatar_url: newAvatar }),
    }).then(r => r.json()).catch(() => null);
    if (res?.id) {
      setChannels(prev => [res, ...prev]);
      setNewName(''); setNewDesc(''); setNewAvatar('');
      setShowCreate(false);
    }
  };

  const handleSubscribe = async (id: number) => {
    const res = await fetch(`/api/channels/${id}/subscribe`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res !== null) {
      setChannels(prev => prev.map(c => c.id === id
        ? {
            ...c,
            is_subscribed: !c.is_subscribed,
            _count: {
              ...c._count,
              subscriptions: (c._count?.subscriptions ?? 0) + (c.is_subscribed ? -1 : 1),
              posts: c._count?.posts ?? 0,
            },
          }
        : c
      ));
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1.5px solid var(--blue-100)',
    borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'var(--gray-900)' }}>
          📡 Channels
        </h1>
        <button onClick={() => setShowCreate(v => !v)} className="btn btn-primary btn-sm">
          + Create
        </button>
      </div>

      {showCreate && (
        <div className="card fade-in" style={{ padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Channel name *" style={inputStyle} />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" rows={3}
            style={{ ...inputStyle, resize: 'vertical' }} />
          <input value={newAvatar} onChange={e => setNewAvatar(e.target.value)} placeholder="Avatar URL" style={inputStyle} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={handleCreate} className="btn btn-primary btn-sm">Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📡</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-600)' }}>No channels yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {channels.map(channel => (
            <div key={channel.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
              {channel.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={channel.avatar_url} alt={channel.name} className="avatar" style={{ width: 52, height: 52, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>📡</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)', marginBottom: 3 }}>{channel.name}</div>
                {channel.description && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', margin: '0 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {channel.description}
                  </p>
                )}
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  {channel._count?.subscriptions ?? 0} subscriber{channel._count?.subscriptions !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button onClick={() => handleSubscribe(channel.id)}
                  className={`btn btn-sm ${channel.is_subscribed ? 'btn-ghost' : 'btn-primary'}`}>
                  {channel.is_subscribed ? 'Unsubscribe' : 'Subscribe'}
                </button>
                <Link href={`/channels/${channel.id}`} className="btn btn-outline btn-sm" style={{ textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
