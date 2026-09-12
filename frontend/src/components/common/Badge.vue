<script setup lang="ts">
defineProps<{
  type: 'status' | 'priority';
  value: string;
}>();

const statusLabels: Record<string, string> = {
  open: 'باز',
  in_progress: 'در حال بررسی',
  closed: 'بسته‌شده',
  waiting_customer: 'در انتظار مشتری',
};

const priorityLabels: Record<string, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  urgent: 'فوری',
};

function getLabel(type: string, value: string): string {
  if (type === 'status') return statusLabels[value] || value;
  if (type === 'priority') return priorityLabels[value] || value;
  return value;
}

function getClass(type: string, value: string): string {
  return `badge-${value}`;
}
</script>

<template>
  <span :class="getClass(type, value)">
    {{ getLabel(type, value) }}
  </span>
</template>
