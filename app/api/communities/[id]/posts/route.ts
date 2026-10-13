import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const items = await prisma.communityPost.findMany({
    where: { community_id: Number(params.id) },
    include: { post: { include: { user: true, likes: { where: { user_id: meId }, take: 1 }, bookmarks: { where: { user_id: meId }, take: 1 }, ref_post: { include: { user: true } }, reactions: true, post_poll: { include: { votes: true } } } } },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(items.map(i => ({ ...serializePost(i.post), liked: i.post.likes.length > 0, bookmarked: i.post.bookmarks.length > 0, reactions: i.post.reactions })));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const comId = Number(params.id);
  const member = await prisma.communityMember.findUnique({ where: { community_id_user_id: { community_id: comId, user_id: me.id } } });
  if (!member) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  const data = await req.json().catch(() => ({}));
  const post = await prisma.post.create({
    data: { user_id: me.id, content: data.content ?? '', image_url: data.image_url ?? '', post_type: 'post' },
    include: { user: true, ref_post: { include: { user: true } } },
  });
  await prisma.communityPost.create({ data: { community_id: comId, post_id: post.id } });
  return NextResponse.json({ ...serializePost(post), liked: false, bookmarked: false }, { status: 201 });
}
