import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function PATCH(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status_emoji, status_text } = await req.json().catch(() => ({}));

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      status_emoji: String(status_emoji ?? '').slice(0, 10),
      status_text: String(status_text ?? '').slice(0, 60),
    },
  });

  return NextResponse.json({ status_emoji: updated.status_emoji, status_text: updated.status_text });
}
