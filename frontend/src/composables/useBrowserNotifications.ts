import { ref } from 'vue';
import api from '@/api/client';
import { useNotificationStore } from '@/stores/notifications';

const permission = ref<NotificationPermission | 'unsupported'>(
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
);

const STORE_KEY = 'browser-notifications-enabled';
const PUSH_STORE_KEY = 'web-push-enabled';

function isUserEnabled(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) === '1';
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    // public/sw.js is copied to the site root by Vite
    return await navigator.serviceWorker.register('/sw.js');
  } catch (e) {
    console.error('Service worker registration failed:', e);
    return null;
  }
}

export function useBrowserNotifications() {
  const notificationStore = useNotificationStore();

  /** In-tab native notifications (permission only, no server push). */
  async function requestPermission(): Promise<boolean> {
    if (typeof Notification === 'undefined') return false;
    try {
      const result = await Notification.requestPermission();
      permission.value = result;
      if (result === 'granted') {
        localStorage.setItem(STORE_KEY, '1');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  function disable() {
    localStorage.removeItem(STORE_KEY);
  }

  function isEnabled(): boolean {
    return permission.value === 'granted' && isUserEnabled();
  }

  /** Show a native notification when the unread count grows (in-tab path). */
  function showForNew(unreadCount: number, previousCount: number) {
    if (!isEnabled()) return;
    if (unreadCount <= previousCount) return;

    const fresh = notificationStore.notifications
      .filter((n) => !n.is_read)
      .slice(0, 3);

    const items = fresh.length > 0 ? fresh : null;
    if (items) {
      for (const n of items) {
        try {
          const notif = new Notification('فریباف — اعلان جدید', {
            body: n.message,
            icon: '/favicon.svg',
            tag: `ticket-${n.id}`,
            dir: 'rtl',
            lang: 'fa',
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch {
          void 0;
        }
      }
    } else {
      try {
        const notif = new Notification('فریباف — اعلان جدید', {
          body: `${unreadCount - previousCount} اعلان خوانده‌نشده جدید دارید`,
          icon: '/favicon.svg',
          tag: 'unread-summary',
          dir: 'rtl',
          lang: 'fa',
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch {
        void 0;
      }
    }
  }

  /**
   * Full Web Push: register the service worker, ask the server for the VAPID
   * public key, subscribe with the push manager, and store the subscription
   * on the backend. Delivers notifications even when the tab is closed.
   */
  async function enableWebPush(): Promise<boolean> {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const reg = await registerServiceWorker();
    if (!reg) return false;

    const granted = await requestPermission();
    if (!granted) return false;

    try {
      // Get the server's VAPID public key
      const { data: pkData } = await api.get('/push/public-key');
      const publicKey: string = pkData.data.publicKey;

      // Subscribe this browser
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Persist the subscription on the backend
      const json = subscription.toJSON();
      await api.post('/push/subscribe', {
        endpoint: json.endpoint,
        keys: json.keys,
      });

      localStorage.setItem(PUSH_STORE_KEY, '1');
      return true;
    } catch (e) {
      console.error('Web Push subscription failed:', e);
      return false;
    }
  }

  /** Unsubscribe this browser from server push. */
  async function disableWebPush(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          const json = sub.toJSON();
          await api
            .post('/push/unsubscribe', { endpoint: json.endpoint })
            .catch(() => undefined);
          await sub.unsubscribe();
        }
      }
    } catch (e) {
      console.error('Web Push unsubscribe failed:', e);
    } finally {
      localStorage.removeItem(PUSH_STORE_KEY);
    }
  }

  function isWebPushEnabled(): boolean {
    try {
      return localStorage.getItem(PUSH_STORE_KEY) === '1';
    } catch {
      return false;
    }
  }

  return {
    permission,
    requestPermission,
    disable,
    isEnabled,
    showForNew,
    enableWebPush,
    disableWebPush,
    isWebPushEnabled,
  };
}
