import { NextRequest } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return new Response('Unauthorized', { status: 401 });

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (!closed) {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch {}
        }
      };

      const latest = await prisma.notification.findFirst({
        where: { user_id: me.id },
        orderBy: { id: 'desc' },
      });
      let lastId = latest?.id ?? 0;

      const unread = await prisma.notification.count({ where: { user_id: me.id, is_read: false } });
      send({ type: 'init', unread });

      const poll = async () => {
        if (closed) return;
        try {
          const notifs = await prisma.notification.findMany({
            where: { user_id: me.id, id: { gt: lastId } },
            include: { actor: true },
            orderBy: { created_at: 'desc' },
            take: 10,
          });
          if (notifs.length > 0) {
            lastId = Math.max(...notifs.map(n => n.id));
            send({
              type: 'new',
              notifications: notifs.map(n => ({
                ...n,
                created_at: n.created_at.toISOString(),
                actor: { ...n.actor, created_at: n.actor.created_at.toISOString() },
              })),
            });
          }
        } catch {}
      };

      const interval = setInterval(poll, 5000);
      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
