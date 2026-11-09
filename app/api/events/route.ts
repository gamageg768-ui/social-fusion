import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeUser } from '@/lib/utils';
import { CreateEventSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimiter';

function serEvent(e: any, meId: number) {
  const myRsvp = e.rsvps?.find((r: any) => r.user_id === meId)?.status ?? null;
  return {
    id: e.id, user_id: e.user_id, title: e.title, description: e.description,
    cover_url: e.cover_url, location: e.location,
    starts_at: e.starts_at.toISOString(),
    ends_at: e.ends_at?.toISOString() ?? null,
    created_at: e.created_at.toISOString(),
    user: serializeUser(e.user),
    my_rsvp: myRsvp,
    _count: e._count,
  };
}

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  const meId = me?.id ?? -1;
  const events = await prisma.event.findMany({
    include: { user: true, rsvps: true, _count: { select: { rsvps: true } } },
    orderBy: { starts_at: 'asc' },
    take: 30,
  });
  return NextResponse.json(events.map(e => serEvent(e, meId)));
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rl = checkRateLimit(`event-create:${ip}`, 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  const data = parsed.data;
  const event = await prisma.event.create({
    data: {
      user_id: me.id, title: data.title, description: data.description,
      cover_url: data.cover_url, location: data.location,
      starts_at: new Date(data.starts_at),
      ends_at: data.ends_at ? new Date(data.ends_at) : null,
    },
    include: { user: true, rsvps: true, _count: { select: { rsvps: true } } },
  });
  return NextResponse.json(serEvent(event, me.id), { status: 201 });
}
