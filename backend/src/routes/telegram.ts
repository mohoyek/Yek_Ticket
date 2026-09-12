import { Hono } from 'hono';
import type { Env } from '../env';
import { TelegramService } from '../services/telegram.service';

const telegram = new Hono<{ Bindings: Env }>();

// POST /api/telegram/webhook - وب‌هوک تلگرام (بدون JWT)
telegram.post('/webhook', async (c) => {
  // Verify webhook secret
  const secretToken = c.req.header('X-Telegram-Bot-Api-Secret-Token');
  if (c.env.TELEGRAM_WEBHOOK_SECRET && secretToken !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const botToken = c.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return c.json({ error: 'Telegram bot not configured' }, 500);
  }

  const update = await c.req.json();
  const telegramService = new TelegramService(botToken, c.env.DB);

  try {
    await telegramService.handleWebhook(update);
    return c.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return c.json({ ok: true }); // Return 200 to Telegram even on error
  }
});

export default telegram;
