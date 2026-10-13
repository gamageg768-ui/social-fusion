import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

const BADGE_META: Record<string, { label: string; icon: string; desc: string }> = {
  first_post: { label: 'First Post', icon: '✍️', desc: 'Published first post' },
  ten_posts: { label: 'Prolific', icon: '📝', desc: '10 posts published' },
  fifty_posts: { label: 'Content Creator', icon: '🎨', desc: '50 posts published' },
  first_follower: { label: 'First Follower', icon: '🌱', desc: 'Got first follower' },
  hundred_followers: { label: 'Rising Star', icon: '⭐', desc: '100 followers' },
  thousand_followers: { label: 'Influencer', icon: '🚀', desc: '1,000 followers' },
  verified: { label: 'Verified', icon: '✅', desc: 'Verified account' },
  early_adopter: { label: 'Early Adopter', icon: '🦅', desc: 'Joined in the early days' },
};

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const badges = await prisma.achievement.findMany({ where: { user_id: Number(params.id) } });
  return NextResponse.json(badges.map(b => ({ badge_type: b.badge_type, ...BADGE_META[b.badge_type] })));
}
