import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(document.documentElement.classList.contains('dark'));

  function apply(force?: boolean) {
    const dark = force !== undefined ? force : !isDark.value;
    isDark.value = dark;
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }

  function toggle() {
    apply(!isDark.value);
  }

  return { isDark, toggle, apply };
});