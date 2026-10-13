import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const chId = Number(params.id);
  const items = await prisma.channelPost.findMany({
    where: { channel_id: chId },
    include: {
      post: { include: { user: true, likes: { where: { user_id: meId }, take: 1 }, bookmarks: { where: { user_id: meId }, take: 1 }, ref_post: { include: { user: true } }, reactions: true, post_poll: { include: { votes: true } } } },
      reactions: true,
    },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(items.map(i => {
    const grouped: Record<string, number> = {};
    for (const r of i.reactions) { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; }
    const myReaction = i.reactions.find((r: any) => r.user_id === meId)?.emoji ?? null;
    return {
      id: i.id, channel_id: i.channel_id, post_id: i.post_id, created_at: i.created_at.toISOString(),
      post: { ...serializePost(i.post), liked: i.post.likes.length > 0, bookmarked: i.post.bookmarks.length > 0 },
      reactions: Object.entries(grouped).map(([emoji, count]) => ({ emoji, count })),
      my_reaction: myReaction,
    };
  }));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const chId = Number(params.id);
  const ch = await prisma.channel.findUnique({ where: { id: chId } });
  if (!ch || ch.owner_id !== me.id) return NextResponse.json({ error: 'Only channel owner can post' }, { status: 403 });
  const data = await req.json().catch(() => ({}));
  const post = await prisma.post.create({
    data: { user_id: me.id, content: data.content ?? '', image_url: data.image_url ?? '', post_type: 'post' },
    include: { user: true, ref_post: { include: { user: true } } },
  });
  const cp = await prisma.channelPost.create({ data: { channel_id: chId, post_id: post.id }, include: { reactions: true } });
  return NextResponse.json({ id: cp.id, channel_id: chId, post_id: post.id, created_at: cp.created_at.toISOString(), post: { ...serializePost(post), liked: false, bookmarked: false }, reactions: [], my_reaction: null }, { status: 201 });
}
