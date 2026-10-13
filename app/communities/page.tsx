'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Community } from '@/types';

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [newPrivate, setNewPrivate] = useState(false);

  useEffect(() => {
    fetch('/api/communities')
      .then(r => r.json())
      .then(data => { setCommunities(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/communities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc, avatar_url: newAvatar, is_private: newPrivate }),
    }).then(r => r.json()).catch(() => null);
    if (res?.id) {
      setCommunities(prev => [res, ...prev]);
      setNewName(''); setNewDesc(''); setNewAvatar(''); setNewPrivate(false);
      setShowCreate(false);
    }
  };

  const handleJoin = async (id: number) => {
    const res = await fetch(`/api/communities/${id}/join`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res !== null) {
      setCommunities(prev => prev.map(c => c.id === id
        ? { ...c, is_member: !c.is_member, _count: { ...c._count, members: (c._count?.members ?? 0) + (c.is_member ? -1 : 1), posts: c._count?.posts ?? 0 } }
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
          🏘️ Communities
        </h1>
        <button onClick={() => setShowCreate(v => !v)} className="btn btn-primary btn-sm">
          + Create
        </button>
      </div>

      {showCreate && (
        <div className="card fade-in" style={{ padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Community name *" style={inputStyle} />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" rows={3}
            style={{ ...inputStyle, resize: 'vertical' }} />
          <input value={newAvatar} onChange={e => setNewAvatar(e.target.value)} placeholder="Avatar URL" style={inputStyle} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--gray-600)', cursor: 'pointer' }}>
            <input type="checkbox" checked={newPrivate} onChange={e => setNewPrivate(e.target.checked)} />
            Private community
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={handleCreate} className="btn btn-primary btn-sm">Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ))}
        </div>
      ) : communities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏘️</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-600)' }}>No communities yet</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {communities.map(community => (
            <div key={community.id} className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {community.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={community.avatar_url} alt={community.name} className="avatar" style={{ width: 48, height: 48 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🏘️</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)' }}>{community.name}</span>
                    {community.is_private && (
                      <span style={{ fontSize: '0.68rem', background: 'var(--gray-100)', color: 'var(--gray-500)', padding: '2px 7px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                        Private
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>
                    {community._count?.members ?? 0} member{community._count?.members !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {community.description && (
                <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
                  {community.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button onClick={() => handleJoin(community.id)}
                  className={`btn btn-sm ${community.is_member ? 'btn-ghost' : 'btn-primary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}>
                  {community.is_member ? 'Leave' : 'Join'}
                </button>
                {community.is_member && (
                  <Link href={`/communities/${community.id}`} className="btn btn-outline btn-sm" style={{ flex: 1, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    💬 View
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
