import webPush from 'web-push';
import type { PushSubscription } from '../env.node.js';

/**
 * Web Push service for Node.js using web-push library
 */
export class PushService {
  private configured: boolean;
  
  constructor(
    private db: any,
    private vapidPublicKey?: string,
    private vapidPrivateKey?: string,
    private vapidSubject?: string
  ) {
    this.configured = !!(vapidPublicKey && vapidPrivateKey);
    
    if (this.configured) {
      webPush.setVapidDetails(
        vapidSubject || 'mailto:support@freebuff.example',
        vapidPublicKey,
        vapidPrivateKey
      );
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  getPublicKey(): string | null {
    return this.configured ? this.vapidPublicKey! : null;
  }

  /** Save or refresh a subscription for the user. */
  async save(
    userId: number,
    endpoint: string,
    p256dh: string,
    auth: string,
    userAgent: string | null
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent
    `);
    stmt.run(userId, endpoint, p256dh, auth, userAgent);
  }

  /** Remove a subscription */
  async remove(userId: number, endpoint: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?');
    stmt.run(userId, endpoint);
  }

  /** List a user's subscriptions. */
  async listForUser(userId: number): Promise<PushSubscription[]> {
    const stmt = this.db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?');
    return stmt.all(userId) as PushSubscription[];
  }

  /**
   * Send a push notification to all of a user's subscribed devices.
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
          const result = await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            data
          );
          
          if (result.statusCode === 404 || result.statusCode === 410) {
            stale.push(sub.endpoint);
          } else if (result.statusCode >= 400) {
            console.error('Push send failed with status:', result.statusCode);
          }
        } catch (err: unknown) {
          const e = err as { statusCode?: number; message?: string };
          if (e.statusCode === 404 || e.statusCode === 410) {
            stale.push(sub.endpoint);
          } else {
            console.error('Push send failed:', e.message || e);
          }
        }
      })
    );

    if (stale.length > 0) {
      const del = this.db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?');
      for (const endpoint of stale) {
        del.run(endpoint);
      }
    }
  }
}
