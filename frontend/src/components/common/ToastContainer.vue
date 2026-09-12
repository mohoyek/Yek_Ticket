<script setup lang="ts">
import { useToastStore } from '@/stores/toast';

const toastStore = useToastStore();

const styles = {
  success: {
    container: 'bg-green-50 border-green-200 dark:bg-green-900/40 dark:border-green-800',
    icon: 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200',
    text: 'text-green-800 dark:text-green-200',
    path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  error: {
    container: 'bg-red-50 border-red-200 dark:bg-red-900/40 dark:border-red-800',
    icon: 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200',
    text: 'text-red-800 dark:text-red-200',
    path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/40 dark:border-blue-800',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200',
    text: 'text-blue-800 dark:text-blue-200',
    path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};
</script>

<template>
  <div
    class="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 space-y-2 pointer-events-none"
  >
    <transition-group name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg"
        :class="styles[toast.type].container"
      >
        <div
          class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          :class="styles[toast.type].icon"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="styles[toast.type].path"
            />
          </svg>
        </div>
        <p class="flex-1 text-sm font-medium leading-relaxed" :class="styles[toast.type].text">
          {{ toast.message }}
        </p>
        <button
          @click="toastStore.remove(toast.id)"
          class="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="بستن"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>