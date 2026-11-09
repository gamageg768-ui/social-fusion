import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  if (isNaN(postId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { reason } = await req.json();

  await prisma.report.create({
    data: {
      reporter_id: me.id,
      post_id: postId,
      reason: reason || 'spam',
    },
  });

  return NextResponse.json({ success: true });
}
