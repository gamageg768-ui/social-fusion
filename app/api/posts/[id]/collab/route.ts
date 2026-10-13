import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const post = await prisma.post.findUnique({ where: { id: Number(params.id) } });
  if (!post || post.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { collab_user_id } = await req.json().catch(() => ({}));
  const collaborator = await prisma.user.findUnique({ where: { id: Number(collab_user_id) } });
  if (!collaborator) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const updated = await prisma.post.update({
    where: { id: post.id }, data: { collab_user_id: collaborator.id },
    include: { collab_user: true },
  });
  await prisma.notification.create({ data: { user_id: collaborator.id, actor_id: me.id, notif_type: 'mention', content: `${me.name} added you as a collaborator on a post` } }).catch(() => {});
  return NextResponse.json({ collab_user_id: updated.collab_user_id });
}
