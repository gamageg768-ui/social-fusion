import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

const BADGES: { type: string; label: string; icon: string; desc: string; check: (u: any, counts: any) => boolean }[] = [
  { type: 'first_post', label: 'First Post', icon: '✍️', desc: 'Published your first post', check: (_, c) => c.posts >= 1 },
  { type: 'ten_posts', label: 'Prolific', icon: '📝', desc: '10 posts published', check: (_, c) => c.posts >= 10 },
  { type: 'fifty_posts', label: 'Content Creator', icon: '🎨', desc: '50 posts published', check: (_, c) => c.posts >= 50 },
  { type: 'first_follower', label: 'First Follower', icon: '🌱', desc: 'Got your first follower', check: (u) => u.followers_count >= 1 },
  { type: 'hundred_followers', label: 'Rising Star', icon: '⭐', desc: '100 followers', check: (u) => u.followers_count >= 100 },
  { type: 'thousand_followers', label: 'Influencer', icon: '🚀', desc: '1,000 followers', check: (u) => u.followers_count >= 1000 },
  { type: 'verified', label: 'Verified', icon: '✅', desc: 'Verified account', check: (u) => u.is_verified },
  { type: 'early_adopter', label: 'Early Adopter', icon: '🦅', desc: 'Joined in the early days', check: () => true },
];

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const postCount = await prisma.post.count({ where: { user_id: me.id } });
  const counts = { posts: postCount };

  const earned: string[] = [];
  for (const b of BADGES) {
    if (b.check(me, counts)) earned.push(b.type);
  }

  for (const type of earned) {
    await prisma.achievement.upsert({
      where: { user_id_badge_type: { user_id: me.id, badge_type: type } },
      update: {}, create: { user_id: me.id, badge_type: type },
    }).catch(() => {});
  }

  const myBadges = await prisma.achievement.findMany({ where: { user_id: me.id } });
  const badgeTypes = new Set(myBadges.map(b => b.badge_type));

  return NextResponse.json(BADGES.filter(b => badgeTypes.has(b.type)).map(b => ({
    badge_type: b.type, label: b.label, icon: b.icon, desc: b.desc,
  })));
}
