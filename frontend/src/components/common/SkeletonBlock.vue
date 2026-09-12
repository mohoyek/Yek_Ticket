<script setup lang="ts">
defineProps<{
  /** Tailwind size classes for the block, e.g. "w-11 h-11 rounded-xl" */
  skeletonClass?: string;
}>();
</script>

<template>
  <div class="animate-pulse bg-gray-200 dark:bg-gray-700" :class="skeletonClass"></div>
</template>
