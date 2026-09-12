<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useRole } from '@/composables/useRole';

defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const route = useRoute();
const authStore = useAuthStore();
const role = useRole();

const menuItems = computed(() => {
  const items = [
    {
      label: 'داشبورد',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      to: '/',
      show: true,
    },
    {
      label: 'تیکت جدید',
      icon: 'M12 4v16m8-8H4',
      to: '/tickets/create',
      show: true,
    },
    {
      label: 'اعلان‌ها',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      to: '/notifications',
      show: true,
    },
    {
      label: 'پروفایل',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      to: '/profile',
      show: true,
    },
  ];

  if (role.canViewKb()) {
    items.push({
      label: 'پایگاه دانش',
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      to: '/knowledge',
      show: true,
    });
  }

  if (role.canManageTodos()) {
    items.push({
      label: 'کارهای روزانه من',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      to: '/todos',
      show: true,
    });
  }

  if (role.canManageUsers()) {
    items.push({
      label: 'مدیریت کاربران',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      to: '/admin/users',
      show: true,
    });
  }
  if (role.canManageCategories()) {
    items.push({
      label: 'مدیریت دسته‌بندی‌ها',
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      to: '/admin/categories',
      show: true,
    });
  }
  if (role.canManageRoles()) {
    items.push({
      label: 'نقش‌ها و دسترسی‌ها',
      icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
      to: '/admin/roles',
      show: true,
    });
  }

  return items;
});
</script>

<template>
  <!-- Mobile overlay -->
  <div
    v-if="open"
    @click="emit('close')"
    class="fixed inset-0 bg-black/30 z-30 md:hidden"
  ></div>

  <aside
    class="fixed right-0 top-16 bottom-0 w-64 bg-white border-l border-gray-200 overflow-y-auto z-40
           transform transition-transform duration-200 ease-in-out
           md:translate-x-0 dark:bg-gray-800 dark:border-gray-700"
    :class="open ? 'translate-x-0' : 'translate-x-full'"
  >
    <nav class="p-4">
      <ul class="space-y-1">
        <li v-for="item in menuItems" :key="item.to">
          <router-link
            :to="item.to"
            @click="emit('close')"
            class="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors"
            :class="
              route.path === item.to
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
            "
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                :d="item.icon"
              />
            </svg>
            {{ item.label }}
          </router-link>
        </li>
      </ul>
    </nav>
  </aside>
</template>