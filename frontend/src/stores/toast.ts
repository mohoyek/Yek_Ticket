import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

let nextId = 1;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([]);

  function show(type: Toast['type'], message: string, duration = 3000) {
    const id = nextId++;
    toasts.value.push({ id, type, message });
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  function success(message: string, duration = 3000) {
    return show('success', message, duration);
  }

  function error(message: string, duration = 3000) {
    return show('error', message, duration);
  }

  function info(message: string, duration = 3000) {
    return show('info', message, duration);
  }

  return { toasts, show, remove, success, error, info };
});