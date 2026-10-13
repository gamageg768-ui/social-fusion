'use client';
import { useEffect, useState } from 'react';
import type { Notification } from '@/types';

const iconMap: Record<string, string> = {
  like: '❤️', comment: '💬', follow: '👤', mention: '@', reel: '🎬',
};

function timeAgo(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export default function Notifications() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(data => { setNotifs(data); setLoading(false); }).catch(console.error);
  }, []);

  const markAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' }).catch(console.error);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unread = notifs.filter(n => !n.is_read).length;
  const groups = [
    { label: 'New', items: notifs.filter(n => !n.is_read) },
    { label: 'Earlier', items: notifs.filter(n => n.is_read) },
  ].filter(g => g.items.length > 0);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: 'var(--gray-900)' }}>
            🔔 Notifications
          </h1>
          {unread > 0 && <span style={{ fontSize: '0.82rem', color: 'var(--blue-500)', fontWeight: 600 }}>{unread} unread</span>}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="btn btn-outline btn-sm">✓ Mark all read</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="card" style={{ padding: 16, display: 'flex', gap: 10 }}>
              <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="skeleton" style={{ height: 12, width: '70%' }} />
                <div className="skeleton" style={{ height: 10, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        groups.map(group => (
          <div key={group.label} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 8, padding: '0 4px' }}>
              {group.label}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.items.map(n => (
                <div key={n.id} className="card fade-in" style={{
                  padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  background: n.is_read ? 'var(--white)' : 'var(--blue-50)',
                  borderLeft: n.is_read ? 'none' : '3px solid var(--blue-400)',
                  cursor: 'pointer', transition: 'transform 0.15s',
                }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'translateX(2px)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'translateX(0)')}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={n.actor.avatar} alt={n.actor.name} className="avatar" style={{ width: 44, height: 44 }} />
                    <span style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 20, height: 20, borderRadius: '50%',
                      background: n.notif_type === 'like' ? '#fee2e2' : n.notif_type === 'follow' ? 'var(--blue-100)' : 'var(--gray-100)',
                      border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem',
                    }}>
                      {iconMap[n.notif_type]}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: 1.4 }}>
                      <strong>{n.actor.name}</strong>{' '}
                      {n.content.replace(n.actor.name, '').trim()}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 2, display: 'block' }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--blue-500)', flexShrink: 0 }} />}
                  {n.notif_type === 'follow' && (
                    <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Follow back</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {!loading && notifs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 12 }}>🔔</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-600)' }}>No notifications yet</div>
          <div style={{ fontSize: '0.875rem', marginTop: 4 }}>When someone interacts with you, you&apos;ll see it here.</div>
        </div>
      )}
    </div>
  );
}
