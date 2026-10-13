'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import type { User } from '@/types';

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

function FollowingList() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('id') || '1';
  const [users, setUsers] = useState<(User & { is_following: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${userId}/following`).then(r => r.json()).then(data => {
      setUsers(data.following || []);
      setLoading(false);
    });
  }, [userId]);

  const toggleFollow = async (targetId: number, idx: number) => {
    const res = await fetch(`/api/users/${targetId}/follow`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) setUsers(prev => prev.map((u, i) => i === idx ? { ...u, is_following: res.following } : u));
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <a href="/profile" style={{ fontSize: '1.2rem', textDecoration: 'none', color: 'var(--gray-600)' }}>←</a>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gray-900)' }}>Following</h1>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
        </div>
      ) : users.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>
          Not following anyone yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map((u, idx) => (
            <div key={u.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.avatar} alt={u.name} className="avatar" style={{ width: 48, height: 48 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)' }}>
                  {u.name}
                  {u.is_verified && <span style={{ marginLeft: 4, color: 'var(--blue-500)', fontSize: '0.8rem' }}>✓</span>}
                  {u.is_private && <span style={{ marginLeft: 6, fontSize: '0.7rem', background: 'var(--gray-100)', padding: '1px 6px', borderRadius: 10, color: 'var(--gray-500)' }}>🔒</span>}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>@{u.username} · {fmt(u.followers_count)} followers</div>
              </div>
              <button onClick={() => toggleFollow(u.id, idx)}
                className={`btn btn-sm ${u.is_following ? 'btn-ghost' : 'btn-primary'}`}
                style={{ fontSize: '0.8rem' }}>
                {u.is_following ? '✓ Following' : '+ Follow'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FollowingPage() {
  return <Suspense fallback={<div />}><FollowingList /></Suspense>;
}
