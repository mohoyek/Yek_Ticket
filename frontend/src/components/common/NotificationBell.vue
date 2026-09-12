<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/stores/notifications';

const router = useRouter();
const notificationStore = useNotificationStore();
const showDropdown = ref(false);

function toggleDropdown() {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value) {
    notificationStore.fetchNotifications(1, 10);
  }
}

function handleNotificationClick(notification: { id: number; ticket_id: number | null }) {
  notificationStore.markAsRead(notification.id);
  showDropdown.value = false;
  if (notification.ticket_id) {
    router.push(`/tickets/${notification.ticket_id}`);
  }
}

function goToNotificationsPage() {
  showDropdown.value = false;
  router.push('/notifications');
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
</script>

<template>
  <div class="relative">
    <button
      @click="toggleDropdown"
      class="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <!-- Unread badge -->
      <span
        v-if="notificationStore.hasUnread"
        class="absolute -top-0.5 -left-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
      >
        {{ notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount }}
      </span>
    </button>

    <!-- Dropdown -->
    <div
      v-if="showDropdown"
      class="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 dark:bg-gray-800 dark:border-gray-700"
    >
      <div class="p-3 border-b border-gray-200 flex items-center justify-between dark:border-gray-700">
        <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">اعلان‌ها</h3>
        <button
          v-if="notificationStore.hasUnread"
          @click="notificationStore.markAllAsRead()"
          class="text-xs text-primary-600 hover:text-primary-700"
        >
          خواندن همه
        </button>
      </div>

      <div class="max-h-80 overflow-y-auto">
        <div v-if="notificationStore.loading" class="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
          در حال بارگذاری...
        </div>

        <div
          v-else-if="notificationStore.notifications.length === 0"
          class="p-4 text-center text-sm text-gray-500 dark:text-gray-400"
        >
          اعلانی وجود ندارد
        </div>

        <div
          v-for="notification in notificationStore.notifications.slice(0, 10)"
          :key="notification.id"
          @click="handleNotificationClick(notification)"
          class="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors dark:border-gray-700 dark:hover:bg-gray-700/50"
          :class="{ 'bg-primary-50 dark:bg-primary-900/30': !notification.is_read }"
        >
          <p class="text-sm text-gray-700 dark:text-gray-200">{{ notification.message }}</p>
          <p class="text-xs text-gray-400 mt-1 dark:text-gray-500">{{ formatTime(notification.created_at) }}</p>
        </div>
      </div>

      <div class="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="goToNotificationsPage"
          class="w-full text-center text-sm text-primary-600 hover:text-primary-700 py-1"
        >
          مشاهده همه اعلان‌ها
        </button>
      </div>
    </div>
  </div>

  <!-- Overlay -->
  <div
    v-if="showDropdown"
    @click="showDropdown = false"
    class="fixed inset-0 z-40"
  ></div>
</template>
