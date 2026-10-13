'use client';
import { useEffect, useState } from 'react';
import PostCard from '@/components/Feed/PostCard';
import type { Post, Collection } from '@/types';

type Tab = 'all' | number;

export default function Saved() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [colPosts, setColPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showNewCol, setShowNewCol] = useState(false);
  const [newColName, setNewColName] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/bookmarks').then(r => r.json()).catch(() => []),
      fetch('/api/collections').then(r => r.json()).catch(() => []),
    ]).then(([bm, cols]) => {
      setPosts(bm);
      setCollections(cols);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (typeof activeTab === 'number') {
      fetch(`/api/collections/${activeTab}/posts`).then(r => r.json()).then(setColPosts).catch(() => setColPosts([]));
    }
  }, [activeTab]);

  const handleBookmarkChange = (bookmarked: boolean, postId: number) => {
    if (!bookmarked) setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const createCollection = async () => {
    if (!newColName.trim()) return;
    const res = await fetch('/api/collections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newColName.trim() }),
    }).then(r => r.json()).catch(() => null);
    if (res?.id) { setCollections(prev => [res, ...prev]); }
    setNewColName(''); setShowNewCol(false);
  };

  const deleteCollection = async (colId: number) => {
    await fetch(`/api/collections/${colId}`, { method: 'DELETE' }).catch(() => {});
    setCollections(prev => prev.filter(c => c.id !== colId));
    if (activeTab === colId) setActiveTab('all');
  };

  const displayPosts = activeTab === 'all' ? posts : colPosts;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: 'var(--gray-900)' }}>
            🔖 Saved
          </h1>
          {/* Feature 12 — New collection */}
          <button onClick={() => setShowNewCol(v => !v)} className="btn btn-outline btn-sm" style={{ fontSize: '0.8rem' }}>
            + New collection
          </button>
        </div>

        {showNewCol && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input value={newColName} onChange={e => setNewColName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createCollection()}
              placeholder="Collection name..."
              autoFocus
              style={{ flex: 1, padding: '7px 12px', border: '1.5px solid var(--blue-200)', borderRadius: 8, fontSize: '0.85rem', outline: 'none' }} />
            <button onClick={createCollection} className="btn btn-primary btn-sm">Create</button>
            <button onClick={() => setShowNewCol(false)} className="btn btn-ghost btn-sm">✕</button>
          </div>
        )}

        {/* Tabs: All + each collection */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('all')}
            className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.8rem' }}>
            🔖 All ({posts.length})
          </button>
          {collections.map(col => (
            <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button onClick={() => setActiveTab(col.id)}
                className={`btn btn-sm ${activeTab === col.id ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.8rem' }}>
                📁 {col.name} ({col._count?.posts ?? 0})
              </button>
              <button onClick={() => deleteCollection(col.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.8rem', padding: '2px 4px' }} title="Delete collection">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : displayPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>{activeTab === 'all' ? '🔖' : '📁'}</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-600)', marginBottom: 8 }}>
            {activeTab === 'all' ? 'No saved posts yet' : 'This collection is empty'}
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            {activeTab === 'all' ? 'Tap the bookmark icon on any post to save it here.' : 'Save posts to this collection from the feed.'}
          </div>
        </div>
      ) : (
        displayPosts.map(p => (
          <PostCard key={p.id} post={p} onBookmarkChange={handleBookmarkChange} />
        ))
      )}
    </div>
  );
}
