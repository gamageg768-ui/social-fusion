import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function PATCH(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { mix } = await req.json();
  if (!['friends', 'balanced', 'discover'].includes(mix)) {
    return NextResponse.json({ error: 'Invalid mix value' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: { feed_mix: mix },
    select: { id: true, feed_mix: true },
  });

  return NextResponse.json(updated);
}
