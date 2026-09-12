<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/stores/notifications';

const router = useRouter();
const notificationStore = useNotificationStore();

onMounted(() => {
  notificationStore.fetchNotifications();
});

function handleNotificationClick(notification: { id: number; ticket_id: number | null }) {
  notificationStore.markAsRead(notification.id);
  if (notification.ticket_id) {
    router.push(`/tickets/${notification.ticket_id}`);
  }
}

function handleMarkAllAsRead() {
  notificationStore.markAllAsRead();
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'همین الان';
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  if (hours < 24) return `${hours} ساعت پیش`;
  return `${days} روز پیش`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">اعلان‌ها</h1>
        <p class="text-sm text-gray-500 mt-1 dark:text-gray-400">
          {{ notificationStore.unreadCount }} اعلان خوانده‌نشده
        </p>
      </div>
      <button
        v-if="notificationStore.hasUnread"
        @click="handleMarkAllAsRead"
        class="btn-secondary text-sm"
      >
        خواندن همه
      </button>
    </div>

    <!-- Loading -->
    <div v-if="notificationStore.loading" class="text-center py-12">
      <svg class="animate-spin h-8 w-8 mx-auto text-primary-600" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">در حال بارگذاری...</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="notificationStore.notifications.length === 0" class="text-center py-12">
      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">اعلانی وجود ندارد</p>
    </div>

    <!-- Notification List -->
    <div v-else class="space-y-2">
      <div
        v-for="notification in notificationStore.notifications"
        :key="notification.id"
        @click="handleNotificationClick(notification)"
        class="card cursor-pointer hover:shadow-md transition-shadow"
        :class="{ 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/30': !notification.is_read }"
      >
        <div class="flex items-start justify-between">
          <div class="flex items-start gap-3">
            <div
              v-if="!notification.is_read"
              class="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"
            ></div>
            <div>
              <p class="text-sm text-gray-700 dark:text-gray-200">{{ notification.message }}</p>
              <div class="flex items-center gap-2 mt-2">
                <span class="text-xs text-gray-400 dark:text-gray-500">{{ formatDate(notification.created_at) }}</span>
                <span v-if="notification.ticket_id" class="text-xs text-primary-600">
                  تیکت #{{ notification.ticket_id }}
                </span>
              </div>
            </div>
          </div>
          <button
            v-if="!notification.is_read"
            @click.stop="notificationStore.markAsRead(notification.id)"
            class="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            خواندن
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
