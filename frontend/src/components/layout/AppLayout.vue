<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { RouterView } from 'vue-router';
import { useNotificationStore } from '@/stores/notifications';
import { useAuthStore } from '@/stores/auth';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';

const notificationStore = useNotificationStore();
const authStore = useAuthStore();

const sidebarOpen = ref(false);

function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function closeSidebar() {
  sidebarOpen.value = false;
}

onMounted(() => {
  // دسترسی‌ها را از سرور تازه می‌کند تا تغییرات نقش‌ها بدون ورود دوباره اعمال شود
  authStore.fetchMe();
  notificationStore.startPolling(30000);
});

onUnmounted(() => {
  notificationStore.stopPolling();
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <AppHeader @toggle-sidebar="toggleSidebar" />
    <div class="flex">
      <AppSidebar :open="sidebarOpen" @close="closeSidebar" />
      <main class="flex-1 min-w-0 pt-16 p-4 sm:pt-16 sm:p-6 md:pt-16 md:mr-64">
        <RouterView />
      </main>
    </div>
  </div>
</template>