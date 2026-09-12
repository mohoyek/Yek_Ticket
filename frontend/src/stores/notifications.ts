import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '@/api/client';
import type { Notification } from '@/api/client';
import { useBrowserNotifications } from '@/composables/useBrowserNotifications';

export const useNotificationStore = defineStore('notifications', () => {
  const notifications = ref<Notification[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const hasUnread = computed(() => unreadCount.value > 0);

  async function fetchNotifications(page = 1, limit = 20) {
    loading.value = true;
    try {
      const response = await api.get('/notifications', {
        params: { page, limit },
      });
      notifications.value = response.data.data;
      unreadCount.value = response.data.unreadCount;
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount() {
    try {
      const response = await api.get('/notifications/unread-count');
      const next = response.data.data.count;
      const previous = unreadCount.value;
      unreadCount.value = next;

      // Fire native browser notifications when new unread items arrive
      if (next > previous && previous >= 0) {
        const browserNotifications = useBrowserNotifications();
        browserNotifications.showForNew(next, previous);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }

  async function markAsRead(id: number) {
    try {
      await api.put(`/notifications/${id}/read`);
      const notification = notifications.value.find((n) => n.id === id);
      if (notification && !notification.is_read) {
        notification.is_read = 1;
        unreadCount.value = Math.max(0, unreadCount.value - 1);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      await api.put('/notifications/read-all');
      notifications.value.forEach((n) => (n.is_read = 1));
      unreadCount.value = 0;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }

  function startPolling(intervalMs = 30000) {
    stopPolling();
    fetchUnreadCount();
    pollInterval = setInterval(fetchUnreadCount, intervalMs);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    hasUnread,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    startPolling,
    stopPolling,
  };
});
