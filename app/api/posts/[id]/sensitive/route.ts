import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const post = await prisma.post.findUnique({ where: { id: Number(params.id) } });
  if (!post || post.user_id !== me.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated = await prisma.post.update({ where: { id: post.id }, data: { is_sensitive: !post.is_sensitive } });
  return NextResponse.json({ is_sensitive: updated.is_sensitive });
}
