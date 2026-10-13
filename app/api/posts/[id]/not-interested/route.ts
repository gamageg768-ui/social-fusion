import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const postId = Number(params.id);

  await prisma.notInterested.upsert({
    where: { user_id_post_id: { user_id: me.id, post_id: postId } },
    update: {},
    create: { user_id: me.id, post_id: postId },
  });

  return NextResponse.json({ ok: true });
}
