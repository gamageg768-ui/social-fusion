import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializeUser } from '@/lib/utils';
import { SendMessageSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  const rl = checkRateLimit(`msg-send:${ip}`, 30, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } });

  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  const parsed = SendMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
  const { receiver_id, content, message_type, image_url, reply_to_id, is_forwarded, scheduled_at } = parsed.data;

  const scheduledDate = scheduled_at ? new Date(scheduled_at) : null;
  const isScheduled = scheduledDate && scheduledDate > new Date();

  const msg = await prisma.message.create({
    data: {
      sender_id: me.id,
      receiver_id,
      content,
      message_type,
      image_url,
      reply_to_id: reply_to_id ?? null,
      is_forwarded,
      is_read: false,
      scheduled_at: isScheduled ? scheduledDate : null,
    },
    include: {
      sender: true,
      reactions: true,
      reply_to: { include: { sender: true } },
    },
  });

  const serialize = (m: typeof msg) => ({
    ...m,
    is_forwarded: m.is_forwarded,
    delivered_at: m.delivered_at?.toISOString() ?? null,
    scheduled_at: m.scheduled_at?.toISOString() ?? null,
    edited_at: m.edited_at?.toISOString() ?? null,
    created_at: m.created_at.toISOString(),
    sender: serializeUser(m.sender),
    reply_to: m.reply_to ? {
      ...m.reply_to,
      created_at: m.reply_to.created_at.toISOString(),
      delivered_at: m.reply_to.delivered_at?.toISOString() ?? null,
      sender: serializeUser(m.reply_to.sender),
    } : null,
  });

  return NextResponse.json(serialize(msg), { status: 201 });
}
