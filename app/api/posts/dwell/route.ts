import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const { post_id, seconds } = await req.json();
  if (typeof post_id !== 'number' || typeof seconds !== 'number' || seconds <= 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const capped = Math.min(Math.round(seconds), 120);

  await prisma.postDwellTime.create({
    data: { user_id: me.id, post_id, seconds: capped },
  });

  return NextResponse.json({ ok: true });
}
