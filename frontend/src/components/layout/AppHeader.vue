<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import { useThemeStore } from '@/stores/theme';
import { useBrowserNotifications } from '@/composables/useBrowserNotifications';
import { useToast } from '@/composables/useToast';
import NotificationBell from '@/components/common/NotificationBell.vue';

const router = useRouter();
const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const themeStore = useThemeStore();
const browserNotifications = useBrowserNotifications();

const browserNotifEnabled = ref(false);

onMounted(() => {
  browserNotifEnabled.value =
    browserNotifications.isEnabled() || browserNotifications.isWebPushEnabled();

  // Handle clicks on push notifications when the app window is already open
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'open-ticket' && event.data.ticketId) {
        router.push(`/tickets/${event.data.ticketId}`);
      }
    });
  }
});

async function toggleBrowserNotifications() {
  if (browserNotifEnabled.value) {
    await browserNotifications.disableWebPush();
    browserNotifications.disable();
    browserNotifEnabled.value = false;
    toast.info('اعلان‌های مرورگر غیرفعال شد');
  } else {
    // Full Web Push: permission + service worker + server subscription
    const granted = await browserNotifications.enableWebPush();
    if (granted) {
      browserNotifEnabled.value = true;
      toast.success('اعلان‌های مرورگر فعال شد (حتی با بسته بودن تب)');
    } else {
      // Fallback: at least enable in-tab native notifications
      const basic = await browserNotifications.requestPermission();
      browserNotifEnabled.value = basic;
      toast[basic ? 'info' : 'error'](
        basic
          ? 'فقط اعلان‌های درون‌برنامه‌ای فعال شد (اشتراک فوری ممکن نشد)'
          : 'اجازه اعلان در مرورگر داده نشد'
      );
    }
  }
}

const showUserMenu = ref(false);

const toast = useToast();

const emit = defineEmits<{ (e: 'toggle-sidebar'): void }>();

function handleLogout() {
  authStore.logout();
  notificationStore.stopPolling();
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
}

function goToProfile() {
  showUserMenu.value = false;
  router.push('/profile');
}
</script>

<template>
  <header class="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 dark:bg-gray-800 dark:border-gray-700">
    <div class="flex items-center justify-between h-full px-4 sm:px-6">
      <!-- Logo and Title -->
      <div class="flex items-center gap-2">
        <!-- Mobile hamburger -->
        <button
          @click="emit('toggle-sidebar')"
          class="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="منوی اصلی"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <router-link to="/" class="flex items-center gap-3">
          <div class="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <span class="text-lg font-bold text-gray-900 dark:text-gray-100">فریباف</span>
        </router-link>
      </div>

      <!-- Left side: Theme + Notifications + User Menu -->
      <div class="flex items-center gap-4">
        <!-- Theme toggle -->
        <button
          @click="themeStore.toggle()"
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
          :title="themeStore.isDark ? 'حالت روشن' : 'حالت شب'"
          :aria-label="themeStore.isDark ? 'حالت روشن' : 'حالت شب'"
        >
          <svg
            v-if="!themeStore.isDark"
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
          <svg
            v-else
            class="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </button>

        <!-- Browser notifications toggle -->
        <button
          @click="toggleBrowserNotifications"
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-700"
          :title="browserNotifEnabled ? 'اعلان‌های مرورگر فعال است' : 'فعال‌سازی اعلان‌های مرورگر'"
          :aria-label="browserNotifEnabled ? 'اعلان‌های مرورگر فعال است' : 'فعال‌سازی اعلان‌های مرورگر'"
        >
          <!-- Bell with slash when off -->
          <svg v-if="!browserNotifEnabled" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
          </svg>
          <!-- Solid bell when on -->
          <svg v-else class="w-6 h-6 text-primary-600 dark:text-primary-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        <!-- Notification Bell -->
        <NotificationBell />

        <!-- User Menu -->
        <div class="relative">
          <button
            @click="toggleUserMenu"
            class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center dark:bg-primary-900/60">
              <span class="text-sm font-medium text-primary-700 dark:text-primary-300">
                {{ authStore.user?.full_name?.charAt(0) || 'ک' }}
              </span>
            </div>
            <span class="hidden sm:inline">{{ authStore.user?.full_name }}</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="showUserMenu"
            class="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 dark:bg-gray-800 dark:border-gray-700"
          >
            <div class="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ authStore.user?.full_name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ authStore.user?.username }}</p>
              <span class="inline-block mt-1 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full dark:bg-primary-900/60 dark:text-primary-300">
                {{ authStore.user?.role_label || (authStore.user?.role === 'admin' ? 'مدیر سیستم' : authStore.user?.role === 'manager' ? 'مدیر' : authStore.user?.role === 'support' ? 'پشتیبان' : 'مشتری') }}
              </span>
            </div>
            <button
              @click="goToProfile"
              class="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              پروفایل
            </button>
            <button
              @click="handleLogout"
              class="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors dark:hover:bg-red-900/30"
            >
              خروج
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Overlay to close menu -->
  <div
    v-if="showUserMenu"
    @click="showUserMenu = false"
    class="fixed inset-0 z-40"
  ></div>
</template>