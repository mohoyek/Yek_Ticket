import type { Env, PushSubscription } from '../env';
import { sendWebPush } from '../utils/webpush';

/**
 * Web Push service — stores subscriptions and sends push messages
 * via the Web Push protocol (RFC 8291) using VAPID (RFC 8292).
 * Implemented with WebCrypto only — fully Workers-native.
 */
export class PushService {
  private configured: boolean;

  constructor(
    private db: D1Database,
    private env: Env
  ) {
    this.configured = !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getPublicKey(): string | null {
    return this.configured ? this.env.VAPID_PUBLIC_KEY! : null;
  }

  /** Save or refresh a subscription for the user. */
  async save(
    userId: number,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent: string | null
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET
           user_id = excluded.user_id,
           p256dh = excluded.p256dh,
           auth = excluded.auth,
           user_agent = excluded.user_agent`
      )
      .bind(userId, endpoint, p256dh, auth, userAgent)
      .run();
  }

  /** Remove a subscription (e.g. user unsubscribes or browser cleaned up). */
  async remove(userId: number, endpoint: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
      .bind(userId, endpoint)
      .run();
  }

  /** List a user's subscriptions. */
  async listForUser(userId: number): Promise<PushSubscription[]> {
    const result = await this.db
      .prepare('SELECT * FROM push_subscriptions WHERE user_id = ?')
      .bind(userId)
      .all<PushSubscription>();
    return result.results;
  }

  /**
   * Send a push notification to all of a user's subscribed devices.
   * Stale endpoints (410 Gone) are deleted automatically.
   */
  async sendToUser(
    userId: number,
    payload: { title: string; body: string; ticketId?: number | null }
  ): Promise<void> {
    if (!this.configured) return;

    const subs = await this.listForUser(userId);
    if (subs.length === 0) return;

    const data = JSON.stringify({
      title: payload.title,
      body: payload.body,
      ticketId: payload.ticketId ?? null,
    });

    const stale: string[] = [];

    await Promise.all(
      subs.map(async (sub) => {
        try {
          const status = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            {
              subject: this.env.VAPID_SUBJECT || 'mailto:support@freebuff.example',
              publicKey: this.env.VAPID_PUBLIC_KEY!,
              privateKey: this.env.VAPID_PRIVATE_KEY!,
            }
          );
          if (status === 404 || status === 410) {
            stale.push(sub.endpoint);
          } else if (status >= 400) {
            console.error('Push send failed with status:', status);
          }
        } catch (err: unknown) {
          const e = err as { message?: string };
          console.error('Push send failed:', e.message || e);
        }
      })
    );

    if (stale.length > 0) {
      const del = this.db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
      await this.db.batch(stale.map((endpoint) => del.bind(endpoint)));
    }
  }
}
