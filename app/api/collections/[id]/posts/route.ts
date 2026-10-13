import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const colId = Number(params.id);

  const items = await prisma.collectionPost.findMany({
    where: { collection_id: colId },
    include: {
      post: {
        include: {
          user: true,
          likes: { where: { user_id: meId }, take: 1 },
          bookmarks: { where: { user_id: meId }, take: 1 },
          ref_post: { include: { user: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(items.map(i => ({
    ...serializePost(i.post), liked: i.post.likes.length > 0, bookmarked: i.post.bookmarks.length > 0,
  })));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const colId = Number(params.id);
  const { post_id } = await req.json().catch(() => ({}));

  const col = await prisma.collection.findUnique({ where: { id: colId } });
  if (!col || col.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.collectionPost.upsert({
    where: { collection_id_post_id: { collection_id: colId, post_id: Number(post_id) } },
    update: {},
    create: { collection_id: colId, post_id: Number(post_id) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const colId = Number(params.id);
  const { post_id } = await req.json().catch(() => ({}));

  const col = await prisma.collection.findUnique({ where: { id: colId } });
  if (!col || col.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.collectionPost.deleteMany({ where: { collection_id: colId, post_id: Number(post_id) } });
  return NextResponse.json({ ok: true });
}
