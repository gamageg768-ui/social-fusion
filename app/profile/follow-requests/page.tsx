'use client';
import { useEffect, useState } from 'react';
import type { FollowRequest } from '@/types';

export default function FollowRequestsPage() {
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/me/follow-requests').then(r => r.json()).then(data => {
      setRequests(data.requests || []);
      setLoading(false);
    });
  }, []);

  const handle = async (requestId: number, action: 'accept' | 'reject') => {
    await fetch('/api/users/me/follow-requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, action }),
    });
    setRequests(prev => prev.filter(r => r.id !== requestId));
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <a href="/profile" style={{ fontSize: '1.2rem', textDecoration: 'none', color: 'var(--gray-600)' }}>←</a>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gray-900)' }}>Follow Requests</h1>
        {requests.length > 0 && (
          <span className="badge">{requests.length}</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
          <div style={{ fontWeight: 600, color: 'var(--gray-700)', marginBottom: 4 }}>All caught up!</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>No pending follow requests</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {requests.map(req => (
            <div key={req.id} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={req.requester?.avatar} alt={req.requester?.name} className="avatar" style={{ width: 48, height: 48 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{req.requester?.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>@{req.requester?.username}</div>
                {req.requester?.bio && <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 2 }}>{req.requester.bio}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handle(req.id, 'accept')} className="btn btn-primary btn-sm" style={{ fontSize: '0.8rem' }}>
                  Accept
                </button>
                <button onClick={() => handle(req.id, 'reject')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
