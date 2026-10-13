'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

export default function EditProfile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', bio: '', location: '', website: '', avatar: '', cover: '', is_private: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then((u: User) => {
      setUser(u);
      setForm({ name: u.name, bio: u.bio || '', location: u.location || '', website: u.website || '', avatar: u.avatar || '', cover: u.cover || '', is_private: u.is_private ?? false });
    });
  }, []);

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/users/me', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setSaved(true); setTimeout(() => router.push('/profile'), 1000); }
    setSaving(false);
  };

  if (!user) return <div style={{ maxWidth: 680, margin: '0 auto', padding: 32 }}><div className="skeleton" style={{ height: 400, borderRadius: 12 }} /></div>;

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.9rem', fontFamily: 'inherit' };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.push('/profile')} className="btn btn-ghost btn-sm" style={{ fontSize: '1.2rem', padding: '4px 8px' }}>←</button>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gray-900)' }}>Edit Profile</h1>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ position: 'relative', marginBottom: 48 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={form.cover || user.cover} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10 }} />
          <div style={{ position: 'absolute', bottom: -36, left: 16, padding: 3, background: 'white', borderRadius: '50%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.avatar || user.avatar} alt="" className="avatar" style={{ width: 72, height: 72 }} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>Display Name</label>
            <input value={form.name} onChange={field('name')} style={inputStyle} placeholder="Your name" />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>Bio</label>
            <textarea value={form.bio} onChange={field('bio')} rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} placeholder="Tell people about yourself" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>Location</label>
              <input value={form.location} onChange={field('location')} style={inputStyle} placeholder="City, Country" />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>Website</label>
              <input value={form.website} onChange={field('website')} style={inputStyle} placeholder="yoursite.com" />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>Avatar URL</label>
            <input value={form.avatar} onChange={field('avatar')} style={inputStyle} placeholder="https://..." />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-500)', marginBottom: 4, display: 'block' }}>Cover Photo URL</label>
            <input value={form.cover} onChange={field('cover')} style={inputStyle} placeholder="https://..." />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 8 }}>
            <input type="checkbox" id="private" checked={form.is_private} onChange={field('is_private') as React.ChangeEventHandler<HTMLInputElement>}
              style={{ width: 18, height: 18, accentColor: 'var(--blue-500)', cursor: 'pointer' }} />
            <div>
              <label htmlFor="private" style={{ fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer' }}>Private Account</label>
              <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', margin: 0 }}>Only approved followers see your posts</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={() => router.push('/profile')} className="btn btn-outline">Cancel</button>
        <button onClick={save} disabled={saving} className="btn btn-primary" style={{ minWidth: 100 }}>
          {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
