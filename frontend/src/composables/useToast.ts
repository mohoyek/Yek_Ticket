import { useToastStore } from '@/stores/toast';

export function useToast() {
  const store = useToastStore();

  return {
    show: store.show,
    success: store.success,
    error: store.error,
    info: store.info,
    remove: store.remove,
  };
}