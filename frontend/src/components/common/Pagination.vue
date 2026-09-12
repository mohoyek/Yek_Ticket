<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  currentPage: number;
  totalPages: number;
  total: number;
}>();

const emit = defineEmits<{
  (e: 'page', page: number): void;
}>();

const pages = computed(() => {
  const result: (number | string)[] = [];
  const total = props.totalPages;
  const current = props.currentPage;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) result.push(i);
  } else {
    result.push(1);
    if (current > 3) result.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) result.push(i);
    if (current < total - 2) result.push('...');
    result.push(total);
  }

  return result;
});
</script>

<template>
  <div class="flex items-center justify-between">
    <p class="text-sm text-gray-600 dark:text-gray-400">
      {{ total }} نتیجه
    </p>
    <div class="flex items-center gap-1">
      <button
        @click="emit('page', currentPage - 1)"
        :disabled="currentPage <= 1"
        class="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        قبلی
      </button>

      <template v-for="(page, index) in pages" :key="index">
        <span v-if="page === '...'" class="px-2 py-1 text-sm text-gray-400 dark:text-gray-500">...</span>
        <button
          v-else
          @click="emit('page', page as number)"
          class="px-3 py-1 text-sm rounded-lg border transition-colors"
          :class="
            page === currentPage
              ? 'bg-primary-600 text-white border-primary-600'
              : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
          "
        >
          {{ page }}
        </button>
      </template>

      <button
        @click="emit('page', currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="px-3 py-1 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        بعدی
      </button>
    </div>
  </div>
</template>
