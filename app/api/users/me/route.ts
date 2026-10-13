import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const user = await prisma.user.findFirst({ where: { username: 'you' } })
    ?? await prisma.user.findFirst();
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(serializeUser(user));
}

export async function PUT(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { name, bio, location, website, avatar, cover, is_private } = await req.json();

  const updated = await prisma.user.update({
    where: { id: me.id },
    data: {
      ...(name !== undefined && { name }),
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(website !== undefined && { website }),
      ...(avatar !== undefined && { avatar }),
      ...(cover !== undefined && { cover }),
      ...(is_private !== undefined && { is_private }),
    },
  });

  return NextResponse.json(serializeUser(updated));
}
