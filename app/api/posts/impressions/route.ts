import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const { post_ids } = await req.json();
  if (!Array.isArray(post_ids) || post_ids.length === 0) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ids = post_ids.filter((id): id is number => typeof id === 'number').slice(0, 50);

  await Promise.all(
    ids.map(post_id =>
      prisma.postImpression.upsert({
        where: { user_id_post_id: { user_id: me.id, post_id } },
        create: { user_id: me.id, post_id },
        update: {},
      })
    )
  );

  return NextResponse.json({ ok: true, recorded: ids.length });
}
