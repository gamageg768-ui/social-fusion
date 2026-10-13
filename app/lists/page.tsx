'use client';
import { useEffect, useState } from 'react';
import type { UserList, User } from '@/types';

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

export default function ListsPage() {
  const [lists, setLists] = useState<UserList[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [members, setMembers] = useState<Record<number, User[]>>({});
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/lists').then(r => r.json()).then(data => { setLists(Array.isArray(data) ? data : (data.lists || [])); setLoading(false); });
  }, []);

  const createList = async () => {
    if (!newName.trim()) return;
    const res = await fetch('/api/lists', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    }).then(r => r.json());
    setLists(prev => [...prev, res]);
    setNewName(''); setNewDesc(''); setCreating(false);
  };

  const deleteList = async (id: number) => {
    await fetch(`/api/lists/${id}`, { method: 'DELETE' });
    setLists(prev => prev.filter(l => l.id !== id));
    if (expanded === id) setExpanded(null);
  };

  const loadMembers = async (id: number) => {
    if (members[id]) return;
    const data = await fetch(`/api/lists/${id}/members`).then(r => r.json());
    setMembers(prev => ({ ...prev, [id]: data.members || [] }));
  };

  const toggleExpand = (id: number) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    loadMembers(id);
  };

  const search = async (q: string) => {
    setSearchQ(q);
    if (!q.trim()) { setSearchRes([]); return; }
    const data = await fetch(`/api/users?q=${encodeURIComponent(q)}`).then(r => r.json());
    setSearchRes(data.slice(0, 6));
  };

  const addMember = async (listId: number, userId: number) => {
    await fetch(`/api/lists/${listId}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    loadMembers(listId);
    setMembers(prev => ({ ...prev }));
    setSearchQ(''); setSearchRes([]);
  };

  const removeMember = async (listId: number, userId: number) => {
    await fetch(`/api/lists/${listId}/members`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    setMembers(prev => ({ ...prev, [listId]: (prev[listId] || []).filter(u => u.id !== userId) }));
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gray-900)' }}>Lists</h1>
        <button onClick={() => setCreating(v => !v)} className="btn btn-primary btn-sm">
          + New List
        </button>
      </div>

      {creating && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 14, color: 'var(--gray-800)' }}>Create New List</h3>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="List name (e.g. Close Friends)"
            style={{ width: '100%', padding: '9px 13px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.9rem', marginBottom: 10 }} />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)"
            style={{ width: '100%', padding: '9px 13px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.9rem', marginBottom: 14 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setCreating(false)} className="btn btn-outline btn-sm">Cancel</button>
            <button onClick={createList} disabled={!newName.trim()} className="btn btn-primary btn-sm">Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : lists.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>No lists yet</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>Create a list to organize people you follow</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lists.map(list => (
            <div key={list.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => toggleExpand(list.id)}>
                <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, var(--blue-100), var(--blue-200))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                  {list.name.toLowerCase().includes('friend') ? '⭐' : '📋'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)' }}>{list.name}</div>
                  {list.description && <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>{list.description}</div>}
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2 }}>{list._count?.members ?? 0} members</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={e => { e.stopPropagation(); deleteList(list.id); }}
                    className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-400)', padding: '4px 8px', fontSize: '0.85rem' }}>
                    🗑
                  </button>
                  <span style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>{expanded === list.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expanded === list.id && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--blue-50)' }}>
                  <div style={{ paddingTop: 12, marginBottom: 10 }}>
                    <input value={searchQ} onChange={e => search(e.target.value)} placeholder="Search users to add..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.85rem' }} />
                    {searchRes.length > 0 && (
                      <div style={{ marginTop: 6, border: '1px solid var(--blue-100)', borderRadius: 8, overflow: 'hidden' }}>
                        {searchRes.map(u => (
                          <div key={u.id} style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--gray-50)', cursor: 'pointer', background: 'white' }}
                            onClick={() => addMember(list.id, u.id)}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={u.avatar} alt={u.name} className="avatar" style={{ width: 28, height: 28 }} />
                            <div style={{ flex: 1 }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</span>
                              <span style={{ color: 'var(--gray-400)', fontSize: '0.78rem', marginLeft: 6 }}>@{u.username}</span>
                            </div>
                            <span style={{ color: 'var(--blue-500)', fontSize: '0.8rem' }}>+ Add</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {(members[list.id] || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                      No members yet. Search above to add people.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(members[list.id] || []).map(u => (
                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={u.avatar} alt={u.name} className="avatar" style={{ width: 36, height: 36 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>@{u.username} · {fmt(u.followers_count)} followers</div>
                          </div>
                          <button onClick={() => removeMember(list.id, u.id)}
                            className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
