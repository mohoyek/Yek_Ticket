import { Hono } from 'hono';
import type { Env, AppVariables } from '../env';
import { authMiddleware } from '../middleware/auth';
import { PushService } from '../services/push.service';
import { z } from 'zod';
import { errorResponse } from '../utils/response';

const pushRoutes = new Hono<{ Bindings: Env; Variables: AppVariables }>();

pushRoutes.use('*', authMiddleware);

const subscribeSchema = z.object({
  endpoint: z.string().url('آدرس اشتراک نامعتبر است'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

// Get VAPID public key (needed before subscribing)
pushRoutes.get('/public-key', (c) => {
  const pushService = new PushService(c.env.DB, c.env);
  if (!pushService.isConfigured()) {
    return c.json({ error: 'سرویس اعلان فوری پیکربندی نشده است' }, 503);
  }
  return c.json({ data: { publicKey: pushService.getPublicKey() } });
});

// Subscribe
pushRoutes.post('/subscribe', async (c) => {
  const userId = c.get('user').sub;
  const pushService = new PushService(c.env.DB, c.env);

  if (!pushService.isConfigured()) {
    return c.json({ error: 'سرویس اعلان فوری پیکربندی نشده است' }, 503);
  }

  const parsed = subscribeSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return errorResponse(c, parsed.error.errors[0]?.message || 'داده نامعتبر است', 400);
  }

  const userAgent = c.req.header('User-Agent') || null;
  await pushService.save(
    userId,
    parsed.data.endpoint,
    parsed.data.keys.p256dh,
    parsed.data.keys.auth,
    userAgent
  );

  return c.json({ message: 'اشتراک اعلان فوری ثبت شد' });
});

// Test push delivery (awaits synchronously — for debugging)
pushRoutes.post('/test', async (c) => {
  const userId = c.get('user').sub;
  const pushService = new PushService(c.env.DB, c.env);
  if (!pushService.isConfigured()) {
    return c.json({ error: 'سرویس اعلان فوری پیکربندی نشده است' }, 503);
  }
  try {
    await pushService.sendToUser(userId, {
      title: 'فریباف — تست اعلان',
      body: 'این یک اعلان آزمایشی است',
      ticketId: null,
    });
    return c.json({ message: 'ارسال تست انجام شد' });
  } catch (err: unknown) {
    const e = err as Error;
    return c.json({ error: 'خطا در ارسال: ' + (e.message || 'نامشخص') }, 500);
  }
});

// Unsubscribe
pushRoutes.post('/unsubscribe', async (c) => {
  const userId = c.get('user').sub;
  const body = await c.req.json().catch(() => ({}));
  const endpoint = (body as { endpoint?: string }).endpoint;

  if (!endpoint) {
    return c.json({ error: 'آدرس اشتراک الزامی است' }, 400);
  }

  const pushService = new PushService(c.env.DB, c.env);
  await pushService.remove(userId, endpoint);

  return c.json({ message: 'اشتراک اعلان فوری لغو شد' });
});

export { pushRoutes };
