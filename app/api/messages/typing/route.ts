import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/utils';
import { typingMap } from '@/lib/chatState';

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const { partner_id, typing } = await req.json();
  typingMap.set(`${me.id}:${Number(partner_id)}`, { typing: !!typing, ts: Date.now() });

  return NextResponse.json({ ok: true });
}
