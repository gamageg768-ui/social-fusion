'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Event } from '@/types';

type RsvpStatus = 'going' | 'interested' | 'not_going';
type FilterTab = 'all' | 'going' | 'interested';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newEndsAt, setNewEndsAt] = useState('');
  const [newCover, setNewCover] = useState('');

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newStartsAt) return;
    const body: Record<string, string> = { title: newTitle, description: newDesc, location: newLocation, starts_at: newStartsAt, cover_url: newCover };
    if (newEndsAt) body.ends_at = newEndsAt;
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(r => r.json()).catch(() => null);
    if (res?.id) {
      setEvents(prev => [res, ...prev]);
      setNewTitle(''); setNewDesc(''); setNewLocation(''); setNewStartsAt(''); setNewEndsAt(''); setNewCover('');
      setShowCreate(false);
    }
  };

  const handleRsvp = async (eventId: number, status: RsvpStatus) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    if (event.my_rsvp === status) {
      await fetch(`/api/events/${eventId}/rsvp`, { method: 'DELETE' }).catch(() => {});
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, my_rsvp: null } : e));
    } else {
      await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).catch(() => {});
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, my_rsvp: status } : e));
    }
  };

  const filtered = events.filter(e => {
    if (filter === 'going') return e.my_rsvp === 'going';
    if (filter === 'interested') return e.my_rsvp === 'interested';
    return true;
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1.5px solid var(--blue-100)',
    borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'var(--gray-900)' }}>
          📅 Events
        </h1>
        <button onClick={() => setShowCreate(v => !v)} className="btn btn-primary btn-sm">
          + Create Event
        </button>
      </div>

      {showCreate && (
        <div className="card fade-in" style={{ padding: 20, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Event title *" style={inputStyle} />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description" rows={3}
            style={{ ...inputStyle, resize: 'vertical' }} />
          <input value={newCover} onChange={e => setNewCover(e.target.value)} placeholder="Cover image URL" style={inputStyle} />
          <input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Location" style={inputStyle} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>Starts at *</label>
              <input type="datetime-local" value={newStartsAt} onChange={e => setNewStartsAt(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>Ends at (optional)</label>
              <input type="datetime-local" value={newEndsAt} onChange={e => setNewEndsAt(e.target.value)} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <button onClick={handleCreate} className="btn btn-primary btn-sm">Create Event</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'going', 'interested'] as FilterTab[]).map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            className={`btn btn-sm ${filter === tab ? 'btn-primary' : 'btn-outline'}`}
            style={{ textTransform: 'capitalize' }}>
            {tab === 'all' ? 'All' : tab === 'going' ? '✅ Going' : '⭐ Interested'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 320, borderRadius: 12 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📅</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-600)' }}>No events found</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(event => (
            <div key={event.id} className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {event.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.cover_url} alt={event.title} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: 200, background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>📅</div>
              )}
              <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href={`/events/${event.id}`} style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-900)', textDecoration: 'none' }}>
                  {event.title}
                </Link>
                {event.description && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {event.description}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {event.location && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>📍 {event.location}</span>
                  )}
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    📅 {new Date(event.starts_at).toLocaleString()}
                  </span>
                  {event._count && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                      {event._count.rsvps} RSVP{event._count.rsvps !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8, flexWrap: 'wrap' }}>
                  {(['going', 'interested', 'not_going'] as RsvpStatus[]).map(status => (
                    <button key={status} onClick={() => handleRsvp(event.id, status)}
                      className={`btn btn-sm ${event.my_rsvp === status ? 'btn-primary' : 'btn-outline'}`}
                      style={{ fontSize: '0.75rem', flex: 1 }}>
                      {status === 'going' ? '✅ Going' : status === 'interested' ? '⭐ Interested' : '❌ Not going'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
