'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Event, EventRsvp } from '@/types';

type RsvpStatus = 'going' | 'interested' | 'not_going';

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${params.id}`)
      .then(r => r.json())
      .then(data => { setEvent(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleRsvp = async (status: RsvpStatus) => {
    if (!event) return;
    if (event.my_rsvp === status) {
      await fetch(`/api/events/${event.id}/rsvp`, { method: 'DELETE' }).catch(() => {});
      setEvent(prev => prev ? { ...prev, my_rsvp: null } : prev);
    } else {
      await fetch(`/api/events/${event.id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).catch(() => {});
      setEvent(prev => prev ? { ...prev, my_rsvp: status } : prev);
    }
  };

  const going = event?.rsvps?.filter((r: EventRsvp) => r.status === 'going') ?? [];
  const interested = event?.rsvps?.filter((r: EventRsvp) => r.status === 'interested') ?? [];

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 360, borderRadius: 12, marginBottom: 20 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton" style={{ height: 32, width: '60%' }} />
          <div className="skeleton" style={{ height: 16, width: '40%' }} />
          <div className="skeleton" style={{ height: 80 }} />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray-400)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>😕</div>
        <div style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Event not found</div>
        <Link href="/events" style={{ color: 'var(--blue-500)', textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>← Events</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <Link href="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--blue-500)', textDecoration: 'none', marginBottom: 16, fontSize: '0.9rem', fontWeight: 600 }}>
        ← Events
      </Link>

      {event.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.cover_url} alt={event.title} style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 12, marginBottom: 20 }} />
      ) : (
        <div style={{ width: '100%', height: 240, background: 'var(--blue-50)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', marginBottom: 20 }}>📅</div>
      )}

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: 'var(--gray-900)', marginBottom: 12 }}>{event.title}</h1>

        {event.description && (
          <p style={{ color: 'var(--gray-600)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 16 }}>{event.description}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
              <span>📍</span>
              <span>{event.location}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--gray-600)' }}>
            <span>📅</span>
            <span>{new Date(event.starts_at).toLocaleString()}</span>
            {event.ends_at && <span>— {new Date(event.ends_at).toLocaleString()}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['going', 'interested', 'not_going'] as RsvpStatus[]).map(status => (
            <button key={status} onClick={() => handleRsvp(status)}
              className={`btn btn-sm ${event.my_rsvp === status ? 'btn-primary' : 'btn-outline'}`}>
              {status === 'going' ? '✅ Going' : status === 'interested' ? '⭐ Interested' : '❌ Not going'}
            </button>
          ))}
        </div>
      </div>

      {(going.length > 0 || interested.length > 0) && (
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gray-800)', marginBottom: 16 }}>Attendees</h2>

          {going.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 10 }}>
                ✅ Going ({going.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {going.map((r: EventRsvp) => r.user && (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={r.user.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.user.avatar} alt={r.user.name} className="avatar" style={{ width: 32, height: 32 }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--gray-700)' }}>{r.user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {interested.length > 0 && (
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 10 }}>
                ⭐ Interested ({interested.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {interested.map((r: EventRsvp) => r.user && (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={r.user.name}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.user.avatar} alt={r.user.name} className="avatar" style={{ width: 32, height: 32 }} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--gray-700)' }}>{r.user.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
